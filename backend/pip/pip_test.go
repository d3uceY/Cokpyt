package pip

import (
	"path/filepath"
	"testing"
)

func TestClassifyBump(t *testing.T) {
	cases := []struct {
		current, latest, want string
	}{
		{"1.2.3", "2.0.0", "major"},
		{"1.2.3", "1.3.0", "minor"},
		{"1.2.3", "1.2.4", "patch"},
		{"2.4.3", "2.4.3", "patch"},
		// Real-world versions are not semver. .post0 is the third segment, so
		// moving to .1 is a patch bump, not a minor one.
		{"2.9.0.post0", "2.9.1", "patch"},
		{"2025.3", "2026.1", "major"},
		{"0.1", "0.1", "patch"},
	}
	for _, tc := range cases {
		if got := classifyBump(tc.current, tc.latest); got != tc.want {
			t.Errorf("classifyBump(%q, %q) = %q, want %q", tc.current, tc.latest, got, tc.want)
		}
	}
}

func TestNormalise(t *testing.T) {
	// PEP 503: runs of -_. collapse to a single dash, then lowercase. That
	// means "PyYAML" and "pyyaml" are one project, and "Py_YAML" normalises
	// to a *different* name — which is pip's rule, not a bug here.
	cases := map[string]string{
		"PyYAML":   "pyyaml",
		"pyyaml":   "pyyaml",
		"Py_YAML":  "py-yaml",
		"Py.YAML":  "py-yaml",
		"zope..if": "zope-if",
	}
	for name, want := range cases {
		if got := normalise(name); got != want {
			t.Errorf("normalise(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestInstalledVersion(t *testing.T) {
	output := "Collecting requests\n" +
		"Successfully installed certifi-2026.1.4 requests-2.32.0 urllib3-2.6.2\n"

	if got := installedVersion(output, "requests"); got != "2.32.0" {
		t.Errorf("installedVersion = %q, want 2.32.0", got)
	}
	// A package whose name is a prefix of another must not be mistaken for it.
	if got := installedVersion(output, "urllib3"); got != "2.6.2" {
		t.Errorf("installedVersion(urllib3) = %q, want 2.6.2", got)
	}
	if got := installedVersion(output, "flask"); got != "" {
		t.Errorf("installedVersion(flask) = %q, want empty", got)
	}
}

func TestNameFrom(t *testing.T) {
	cases := []struct {
		args []string
		want string
	}{
		{[]string{"install", "requests==2.32.0"}, "requests==2.32.0"},
		{[]string{"install", "--upgrade", "requests"}, "requests"},
		{[]string{"uninstall", "--yes", "requests"}, "requests"},
	}
	for _, tc := range cases {
		if got := nameFrom(tc.args); got != tc.want {
			t.Errorf("nameFrom(%v) = %q, want %q", tc.args, got, tc.want)
		}
	}
}

/*
getsitepackages() is not ordered the way the name suggests: under the Python

	Install Manager it returns the prefix first, and taking that reports the
	interpreter's own directory next to a package count that says 39.
*/
func TestPickSitePackages(t *testing.T) {
	cases := []struct {
		name       string
		candidates []string
		want       string
	}{
		{
			"launcher layout puts the prefix first",
			[]string{`C:\Python\pythoncore-3.14-64`, `C:\Python\pythoncore-3.14-64\Lib\site-packages`},
			`C:\Python\pythoncore-3.14-64\Lib\site-packages`,
		},
		{"a venv has exactly one", []string{`C:\proj\.venv\Lib\site-packages`}, `C:\proj\.venv\Lib\site-packages`},
		{
			"nothing usable falls back to the last entry",
			[]string{`/usr/lib/python3`, `/usr/lib/python3/dist-packages`},
			`/usr/lib/python3/dist-packages`,
		},
		{"an empty list reports nothing", nil, ""},
	}
	for _, tc := range cases {
		if got := pickSitePackages(tc.candidates); got != tc.want {
			t.Errorf("%s: pickSitePackages = %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestLastNonEmptyLine(t *testing.T) {
	output := "Collecting thing\nERROR: No matching distribution found\n\n"
	if got := lastNonEmptyLine(output); got != "ERROR: No matching distribution found" {
		t.Errorf("lastNonEmptyLine = %q", got)
	}
	if got := lastNonEmptyLine(""); got != "" {
		t.Errorf("lastNonEmptyLine(\"\") = %q, want empty", got)
	}
}

/*
parseVersions has to survive the whole of what `pip index versions` prints.
Everything below the marker is real output from pip 26: the package and its
latest version on the first line, the installed and latest pair indented at the
end, and the upgrade notice, which arrives on stderr and so is folded into the
same buffer by CombinedOutput. Only the marker line may be read, and the order
must be pip's, because it is PEP 440 order and a string sort is not.
*/
func TestParseVersions(t *testing.T) {
	output := "requests (2.34.2)\n" +
		"Available versions: 2.34.2, 2.34.1, 2.33.1, 0.12.1, 0.12.0\n" +
		"  INSTALLED: 2.32.5\n" +
		"  LATEST:    2.34.2\n" +
		"\n" +
		"[notice] A new release of pip is available: 26.0.1 -> 26.2.1\n" +
		"[notice] To update, run: python.exe -m pip install --upgrade pip\n"

	versions, ok := parseVersions(output)
	if !ok {
		t.Fatalf("parseVersions reported no list")
	}
	want := []string{"2.34.2", "2.34.1", "2.33.1", "0.12.1", "0.12.0"}
	if len(versions) != len(want) {
		t.Fatalf("parseVersions returned %d versions, want %d: %v", len(versions), len(want), versions)
	}
	for i := range want {
		if versions[i] != want[i] {
			t.Errorf("version %d = %q, want %q", i, versions[i], want[i])
		}
	}

	// A single version is still a list, and pip writes it the same way.
	if got, ok := parseVersions("thing (1.0.0)\nAvailable versions: 1.0.0\n"); !ok || len(got) != 1 || got[0] != "1.0.0" {
		t.Errorf("parseVersions on one version = %v, %v", got, ok)
	}

	// The two failures that must not be reported as an empty list: pip's
	// "no matching distribution" for an unknown name, and no output at all.
	for name, out := range map[string]string{
		"unknown package": "ERROR: No matching distribution found for zzz-nothing-on-pypi\n",
		"empty":           "",
		"marker only":     "Available versions: \n",
	} {
		if got, ok := parseVersions(out); ok {
			t.Errorf("%s: parseVersions = %v, want not ok", name, got)
		}
	}
}

/*
failureReason exists so a failed pip call reports pip's own explanation

	rather than Go's "exit status 1".
*/
func TestFailureReasonPrefersOutput(t *testing.T) {
	if got := failureReason([]byte("ERROR: nothing matched\n"), errStub{}); got != "ERROR: nothing matched" {
		t.Errorf("failureReason = %q, want pip's own line", got)
	}
	if got := failureReason(nil, errStub{}); got != "stub failure" {
		t.Errorf("failureReason with no output = %q, want the error text", got)
	}
}

/*
The name index is downloaded once and read from disk from then on. The stored
names below are the proof: nothing on PyPI is called "zzz-nothing-on-pypi", so
if loadIndex answers with it, the file was used and the network was left alone.
*/
func TestIndexIsReadFromDisk(t *testing.T) {
	path := filepath.Join(t.TempDir(), "index.txt")
	indexPath = func() (string, error) { return path, nil }
	t.Cleanup(func() {
		indexPath = func() (string, error) { return statePath(indexFile) }
		indexNames, indexReady = nil, false
	})

	stored := []string{"aaa-first", "zzz-nothing-on-pypi"}
	if err := saveIndex(stored); err != nil {
		t.Fatalf("saveIndex: %v", err)
	}

	indexNames, indexReady = nil, false
	names, err := loadIndex()
	if err != nil {
		t.Fatalf("loadIndex: %v", err)
	}
	if len(names) != len(stored) {
		t.Fatalf("loadIndex returned %d names, want %d", len(names), len(stored))
	}
	for i := range stored {
		if names[i] != stored[i] {
			t.Errorf("name %d = %q, want %q", i, names[i], stored[i])
		}
	}

	status := CachedIndex()
	if status.Names != len(stored) || status.Fetched == "" {
		t.Errorf("CachedIndex = %+v, want %d names and a fetch time", status, len(stored))
	}
}

type errStub struct{}

func (errStub) Error() string { return "stub failure" }
