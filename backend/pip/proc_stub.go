//go:build !windows

package pip

import "os/exec"

// hideWindow is a no-op on non-Windows platforms.
func hideWindow(cmd *exec.Cmd) {}
