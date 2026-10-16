// Package environments inventories the Python interpreters and virtual
// environments on this machine.
//
// `pip list` answers a narrower question than it looks like it does: it reports
// the packages of one interpreter. On a machine with a launcher, two runtimes,
// and a handful of project venvs, that is a fraction of the answer — and the
// fraction it misses is usually the one you wanted. This package finds all of
// them so the app can report on all of them.
package environments

import (
	"os/exec"

	"Cokpyt/backend/platform"
)

// How an environment was found. The distinction matters to the user: a venv
// holds packages nothing else can see, and a runtime the launcher does not
// manage cannot be reached through `py`.
const (
	KindLauncher   = "launcher"   // installed and tracked by the Python Install Manager (`py`)
	KindStandalone = "standalone" // an installer dropped it wherever the user pointed it
	KindVenv       = "venv"       // a virtual environment, marked by pyvenv.cfg
	KindConda      = "conda"      // a conda environment, marked by conda-meta
)

// Env is one Python environment, identified by the interpreter that owns its
// packages. Two environments never share an interpreter path, so the path is
// the identity key and doubles as the handle the frontend passes back.
type Env struct {
	Python  string `json:"python"`  // absolute path to the interpreter
	Version string `json:"version"` // "3.14.3", empty when the interpreter cannot be run
	Kind    string `json:"kind"`
	Label   string `json:"label"`   // short human name
	Root    string `json:"root"`    // environment root directory
	Source  string `json:"source"`  // how it was found, for the UI
	Base    string `json:"base"`    // interpreter this one was built from, for venvs
	Default bool   `json:"default"` // the launcher's default runtime
}

// Cmd runs this environment's interpreter.
func (e Env) Cmd(args ...string) *exec.Cmd {
	cmd := exec.Command(e.Python, args...)
	platform.HideWindow(cmd)
	return cmd
}

// Pip runs this environment's pip.
//
// `-m pip` is deliberate: it runs the pip that belongs to *this* interpreter,
// not whichever pip happens to be first on PATH, which is exactly the ambiguity
// being avoided. `--disable-pip-version-check` keeps read-only inventory calls
// offline instead of letting pip fetch a version notice mid-scan.
func (e Env) Pip(args ...string) *exec.Cmd {
	return e.Cmd(append([]string{"-m", "pip", "--disable-pip-version-check"}, args...)...)
}

// IsVirtual reports whether the environment is a venv or a conda env, i.e. one
// whose packages are invisible to every other environment.
func (e Env) IsVirtual() bool {
	return e.Kind == KindVenv || e.Kind == KindConda
}

// Split is filepath.Split without the trailing separator, which is what the
// labels and the venv scanner actually want.
func Split(p string) (dir, name string) {
	for i := len(p) - 1; i >= 0; i-- {
		switch p[i] {
		case '\\', '/':
			return p[:i], p[i+1:]
		}
	}
	return "", p
}
