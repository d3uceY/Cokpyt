//go:build !windows

package platform

import "os/exec"

// HideWindow is a no-op where spawning a process does not open a console.
func HideWindow(*exec.Cmd) {}
