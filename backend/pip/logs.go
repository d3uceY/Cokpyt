package pip

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// LogEntry records a single log message.
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
}

var logMu sync.Mutex

func logsPath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "Cokpyt")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "logs.json"), nil
}

// AppendLog persists a new log entry to the logs file.
func AppendLog(level, msg string) {
	logMu.Lock()
	defer logMu.Unlock()

	path, err := logsPath()
	if err != nil {
		return
	}
	var entries []LogEntry
	if data, err := os.ReadFile(path); err == nil {
		json.Unmarshal(data, &entries)
	}
	entries = append(entries, LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Level:     level,
		Message:   msg,
	})
	// Cap at 1000 entries.
	if len(entries) > 1000 {
		entries = entries[len(entries)-1000:]
	}
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(path, data, 0o644)
}

// GetLogs returns all recorded log entries, oldest first.
func GetLogs() ([]LogEntry, error) {
	path, err := logsPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []LogEntry{}, nil
	}
	if err != nil {
		return nil, err
	}
	var entries []LogEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}
