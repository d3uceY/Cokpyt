package pip

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"Cokpyt/backend/environments"
)

// Check is one diagnostic result.
type Check struct {
	Name   string `json:"name"`
	Status string `json:"status"` // "ok" | "warn" | "fail"
	Detail string `json:"detail"`
	Hint   string `json:"hint"`
	FixURL string `json:"fixUrl"`
}

// Report is the full result of Doctor.
type Report struct {
	Env    string  `json:"env"`
	Checks []Check `json:"checks"`
	OK     bool    `json:"ok"`
}

// Doctor runs the environment checks for one interpreter.
func Doctor(env environments.Env) Report {
	checks := []Check{
		checkInterpreter(env),
		checkPip(env),
		checkPyPI(),
	}
	ok := true
	for _, check := range checks {
		if check.Status == "fail" {
			ok = false
		}
	}
	return Report{Env: env.Python, Checks: checks, OK: ok}
}

func checkInterpreter(env environments.Env) Check {
	out, err := env.Cmd("-c", "import sys;print(sys.version.split()[0])").CombinedOutput()
	if err != nil {
		return Check{
			Name:   "Interpreter",
			Status: "fail",
			Detail: fmt.Sprintf("%s cannot be run", env.Python),
			Hint:   "It may have been moved or deleted since install.",
			FixURL: "https://www.python.org/downloads/",
		}
	}
	version := strings.TrimSpace(string(out))
	if strings.HasPrefix(version, "2.") {
		return Check{
			Name:   "Interpreter",
			Status: "warn",
			Detail: "Python " + version + " no longer supports pip",
			Hint:   "Upgrade to Python 3.8 or newer for full pip support.",
			FixURL: "https://www.python.org/downloads/",
		}
	}
	return Check{
		Name:   "Interpreter",
		Status: "ok",
		Detail: fmt.Sprintf("Python %s at %s", version, env.Python),
	}
}

func checkPip(env environments.Env) Check {
	out, err := env.Pip("--version").Output()
	if err != nil {
		return Check{
			Name:   "pip",
			Status: "fail",
			Detail: "no pip in this environment",
			Hint:   "Run: " + env.Python + " -m ensurepip --upgrade",
			FixURL: "https://pip.pypa.io/en/stable/installation/",
		}
	}
	// "pip 25.3 from C:\... (python 3.14)"
	fields := strings.Fields(string(out))
	version := "unknown"
	if len(fields) >= 2 {
		version = fields[1]
	}
	return Check{Name: "pip", Status: "ok", Detail: "pip " + version + " in " + env.Label}
}

func checkPyPI() Check {
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Head("https://pypi.org/simple/")
	if err != nil {
		return Check{
			Name:   "PyPI",
			Status: "fail",
			Detail: "pypi.org is unreachable: " + err.Error(),
			Hint:   "Check your connection, or your proxy settings if you are behind one.",
			FixURL: "https://status.python.org/",
		}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return Check{
			Name:   "PyPI",
			Status: "warn",
			Detail: fmt.Sprintf("pypi.org returned HTTP %d", resp.StatusCode),
			Hint:   "Check status.python.org for an outage.",
			FixURL: "https://status.python.org/",
		}
	}
	return Check{Name: "PyPI", Status: "ok", Detail: "pypi.org is reachable"}
}
