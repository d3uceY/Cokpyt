package pip

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// HistoryEntry records a single pip operation.
type HistoryEntry struct {
	ID        string `json:"id"`
	Action    string `json:"action"` // "install" | "upgrade" | "uninstall"
	Package   string `json:"package"`
	Version   string `json:"version"`
	Status    string `json:"status"` // "success" | "failed"
	Timestamp string `json:"timestamp"`
	Command   string `json:"command"`
}

var histMu sync.Mutex

func historyPath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "Cokpit")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "history.json"), nil
}

// GetHistory returns all recorded history entries, newest first.
func GetHistory() ([]HistoryEntry, error) {
	path, err := historyPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []HistoryEntry{}, nil
	}
	if err != nil {
		return nil, err
	}
	var entries []HistoryEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	// Reverse so newest is first.
	for i, j := 0, len(entries)-1; i < j; i, j = i+1, j-1 {
		entries[i], entries[j] = entries[j], entries[i]
	}
	return entries, nil
}

// appendHistory persists a new entry to the history file.
func appendHistory(e HistoryEntry) {
	histMu.Lock()
	defer histMu.Unlock()

	path, err := historyPath()
	if err != nil {
		return
	}
	var entries []HistoryEntry
	if data, err := os.ReadFile(path); err == nil {
		json.Unmarshal(data, &entries)
	}
	entries = append(entries, e)
	// Cap at 500 entries.
	if len(entries) > 500 {
		entries = entries[len(entries)-500:]
	}
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(path, data, 0o644)
}

func newEntry(action, pkg, version, cmd, status string) HistoryEntry {
	return HistoryEntry{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Action:    action,
		Package:   pkg,
		Version:   version,
		Status:    status,
		Timestamp: time.Now().Format("2006-01-02 15:04"),
		Command:   cmd,
	}
}
