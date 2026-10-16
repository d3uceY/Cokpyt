package environments

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

/*
launcherOutput is verbatim `py -0p` from the machine the app was written on:

	two runtimes, the 3.14 one marked as the default.
*/
const launcherOutput = ` -V:3.14 *        C:\Users\deuce\AppData\Local\Python\pythoncore-3.14-64\python.exe
 -V:3.12          C:\Users\deuce\AppData\Local\Python\pythoncore-3.12-64\python.exe
`

func TestParseLauncher(t *testing.T) {
	envs := parseLauncher(launcherOutput)
	if len(envs) != 2 {
		t.Fatalf("got %d environments, want 2", len(envs))
	}

	first := envs[0]
	if first.Version != "3.14" {
		t.Errorf("first version = %q, want 3.14", first.Version)
	}
	if !first.Default {
		t.Error("the runtime marked with * should be the default")
	}
	if want := filepath.Join("pythoncore-3.14-64", "python.exe"); filepath.Base(first.Python) != filepath.Base(want) {
		t.Errorf("first interpreter = %q, want it to end in %q", first.Python, want)
	}
	if first.Kind != KindLauncher {
		t.Errorf("first kind = %q, want %q", first.Kind, KindLauncher)
	}

	if envs[1].Default {
		t.Error("only the starred runtime is the default")
	}
	if envs[1].Version != "3.12" {
		t.Errorf("second version = %q, want 3.12", envs[1].Version)
	}
}

func TestParseLauncherIgnoresNoise(t *testing.T) {
	// The launcher prints its version banner before the list on some builds.
	const noisy = "py launcher 3.12\n\nInstalled Pythons found by py Launcher for Windows\n" + launcherOutput
	if envs := parseLauncher(noisy); len(envs) != 2 {
		t.Fatalf("got %d environments, want 2", len(envs))
	}
	if envs := parseLauncher(""); len(envs) != 0 {
		t.Fatalf("got %d environments from empty output, want 0", len(envs))
	}
}

func TestPyvenvCfg(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "pyvenv.cfg"), `home = C:\Users\deuce\AppData\Local\Python\pythoncore-3.14-64
include-system-site-packages = false
version = 3.14.3
`)

	version, base := pyvenvCfg(dir)
	if version != "3.14.3" {
		t.Errorf("version = %q, want 3.14.3", version)
	}
	if base == "" {
		t.Error("base interpreter should be read from the home key")
	}
}

func TestPyvenvCfgMissing(t *testing.T) {
	version, base := pyvenvCfg(t.TempDir())
	if version != "" || base != "" {
		t.Errorf("got (%q, %q) from a directory with no pyvenv.cfg, want empty", version, base)
	}
}

func TestScanFolderFindsVenvAndCondaEnv(t *testing.T) {
	root := t.TempDir()
	venv := filepath.Join(root, "project", ".venv")
	conda := filepath.Join(root, "miniconda", "envs", "analysis")
	makeVenv(t, venv, "3.12.10")
	makeCondaEnv(t, conda)

	found := ScanFolder(root)
	byRoot := map[string]Env{}
	for _, env := range found {
		byRoot[filepath.Clean(env.Root)] = env
	}

	// The venv is three levels down, which is exactly the depth a naive
	// `-Depth 2` search would miss.
	got, ok := byRoot[filepath.Clean(venv)]
	if !ok {
		t.Fatalf("no venv found at %s; found %d environments: %v", venv, len(found), rootsOf(found))
	}
	if got.Kind != KindVenv {
		t.Errorf("kind = %q, want %q", got.Kind, KindVenv)
	}
	if got.Version != "3.12.10" {
		t.Errorf("version = %q, want it read from pyvenv.cfg", got.Version)
	}
	if got.Label != "project/.venv" {
		t.Errorf("label = %q, want project/.venv so two .venv folders stay distinguishable", got.Label)
	}

	condaEnv, ok := byRoot[filepath.Clean(conda)]
	if !ok {
		t.Fatalf("no conda environment found at %s", conda)
	}
	if condaEnv.Kind != KindConda {
		t.Errorf("kind = %q, want %q", condaEnv.Kind, KindConda)
	}
}

/*
A venv without an interpreter is not a venv: there is nothing to ask about

	its packages, so listing it would only produce a broken row.
*/
func TestScanFolderSkipsVenvWithNoInterpreter(t *testing.T) {
	root := t.TempDir()
	broken := filepath.Join(root, "broken")
	writeFile(t, filepath.Join(broken, "pyvenv.cfg"), "version = 3.11.0\n")

	if found := ScanFolder(root); len(found) != 0 {
		t.Fatalf("got %d environments, want none: %v", len(found), rootsOf(found))
	}
}

func TestScanFolderSkipsNodeModules(t *testing.T) {
	root := t.TempDir()
	hidden := filepath.Join(root, "web", "node_modules", "pkg")
	makeVenv(t, hidden, "3.13.0")

	// node_modules is pruned, so this venv is deliberately not found. The point
	// is that the walk does not descend into it at all, not that it happens to
	// be empty.
	if found := ScanFolder(root); len(found) != 0 {
		t.Fatalf("got %d environments inside node_modules, want 0", len(found))
	}
}

func TestSplit(t *testing.T) {
	cases := []struct {
		in   string
		dir  string
		name string
	}{
		{filepath.Join("a", "b", "c"), filepath.Join("a", "b"), "c"},
		{`a\b`, "a", "b"},
		{"name", "", "name"},
	}
	for _, tc := range cases {
		dir, name := Split(tc.in)
		if name != tc.name {
			t.Errorf("Split(%q) name = %q, want %q", tc.in, name, tc.name)
		}
		// Only compare directories for inputs that really have a separator,
		// since the separator style in the expectation is platform-specific.
		if tc.dir != "" && dir != filepath.Dir(tc.in) {
			t.Errorf("Split(%q) dir = %q, want %q", tc.in, dir, filepath.Dir(tc.in))
		}
	}
}

/*
The venv this app was developed against sits in ~/.copilot/skills/.../tts/.venv.

	If `.copilot` ever lands in skipDirs the sweep silently stops finding it.
*/
func TestSkipDirsKeepsCopilot(t *testing.T) {
	for _, name := range []string{".copilot", ".venv", "venv", "projects", "src"} {
		if skipDirs[name] {
			t.Errorf("%q must not be pruned: real environments live there", name)
		}
	}
	for _, name := range []string{"node_modules", ".git", "site-packages", "__pycache__"} {
		if !skipDirs[name] {
			t.Errorf("%q should be pruned", name)
		}
	}
}

func TestVenvPythonLayout(t *testing.T) {
	got := venvPython(`C:\project\.venv`)
	want := filepath.Join(`C:\project\.venv`, "Scripts", "python.exe")
	if runtime.GOOS != "windows" {
		want = filepath.Join(`C:\project\.venv`, "bin", "python")
	}
	if got != want {
		t.Errorf("venvPython = %q, want %q", got, want)
	}
}

func TestAddDeduplicatesByInterpreter(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "python.exe")
	writeFile(t, exe, "")

	d := &discoverer{seen: map[string]bool{}}
	first := Env{Python: exe, Kind: KindLauncher, Label: "Python 3.14.3"}
	second := Env{Python: exe, Kind: KindStandalone, Label: "Python314"}

	if !d.add(first) {
		t.Fatal("the first environment should be recorded")
	}
	if d.add(second) {
		t.Fatal("the same interpreter should not be recorded twice")
	}
	if len(d.envs) != 1 || d.envs[0].Kind != KindLauncher {
		t.Errorf("kept %+v, want the first (most authoritative) description", d.envs)
	}
}

func TestAddRejectsPathsThatDoNotExist(t *testing.T) {
	d := &discoverer{seen: map[string]bool{}}
	if d.add(Env{Python: filepath.Join(t.TempDir(), "nope.exe")}) {
		t.Fatal("an interpreter that is not on disk should not be listed")
	}
}

/*
The launcher tags its runtimes "3.14", because that is all it knows. The

	interpreter itself knows the patch, and that is what a user wants to see.
*/
func TestCollapsePrefersTheMoreSpecificVersion(t *testing.T) {
	cases := []struct {
		name      string
		onDisk    string
		reported  string
		want      string
		wantLabel string
	}{
		{"the patch fills in a launcher tag", "3.14", "3.14.3", "3.14.3", "Python 3.14.3"},
		{"a fully specified version is kept", "3.12.10", "3.12.10", "3.12.10", "Python 3.12.10"},
		{"a vaguer answer never wins", "3.14.3", "3.14", "3.14.3", "Python 3.14.3"},
	}

	for _, tc := range cases {
		kept := collapse(
			[]Env{{Python: realPython, Kind: KindLauncher, Version: tc.onDisk, Label: "Python " + tc.onDisk}},
			func(string) (probeResult, bool) {
				return probeResult{Version: tc.reported, Executable: realPython}, true
			},
		)
		if len(kept) != 1 {
			t.Fatalf("%s: kept %d environments, want 1", tc.name, len(kept))
		}
		if kept[0].Version != tc.want {
			t.Errorf("%s: version = %q, want %q", tc.name, kept[0].Version, tc.want)
		}
		if kept[0].Label != tc.wantLabel {
			t.Errorf("%s: label = %q, want %q", tc.name, kept[0].Label, tc.wantLabel)
		}
	}
}

/* ── launcher shim collapsing ────────────────────────────────────────────── */

const (
	realPython = `C:\Users\me\AppData\Local\Python\pythoncore-3.14-64\python.exe`
	binShim    = `C:\Users\me\AppData\Local\Python\bin\python.exe`
)

/*
The Install Manager's bin\python.exe answers --version correctly but owns no

	packages. Listing it adds a row that can never hold anything and duplicates
	the runtime it points at.
*/
func TestCollapseDropsShimDuplicatingAKnownInterpreter(t *testing.T) {
	envs := []Env{
		{Python: realPython, Kind: KindLauncher, Version: "3.14", Label: "Python 3.14", Default: true},
		{Python: binShim, Kind: KindLauncher, Label: "bin"},
	}
	ask := func(string) (probeResult, bool) {
		return probeResult{Version: "3.14.3", Executable: realPython}, true
	}

	kept := collapse(envs, ask)
	if len(kept) != 1 {
		t.Fatalf("kept %d environments, want 1: %v", len(kept), rootsOf(kept))
	}
	if kept[0].Python != realPython {
		t.Errorf("kept %q, want the real interpreter", kept[0].Python)
	}
	// The shim's own description ("bin") must not survive: the row that stays
	// is the launcher's, and its label is rebuilt from the probed version.
	if !kept[0].Default {
		t.Error("the kept environment should still be the launcher's default runtime")
	}
	if kept[0].Label == "bin" {
		t.Error("kept the shim's label instead of the runtime's")
	}
}

/*
If the shim is the only thing found — py is missing, or the launcher's own

	listing failed — the environment must not be lost.
*/
func TestCollapseRenamesAShimWithNoKnownTarget(t *testing.T) {
	kept := collapse(
		[]Env{{Python: binShim, Kind: KindLauncher, Label: "bin"}},
		func(string) (probeResult, bool) {
			return probeResult{Version: "3.14.3", Executable: realPython}, true
		},
	)

	if len(kept) != 1 {
		t.Fatalf("kept %d environments, want 1", len(kept))
	}
	if kept[0].Python != realPython {
		t.Errorf("interpreter = %q, want the real one", kept[0].Python)
	}
	if kept[0].Root != filepath.Dir(realPython) {
		t.Errorf("root = %q, want it to follow the interpreter", kept[0].Root)
	}
	if kept[0].Version != "3.14.3" {
		t.Errorf("version = %q, want the probed version filled in", kept[0].Version)
	}
}

/*
pyvenv.cfg states the version the venv was built with, which is what the

	user chose. The running interpreter's patch version must not overwrite it.
*/
func TestCollapseKeepsTheVersionFromPyvenvCfg(t *testing.T) {
	venv := filepath.Join("home", "proj", ".venv", "Scripts", "python.exe")
	kept := collapse(
		[]Env{{Python: venv, Kind: KindVenv, Version: "3.12.10", Label: "proj/.venv"}},
		func(python string) (probeResult, bool) {
			return probeResult{Version: "3.12.11", Executable: python}, true
		},
	)

	if len(kept) != 1 {
		t.Fatalf("kept %d environments, want 1", len(kept))
	}
	if kept[0].Version != "3.12.10" {
		t.Errorf("version = %q, want the pyvenv.cfg value", kept[0].Version)
	}
}

/*
A venv whose base interpreter was removed is a broken environment, and a

	broken environment is exactly what the user needs to see.
*/
func TestCollapseKeepsAnInterpreterThatWillNotRun(t *testing.T) {
	kept := collapse(
		[]Env{{Python: `C:\gone\Scripts\python.exe`, Kind: KindVenv, Label: "gone"}},
		func(string) (probeResult, bool) { return probeResult{}, false },
	)

	if len(kept) != 1 {
		t.Fatalf("kept %d environments, want the unrunnable one kept", len(kept))
	}
	if kept[0].Version != "" {
		t.Errorf("version = %q, want empty when the interpreter could not be asked", kept[0].Version)
	}
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

func makeVenv(t *testing.T, root, version string) {
	t.Helper()
	writeFile(t, filepath.Join(root, "pyvenv.cfg"), "home = C:\\Python\nversion = "+version+"\n")
	writeFile(t, venvPython(root), "")
}

func makeCondaEnv(t *testing.T, root string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(root, "conda-meta"), 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, venvPython(root), "")
}

func writeFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func rootsOf(envs []Env) []string {
	roots := make([]string, len(envs))
	for i, env := range envs {
		roots[i] = env.Root
	}
	return roots
}
