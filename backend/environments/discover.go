package environments

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"time"

	"Cokpyt/backend/platform"
)

// Result is a full inventory of the machine.
type Result struct {
	Envs  []Env    `json:"envs"`
	Notes []string `json:"notes"`
}

// Progress, when set, receives a short line as the sweep moves between roots.
// Walking a profile takes seconds, and a silent seconds-long wait reads as a
// hang.
var Progress func(msg string)

// The sweep is unbounded in depth on purpose — a venv five levels down is
// normal, and a depth cap is how you get a false negative that looks like a
// clean result. It is bounded in work instead, so a pathological profile can
// never wedge the app. Truncated says when a bound was hit.
const (
	scanBudget = 25 * time.Second
	dirBudget  = 300_000
)

// Discover inventories every Python environment it can find, then fills in the
// versions. It never returns an error: an interpreter that cannot be run is
// still a fact about the machine, and reporting "unknown" beats reporting
// nothing.
func Discover() Result {
	start := time.Now()
	d := &discoverer{seen: map[string]bool{}, deadline: start.Add(scanBudget)}

	d.fromLauncher()
	d.fromManagedStore()
	d.fromInstallLocations()
	d.sweep()
	d.probeVersions()
	d.sort()
	d.noteStoreStub()

	return Result{Envs: d.envs, Notes: d.notes}
}

// ScanFolder inventories one directory the user pointed at. The profile sweep
// only covers the home directory, and projects on another drive are exactly
// where a venv is most likely to be hiding.
func ScanFolder(dir string) []Env {
	d := &discoverer{seen: map[string]bool{}, deadline: time.Now().Add(20 * time.Second)}
	d.walk(dir, 0, 0)
	d.probeVersions()
	d.sort()
	return d.envs
}

type discoverer struct {
	envs      []Env
	seen      map[string]bool
	notes     []string
	scanned   int
	truncated bool
	deadline  time.Time
}

func (d *discoverer) progress(msg string) {
	if Progress != nil {
		Progress(msg)
	}
}

func (d *discoverer) done() bool {
	if d.truncated {
		return true
	}
	if time.Now().After(d.deadline) || d.scanned > dirBudget {
		d.truncated = true
		return true
	}
	return false
}

// add records an interpreter once. Sources run most-authoritative first, so the
// first description of an interpreter is the one that is kept: a runtime listed
// by the launcher is a launcher runtime even though the install-location globs
// also match it.
func (d *discoverer) add(e Env) bool {
	abs, err := filepath.Abs(e.Python)
	if err != nil {
		return false
	}
	e.Python = filepath.Clean(abs)
	key := strings.ToLower(e.Python)
	if d.seen[key] {
		return false
	}
	if fi, err := os.Stat(e.Python); err != nil || fi.IsDir() {
		return false
	}
	d.seen[key] = true
	d.envs = append(d.envs, e)
	return true
}

// ── source 1: the launcher ───────────────────────────────────────────────────
//
// `py -0p` lists every runtime the Python Install Manager created, with full
// paths and a `*` on the default. It is the only reliable source for those:
// the launcher knows exactly what it installed, and nothing else does.

var reLauncher = regexp.MustCompile(`(?m)^\s*-V:(\S+)(\s+\*)?\s+(.+?\.exe)\s*$`)

func (d *discoverer) fromLauncher() {
	if runtime.GOOS != "windows" {
		return
	}
	d.progress("Asking the py launcher")
	out, err := run(5*time.Second, "py", "-0p")
	if err != nil {
		return
	}
	for _, env := range parseLauncher(out) {
		d.add(env)
	}
}

// parseLauncher reads `py -0p` output. The shape is:
//
//	-V:3.14 *        C:\Users\me\AppData\Local\Python\pythoncore-3.14-64\python.exe
//	-V:3.12          C:\Users\me\AppData\Local\Python\pythoncore-3.12-64\python.exe
//
// The star marks the default interpreter, which is the one a new project
// would use, so it has to survive parsing.
func parseLauncher(output string) []Env {
	var envs []Env
	for _, m := range reLauncher.FindAllStringSubmatch(output, -1) {
		path := strings.TrimSpace(m[3])
		envs = append(envs, Env{
			Python:  path,
			Version: m[1],
			Kind:    KindLauncher,
			Label:   "Python " + m[1],
			Root:    filepath.Dir(path),
			Source:  "Python Install Manager (py)",
			Default: strings.TrimSpace(m[2]) != "",
		})
	}
	return envs
}

// ── source 2: the launcher's own install store ───────────────────────────────
//
// The launcher drops its runtimes under %LOCALAPPDATA%\Python. Walking that
// directory catches runtimes `py -0p` would list anyway, which matters when the
// launcher itself is broken or not on PATH.

func (d *discoverer) fromManagedStore() {
	for _, pattern := range managedGlobs() {
		for _, match := range glob(pattern) {
			_, name := Split(filepath.Dir(match))
			d.add(Env{
				Python: match,
				Kind:   KindLauncher,
				Label:  name,
				Root:   filepath.Dir(match),
				Source: "Python Install Manager store",
			})
		}
	}
}

// ── source 3: install locations the launcher does not know about ─────────────
//
// A python.org installer drops its copy wherever the user pointed it, and the
// launcher never learns about it. Without this pass such a runtime exists but
// is invisible to `py --list`.

func (d *discoverer) fromInstallLocations() {
	for _, pattern := range installGlobs() {
		for _, match := range glob(pattern) {
			_, name := Split(filepath.Dir(match))
			d.add(Env{
				Python: match,
				Kind:   KindStandalone,
				Label:  name,
				Root:   filepath.Dir(match),
				Source: "install directory (not tracked by py)",
			})
		}
	}
}

// ── source 4: the sweep ──────────────────────────────────────────────────────
//
// This is the step that changes the answer. A venv's packages are in no other
// list: not the base interpreter's, not another venv's, and `py --list` will
// not mention the venv at all. The marker is `pyvenv.cfg`, one file at the
// venv root. conda environments are the mirror case: they carry `conda-meta`
// and no pyvenv.cfg, so one walk finds both.

func (d *discoverer) sweep() {
	home, err := os.UserHomeDir()
	if err == nil {
		d.progress("Scanning " + home)
		d.walk(home, 0, 0)
	}
	// AppData is deep and wide, so it gets its own bounded pass rather than
	// being skipped outright.
	for _, key := range []string{"LOCALAPPDATA", "APPDATA"} {
		base := os.Getenv(key)
		if base == "" {
			continue
		}
		d.progress("Scanning " + base)
		d.walk(base, 0, 5)
	}
	if runtime.GOOS != "windows" {
		d.progress("Scanning /opt")
		d.walk("/opt", 0, 3)
	}
}

// walk looks for environment markers, depth-first. maxDepth 0 means unbounded.
func (d *discoverer) walk(path string, depth, maxDepth int) {
	if d.done() {
		return
	}
	if maxDepth > 0 && depth > maxDepth {
		return
	}
	d.scanned++

	if isVenvRoot(path) {
		d.addVenv(path)
		return // a venv's innards hold no other environment
	}
	if isCondaRoot(path) {
		d.addConda(path)
		return
	}

	entries, err := os.ReadDir(path)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		if skipDirs[name] {
			continue
		}
		if runtime.GOOS == "windows" && skipDirsWindows[name] {
			continue
		}
		if depth == 0 && rootSkip[name] {
			continue
		}
		d.walk(filepath.Join(path, name), depth+1, maxDepth)
	}
}

func (d *discoverer) addVenv(root string) {
	exe := venvPython(root)
	version, base := pyvenvCfg(root)
	parentDir, name := Split(root)
	_, parentName := Split(parentDir)
	label := name
	if parentName != "" {
		label = parentName + "/" + name
	}
	d.add(Env{
		Python:  exe,
		Version: version,
		Kind:    KindVenv,
		Label:   label,
		Root:    root,
		Base:    base,
		Source:  "pyvenv.cfg",
	})
}

func (d *discoverer) addConda(root string) {
	_, name := Split(root)
	d.add(Env{
		Python: venvPython(root),
		Kind:   KindConda,
		Label:  name,
		Root:   root,
		Source: "conda-meta",
	})
}

// ── version probing ──────────────────────────────────────────────────────────

// probeResult is what an interpreter says about itself.
type probeResult struct {
	Version    string `json:"v"`
	Executable string `json:"exe"`
}

const probeScript = `import json,sys;print(json.dumps({"v":"%d.%d.%d"%sys.version_info[:3],"exe":sys.executable}))`

// probeVersions asks every candidate who it really is, and folds the ones that
// turn out to be forwarding to somewhere else onto their real interpreter.
func (d *discoverer) probeVersions() {
	d.envs = collapse(d.envs, probe)
}

// collapse folds launcher shims onto the interpreter they forward to, and fills
// in versions.
//
// The Python Install Manager keeps a `bin` directory full of redirecting
// python.exe files. They answer `--version` correctly — because they exec the
// real interpreter — but they own no packages, so listing one adds a row that
// can never hold anything and duplicates a runtime that is already listed.
// Asked directly, an interpreter reports where it actually lives.
func collapse(envs []Env, ask func(string) (probeResult, bool)) []Env {
	known := make(map[string]bool, len(envs))
	for _, env := range envs {
		known[strings.ToLower(env.Python)] = true
	}

	kept := make([]Env, 0, len(envs))
	for _, env := range envs {
		result, ok := ask(env.Python)
		if !ok {
			// An interpreter that cannot be run is still a fact about the
			// machine, and a broken venv is exactly what a user needs to see.
			kept = append(kept, env)
			continue
		}

		if result.Executable != "" && !strings.EqualFold(result.Executable, env.Python) {
			if known[strings.ToLower(result.Executable)] {
				continue // the real interpreter is already in the list
			}
			env.Python = result.Executable
			env.Root = filepath.Dir(result.Executable)
			known[strings.ToLower(result.Executable)] = true
		}

		// `py -0p` reports its runtimes as "3.14", because that is the tag the
		// launcher knows them by. Asking the interpreter gives "3.14.3", which is
		// the version the user is actually running.
		if moreSpecific(result.Version, env.Version) {
			env.Version = result.Version
		}
		if env.Kind == KindLauncher {
			env.Label = "Python " + env.Version
		}
		kept = append(kept, env)
	}
	return kept
}

// moreSpecific reports whether candidate names more version components than
// current, so "3.14.3" replaces "3.14" but "3.11" does not replace "3.12.10".
func moreSpecific(candidate, current string) bool {
	if candidate == "" {
		return false
	}
	return len(strings.Split(candidate, ".")) > len(strings.Split(current, "."))
}

// probe runs an interpreter and reads its answer. A failure is not an error:
// it means this interpreter cannot be run, which is itself worth reporting.
func probe(python string) (probeResult, bool) {
	out, err := run(6*time.Second, python, "-c", probeScript)
	if err != nil {
		return probeResult{}, false
	}
	var result probeResult
	if json.Unmarshal([]byte(strings.TrimSpace(out)), &result) != nil {
		return probeResult{}, false
	}
	return result, true
}

// ── ordering and notes ───────────────────────────────────────────────────────

var kindRank = map[string]int{KindLauncher: 0, KindStandalone: 1, KindConda: 2, KindVenv: 3}

func (d *discoverer) sort() {
	sort.SliceStable(d.envs, func(i, j int) bool {
		a, b := d.envs[i], d.envs[j]
		if a.Default != b.Default {
			return a.Default
		}
		if kindRank[a.Kind] != kindRank[b.Kind] {
			return kindRank[a.Kind] < kindRank[b.Kind]
		}
		if a.Label != b.Label {
			return a.Label < b.Label
		}
		return a.Python < b.Python
	})
}

// noteStoreStub reports the Microsoft Store python.exe stub. On a machine with
// no real Python on PATH, `python` resolves to a WindowsApps shim that opens
// the Store or fails with "Python was not found". A stub on PATH says nothing
// about what is installed, so it is worth saying out loud rather than letting
// it read as "no Python here".
func (d *discoverer) noteStoreStub() {
	if runtime.GOOS != "windows" {
		return
	}
	resolved, err := exec.LookPath("python")
	if err != nil {
		return
	}
	if strings.Contains(strings.ToLower(resolved), `microsoft\windowsapps`) {
		d.notes = append(d.notes, "`python` on PATH is the Microsoft Store stub, not a real interpreter. Cokpyt used the environments above instead.")
	}
}

// ── environment layout helpers ───────────────────────────────────────────────

// venvPython is the interpreter *inside* a venv. It is a copy of the base
// interpreter, but it looks at the venv's own site-packages, which is why a
// base interpreter's pip cannot be pointed at a venv with a flag.
func venvPython(root string) string {
	if runtime.GOOS == "windows" {
		return filepath.Join(root, "Scripts", "python.exe")
	}
	return filepath.Join(root, "bin", "python")
}

func isVenvRoot(root string) bool {
	if _, err := os.Stat(filepath.Join(root, "pyvenv.cfg")); err != nil {
		return false
	}
	return exists(venvPython(root))
}

func isCondaRoot(root string) bool {
	if fi, err := os.Stat(filepath.Join(root, "conda-meta")); err != nil || !fi.IsDir() {
		return false
	}
	return exists(venvPython(root))
}

// pyvenvCfg reads the version and base interpreter out of a venv's marker file.
// Both are free, which is why a venv never needs to be spawned to be described.
func pyvenvCfg(root string) (version, base string) {
	data, err := os.ReadFile(filepath.Join(root, "pyvenv.cfg"))
	if err != nil {
		return "", ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		switch strings.ToLower(strings.TrimSpace(key)) {
		case "version":
			version = strings.TrimSpace(value)
		case "home":
			base = strings.TrimSpace(value)
		}
	}
	return version, base
}

func exists(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && !fi.IsDir()
}

func glob(pattern string) []string {
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil
	}
	return matches
}

// ── scan roots and prunes ────────────────────────────────────────────────────

func managedGlobs() []string {
	local := os.Getenv("LOCALAPPDATA")
	if local == "" {
		return nil
	}
	return []string{filepath.Join(local, "Python", "*", "python.exe")}
}

func installGlobs() []string {
	home, _ := os.UserHomeDir()
	local := os.Getenv("LOCALAPPDATA")
	programFiles := os.Getenv("ProgramFiles")

	patterns := []string{
		filepath.Join(local, "Programs", "Python", "*", "python.exe"),
		filepath.Join(home, "miniconda3", "python.exe"),
		filepath.Join(home, "anaconda3", "python.exe"),
		`C:\Python3*\python.exe`,
		filepath.Join(programFiles, "Python3*", "python.exe"),
	}
	if runtime.GOOS != "windows" {
		patterns = append(patterns,
			"/usr/bin/python3", "/usr/bin/python3.*",
			"/usr/local/bin/python3", "/usr/local/bin/python3.*",
			"/opt/homebrew/bin/python3", "/opt/homebrew/bin/python3.*",
		)
	}
	return patterns
}

// skipDirs are directory names never worth descending into while hunting for
// environments. Most hold no Python at all; the rest are large enough that
// walking them would dominate the whole scan.
var skipDirs = map[string]bool{
	"node_modules": true, ".git": true, ".svn": true, ".hg": true,
	"site-packages": true, "__pycache__": true, ".mypy_cache": true,
	".pytest_cache": true, ".ruff_cache": true, ".cache": true,
	".cargo": true, ".rustup": true, ".gradle": true, ".m2": true,
	".nuget": true, ".npm": true, ".pnpm-store": true, ".yarn": true,
	".bun": true, ".deno": true, ".nvm": true, ".volta": true,
	".texlive": true, ".dotnet": true, ".android": true, ".terraform": true,
	".vscode-server": true, "WinSxS": true, "wheels": true,
}

var skipDirsWindows = map[string]bool{
	"AppData": true, "Temp": true, "Windows": true, "ProgramData": true,
	"$Recycle.Bin": true, "System32": true, "Microsoft": true, "Packages": true,
	"ConnectedDevicesPlatform": true, "D3DSCache": true, "CrashDumps": true,
}

// rootSkip are directories skipped only where they sit directly under the home
// directory. `go/pkg/mod` is the one that matters: it is tens of thousands of
// directories deep and can never contain a Python environment, and leaning on
// the time budget to escape it would waste most of the budget.
var rootSkip = map[string]bool{
	"go": true, "Library": true, "obj": true, "binaries": true,
}

// ── process helper ───────────────────────────────────────────────────────────

func run(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	platform.HideWindow(cmd)
	out, err := cmd.Output()
	return string(out), err
}
