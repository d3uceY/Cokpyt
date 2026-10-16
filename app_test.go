package main

import (
	"sync"
	"testing"

	"Cokpyt/backend/environments"
)

func TestVersionNumbers(t *testing.T) {
	cases := []struct {
		version string
		want    []int
	}{
		{"v0.3.0", []int{0, 3, 0}},
		{"0.3.0", []int{0, 3, 0}},
		{"v1.0.0-beta.2", []int{1, 0, 0, 2}},
		{"", nil},
	}
	for _, tc := range cases {
		got := VersionNumbers(tc.version)
		if len(got) != len(tc.want) {
			t.Errorf("VersionNumbers(%q) = %v, want %v", tc.version, got, tc.want)
			continue
		}
		for i := range got {
			if got[i] != tc.want[i] {
				t.Errorf("VersionNumbers(%q) = %v, want %v", tc.version, got, tc.want)
				break
			}
		}
	}
}

/*
Plain string comparison gets the two-digit case wrong: "v0.10.0" sorts

	before "v0.9.0", which would hide an update from a user on 0.9.0.
*/
func TestNewer(t *testing.T) {
	cases := []struct {
		candidate, current string
		want               bool
	}{
		{"v0.10.0", "v0.9.0", true},
		{"v0.9.0", "v0.10.0", false},
		{"v0.3.1", "v0.3.0", true},
		{"v0.3.0", "v0.3.0", false},
		{"v1.0.0", "v0.9.9", true},
		{"v0.3.0", "v0.3", true},
		{"v0.3", "v0.3.0", false},
	}
	for _, tc := range cases {
		if got := Newer(tc.candidate, tc.current); got != tc.want {
			t.Errorf("Newer(%q, %q) = %v, want %v", tc.candidate, tc.current, got, tc.want)
		}
	}
}

func TestPick(t *testing.T) {
	defaultRuntime := environments.Env{Python: "py3.14", Kind: environments.KindLauncher, Default: true}
	base := environments.Env{Python: "py3.12", Kind: environments.KindStandalone}
	venv := environments.Env{Python: "venv", Kind: environments.KindVenv}

	app := &App{}
	cases := []struct {
		name      string
		preferred string
		envs      []environments.Env
		want      string
	}{
		{"an explicit choice wins", "venv", []environments.Env{defaultRuntime, base, venv}, "venv"},
		{"a stale choice falls back to the launcher default", "gone", []environments.Env{defaultRuntime, base, venv}, "py3.14"},
		{"no choice prefers the launcher default", "", []environments.Env{defaultRuntime, base, venv}, "py3.14"},
		{
			// A venv belongs to one project, so the app should not adopt it as
			// the default while a base interpreter is on offer.
			"a base interpreter beats a venv when there is no default",
			"",
			[]environments.Env{venv, base},
			"py3.12",
		},
		{"a venv is better than nothing", "", []environments.Env{venv}, "venv"},
		{"nothing found", "", nil, ""},
	}
	for _, tc := range cases {
		if got := app.pick(tc.preferred, tc.envs); got != tc.want {
			t.Errorf("%s: pick(%q) = %q, want %q", tc.name, tc.preferred, got, tc.want)
		}
	}
}

/*
Startup must not block on discovery, and concurrent callers must not each

	start a sweep of their own. Run with -race to check the second half.
*/
func TestBootstrapIsNonBlockingAndSingleFlight(t *testing.T) {
	if testing.Short() {
		t.Skip("walks the home directory")
	}

	app := &App{}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if i%2 == 0 {
				app.Bootstrap()
			} else {
				app.Scan()
			}
		}(i)
	}
	wg.Wait()

	if !app.scanned {
		t.Error("expected at least one scan to finish")
	}
	app.mu.RLock()
	inflight := app.inflight
	app.mu.RUnlock()
	if inflight != nil {
		t.Error("no scan should still be running once every caller has returned")
	}
}
