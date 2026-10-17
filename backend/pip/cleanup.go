package pip

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"Cokpyt/backend/environments"
)

// Reclaim is the disk space one cleanup category would free.
type Reclaim struct {
	Kind  string `json:"kind"`
	Label string `json:"label"`
	Size  int64  `json:"size"`
	Files int    `json:"files"`
	Path  string `json:"path"`
}

// CleanupInfo measures what each cleanup category currently costs.
//
// The cache is pip's own download cache and is global, so it is only reported
// once, against whichever environment asked first.
func CleanupInfo(env environments.Env) []Reclaim {
	categories := []Reclaim{
		{Kind: "cache", Label: "pip download cache"},
		{Kind: "orphan", Label: "leftover .egg-info directories"},
		{Kind: "temp", Label: "__pycache__ folders"},
	}

	if dir, err := cacheDir(env); err == nil {
		size, files := measure(dir)
		categories[0].Path, categories[0].Size, categories[0].Files = dir, size, files
	}

	for _, site := range sitePackagesDirs(env) {
		for _, pattern := range []struct {
			kind  int
			glob  string
			match func(string) bool
		}{
			{1, "*.egg-info", nil},
			{2, "__pycache__", nil},
		} {
			matches, _ := filepath.Glob(filepath.Join(site, pattern.glob))
			for _, match := range matches {
				size, files := measure(match)
				categories[pattern.kind].Size += size
				categories[pattern.kind].Files += files
				categories[pattern.kind].Path = site
			}
		}
	}
	return categories
}

// Cleanup removes the requested categories from the environment.
func Cleanup(env environments.Env, kinds []string) error {
	var problems []string
	for _, kind := range kinds {
		switch kind {
		case "cache":
			if out, err := env.Pip("cache", "purge").CombinedOutput(); err != nil {
				problems = append(problems, "cache: "+failureReason(out, err))
			}
		case "orphan":
			problems = append(problems, removeIn(env, "*.egg-info", "egg-info")...)
		case "temp":
			problems = append(problems, removeIn(env, "__pycache__", "__pycache__")...)
		}
	}
	if len(problems) > 0 {
		return errors.New(strings.Join(problems, "; "))
	}
	return nil
}

// removeIn deletes every matching entry in the environment's site-packages.
// Leftovers pip no longer tracks are the ones most likely to be read-only, and
// "could not remove X" is more useful than a silent partial success.
func removeIn(env environments.Env, pattern, label string) []string {
	var problems []string
	for _, site := range sitePackagesDirs(env) {
		matches, _ := filepath.Glob(filepath.Join(site, pattern))
		for _, match := range matches {
			if err := os.RemoveAll(match); err != nil {
				problems = append(problems, label+" "+match+": "+err.Error())
			}
		}
	}
	return problems
}

// cacheDir asks pip where its cache lives. Asking beats guessing: the location
// moves between platforms and honours PIP_CACHE_DIR.
func cacheDir(env environments.Env) (string, error) {
	out, err := env.Pip("cache", "dir").Output()
	if err != nil {
		return "", err
	}
	// Take the last non-empty line: pip may print a warning before the path.
	if path := lastNonEmptyLine(string(out)); path != "" {
		return path, nil
	}
	return "", errors.New("pip did not report a cache directory")
}

// measure returns the total size and file count under a path.
func measure(path string) (int64, int) {
	var size int64
	files := 0
	filepath.WalkDir(path, func(_ string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		if info, err := entry.Info(); err == nil {
			size += info.Size()
			files++
		}
		return nil
	})
	return size, files
}
