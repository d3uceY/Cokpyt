//go:build windows

package platform

import (
	"os/exec"
	"syscall"
)

// HideWindow stops a spawned console program from flashing a console window.
func HideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
