package pip

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// SearchResult is a package found on PyPI.
type SearchResult struct {
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	HomePage    string `json:"homePage"`
	Installed   bool   `json:"installed"`
}

// ── the name index ───────────────────────────────────────────────────────────
//
// The simple index holds a name for every project on PyPI: hundreds of
// thousands of them, tens of megabytes on the wire. Downloading it is the
// heaviest thing this app does, so the names are written to disk once and read
// back from there on every later run. Downloading it again is the user's call.

const indexFile = "pypi-index.txt"

// indexPath is where the index is stored. A variable so a test can point it at
// a temp file.
var indexPath = func() (string, error) { return statePath(indexFile) }

var (
	indexMu    sync.RWMutex
	indexNames []string // normalised, one per line on disk
	indexReady bool
)

// IndexStatus describes the stored index. Fetched is empty when nothing has
// been stored yet.
type IndexStatus struct {
	Names   int    `json:"names"`
	Fetched string `json:"fetched"`
}

// WarmIndex loads the stored index so the first search is instant, and
// downloads it when nothing has been stored yet. Called once at startup;
// failing is fine, the next search retries.
func WarmIndex() {
	// Failing is fine: the next search builds the index again.
	_, _ = loadIndex()
}

// RefreshIndex downloads the index again, replacing the stored copy.
func RefreshIndex() (IndexStatus, error) {
	names, err := fetchIndex()
	if err != nil {
		return CachedIndex(), err
	}

	indexMu.Lock()
	indexNames, indexReady = names, true
	indexMu.Unlock()

	// A cache that cannot be written still works for this session, and the next
	// launch downloads it again.
	_ = saveIndex(names)
	return CachedIndex(), nil
}

// CachedIndex reports what is stored, without touching the network.
func CachedIndex() IndexStatus {
	indexMu.RLock()
	names := len(indexNames)
	indexMu.RUnlock()

	status := IndexStatus{Names: names}
	path, err := indexPath()
	if err != nil {
		return status
	}
	if fi, err := os.Stat(path); err == nil {
		status.Fetched = fi.ModTime().Format("2006-01-02 15:04:05")
	}
	return status
}

// loadIndex returns the index from memory, then from disk, and only then from
// PyPI.
func loadIndex() ([]string, error) {
	indexMu.RLock()
	names, ready := indexNames, indexReady
	indexMu.RUnlock()
	if ready {
		return names, nil
	}

	indexMu.Lock()
	defer indexMu.Unlock()
	if indexReady {
		return indexNames, nil
	}

	names, err := readIndex()
	if err != nil || len(names) == 0 {
		if names, err = fetchIndex(); err != nil {
			return nil, err
		}
		_ = saveIndex(names)
	}
	indexNames, indexReady = names, true
	return indexNames, nil
}

// readIndex reads the stored names, one per line.
func readIndex() ([]string, error) {
	path, err := indexPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, line := range strings.Split(string(data), "\n") {
		if line != "" {
			names = append(names, line)
		}
	}
	return names, nil
}

// saveIndex writes one name per line. Distribution names never contain a
// newline, so the file needs no encoding and reads back without a parser.
func saveIndex(names []string) error {
	path, err := indexPath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(strings.Join(names, "\n")), 0o644)
}

// fetchIndex downloads the simple index and returns every project name,
// normalised — "PyYAML" and "pyyaml" are one project, and one project is one
// entry in the search list.
func fetchIndex() ([]string, error) {
	req, err := http.NewRequest(http.MethodGet, "https://pypi.org/simple/", nil)
	if err != nil {
		return nil, err
	}
	// The JSON form of the simple index is one request; the HTML form is a
	// much larger document holding the same names.
	req.Header.Set("Accept", "application/vnd.pypi.simple.v1+json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PyPI index returned HTTP %d", resp.StatusCode)
	}

	var payload struct {
		Projects []struct {
			Name string `json:"name"`
		} `json:"projects"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	names := make([]string, len(payload.Projects))
	for i, project := range payload.Projects {
		names[i] = normalise(project.Name)
	}
	return names, nil
}

// Search finds packages on PyPI by name, best match first, then fills in the
// metadata for the shortlist in parallel.
func Search(query string) ([]SearchResult, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []SearchResult{}, nil
	}
	want := normalise(query)

	names, err := loadIndex()
	if err != nil {
		// The index is a convenience. An exact name still works without it.
		return metadata(query)
	}

	type scored struct {
		index int
		score int
	}
	var matches []scored
	for i, name := range names {
		switch {
		case name == want:
			matches = append(matches, scored{i, 3})
		case strings.HasPrefix(name, want):
			matches = append(matches, scored{i, 2})
		case strings.Contains(name, want):
			matches = append(matches, scored{i, 1})
		}
	}
	sort.SliceStable(matches, func(i, j int) bool {
		if matches[i].score != matches[j].score {
			return matches[i].score > matches[j].score
		}
		// Shorter names are closer to the query than longer ones that merely
		// contain it, so "requests" beats "requests-toolbelt".
		return len(names[matches[i].index]) < len(names[matches[j].index])
	})

	const maxResults = 20
	if len(matches) > maxResults {
		matches = matches[:maxResults]
	}

	results := make([]SearchResult, len(matches))
	var wg sync.WaitGroup
	for i, match := range matches {
		wg.Add(1)
		go func(i int, name string) {
			defer wg.Done()
			if found, err := metadata(name); err == nil && len(found) > 0 {
				results[i] = found[0]
			}
		}(i, names[match.index])
	}
	wg.Wait()

	// Metadata lookups can fail individually; drop the gaps.
	kept := results[:0]
	for _, result := range results {
		if result.Name != "" {
			kept = append(kept, result)
		}
	}
	return kept, nil
}

// metadata fetches one package's details from the PyPI JSON API.
func metadata(name string) ([]SearchResult, error) {
	resp, err := httpClient.Get("https://pypi.org/pypi/" + name + "/json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PyPI returned HTTP %d for %s", resp.StatusCode, name)
	}

	var payload struct {
		Info struct {
			Name        string            `json:"name"`
			Version     string            `json:"version"`
			Summary     string            `json:"summary"`
			HomePage    string            `json:"home_page"`
			ProjectURLs map[string]string `json:"project_urls"`
		} `json:"info"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	home := payload.Info.HomePage
	if home == "" {
		for _, key := range []string{"Homepage", "Home", "Source", "Repository", "Documentation"} {
			if url := payload.Info.ProjectURLs[key]; url != "" {
				home = url
				break
			}
		}
	}
	return []SearchResult{{
		Name:        payload.Info.Name,
		Version:     payload.Info.Version,
		Description: payload.Info.Summary,
		HomePage:    home,
	}}, nil
}
