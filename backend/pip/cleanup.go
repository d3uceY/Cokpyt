package pip

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// CleanupInfo holds the reclaimable size for each cleanup category.
type CleanupInfo struct {
	CacheSize   string `json:"cacheSize"`
	EggInfoSize string `json:"eggInfoSize"`
	PycacheSize string `json:"pycacheSize"`
}

// GetCleanupInfo measures the reclaimable space for each cleanup category.
func GetCleanupInfo() (CleanupInfo, error) {
	var info CleanupInfo

	if cacheDir, err := pipCacheDir(); err == nil {
		info.CacheSize = formatSize(dirSize(cacheDir))
	} else {
		info.CacheSize = "0 B"
	}

	sp, err := getSitePackages()
	if err != nil {
		info.EggInfoSize = "0 B"
		info.PycacheSize = "0 B"
		return info, nil
	}

	var eggSize, pycSize int64
	filepath.WalkDir(sp, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
			return nil
		}
		name := d.Name()
		if strings.HasSuffix(name, ".egg-info") {
			eggSize += dirSize(path)
			return filepath.SkipDir
		}
		if name == "__pycache__" {
			pycSize += dirSize(path)
			return filepath.SkipDir
		}
		return nil
	})

	info.EggInfoSize = formatSize(eggSize)
	info.PycacheSize = formatSize(pycSize)
	return info, nil
}

// RunCleanup performs the requested cleanup operations.
// types may contain "cache", "orphan", and/or "temp".
func RunCleanup(types []string) error {
	for _, t := range types {
		switch t {
		case "cache":
			if out, err := pip("cache", "purge").CombinedOutput(); err != nil {
				return fmt.Errorf("pip cache purge: %s", strings.TrimSpace(string(out)))
			}
		case "orphan":
			sp, err := getSitePackages()
			if err != nil {
				return err
			}
			filepath.WalkDir(sp, func(path string, d os.DirEntry, err error) error {
				if err == nil && d.IsDir() && strings.HasSuffix(d.Name(), ".egg-info") {
					os.RemoveAll(path)
					return filepath.SkipDir
				}
				return nil
			})
		case "temp":
			sp, err := getSitePackages()
			if err != nil {
				return err
			}
			filepath.WalkDir(sp, func(path string, d os.DirEntry, err error) error {
				if err == nil && d.IsDir() && d.Name() == "__pycache__" {
					os.RemoveAll(path)
					return filepath.SkipDir
				}
				return nil
			})
		}
	}
	return nil
}

func pipCacheDir() (string, error) {
	out, err := pip("cache", "dir").Output()
	if err != nil {
		return "", err
	}
	// Take the last non-empty line to skip any deprecation warnings.
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if l := strings.TrimSpace(lines[i]); l != "" {
			return l, nil
		}
	}
	return "", fmt.Errorf("no output from pip cache dir")
}

func getSitePackages() (string, error) {
	out, err := exec.Command("python", "-c", "import site; print(site.getsitepackages()[0])").Output()
	if err != nil {
		return "", fmt.Errorf("could not find site-packages: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}
