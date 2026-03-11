package pip

import (
	"fmt"
	"os"
	"path/filepath"
)

// dirSize returns the total byte size of all files under the given directory.
func dirSize(path string) int64 {
	var total int64
	filepath.WalkDir(path, func(_ string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if fi, err := d.Info(); err == nil {
			total += fi.Size()
		}
		return nil
	})
	return total
}

// formatSize returns a human-readable size string (B / KB / MB).
func formatSize(bytes int64) string {
	const mb = 1024 * 1024
	const kb = 1024
	switch {
	case bytes >= mb:
		return fmt.Sprintf("%.1f MB", float64(bytes)/mb)
	case bytes >= kb:
		return fmt.Sprintf("%.1f KB", float64(bytes)/kb)
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}
