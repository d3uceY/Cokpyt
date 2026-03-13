//go:build windows

package pip

import (
	"os/exec"
	"syscall"
)

// hideWindow prevents the spawned subprocess from creating a visible console window on Windows.
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
