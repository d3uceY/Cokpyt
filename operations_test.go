package main

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestOpLogRecordsTheLifecycle(t *testing.T) {
	log := newOpLog()

	id, err := log.begin("install", "python.exe", "requests", 1)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}

	ops := log.list()
	if len(ops) != 1 {
		t.Fatalf("list = %d operations, want 1", len(ops))
	}
	op := ops[0]
	if !op.Running || op.Kind != "install" || op.Env != "python.exe" || op.Target != "requests" {
		t.Errorf("started operation = %+v", op)
	}
	if op.Started == 0 || op.Ended != 0 {
		t.Errorf("timestamps = started %d, ended %d", op.Started, op.Ended)
	}

	log.step(id, "requests")
	log.finish(id, nil)

	op = log.list()[0]
	if op.Running || op.Failed {
		t.Errorf("finished operation still marked running or failed: %+v", op)
	}
	if op.Done != 1 || op.Ended == 0 {
		t.Errorf("finished operation = done %d, ended %d", op.Done, op.Ended)
	}
}

func TestOpLogRefusesASecondRunInOneEnvironment(t *testing.T) {
	log := newOpLog()

	if _, err := log.begin("install", "one", "requests", 1); err != nil {
		t.Fatalf("first begin: %v", err)
	}

	_, err := log.begin("upgrade", "one", "flask", 1)
	if err == nil {
		t.Fatal("a second operation in the same environment should be refused")
	}
	if !strings.Contains(err.Error(), "install") {
		t.Errorf("refusal %q should name the operation that holds the environment", err)
	}

	if _, err := log.begin("upgrade", "two", "flask", 1); err != nil {
		t.Errorf("a different environment should be allowed: %v", err)
	}
}

func TestOpLogReportsWhyARunFailed(t *testing.T) {
	log := newOpLog()

	id, err := log.begin("uninstall", "one", "numpy", 1)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	log.finish(id, errors.New("pip uninstall failed: No such package"))

	op := log.list()[0]
	if !op.Failed {
		t.Error("a failed run should be marked failed")
	}
	if !strings.Contains(op.Message, "No such package") {
		t.Errorf("message = %q, want pip's reason", op.Message)
	}
}

func TestOpLogAdvancesThroughABatch(t *testing.T) {
	log := newOpLog()

	id, err := log.begin("upgrade", "one", "3 packages", 3)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}

	log.step(id, "requests")
	log.step(id, "flask")

	op := log.list()[0]
	if op.Done != 2 || op.Name != "flask" || op.Total != 3 {
		t.Errorf("mid-batch operation = done %d, name %q, total %d", op.Done, op.Name, op.Total)
	}

	log.finish(id, nil)
	if op := log.list()[0]; op.Done != op.Total {
		t.Errorf("finished batch = done %d, want %d", op.Done, op.Total)
	}
}

func TestOpLogBroadcastsNewestFirst(t *testing.T) {
	log := newOpLog()
	var broadcasts int
	log.changed = func([]Op) { broadcasts++ }

	first, err := log.begin("install", "one", "requests", 1)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	log.finish(first, nil)

	second, err := log.begin("install", "two", "flask", 1)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}

	ops := log.list()
	if len(ops) != 2 {
		t.Fatalf("list = %d operations, want 2", len(ops))
	}
	if ops[0].ID != second || ops[1].ID != first {
		t.Errorf("list order = %q, %q; want newest first", ops[0].ID, ops[1].ID)
	}
	if broadcasts < 3 {
		t.Errorf("broadcasts = %d, want one per change at least", broadcasts)
	}
}

func TestOpLogKeepsOnlyTheRecentTail(t *testing.T) {
	log := newOpLog()

	for i := 0; i < opsKept+5; i++ {
		id, err := log.begin("install", "same", "x", 1)
		if err != nil {
			t.Fatalf("begin %d: %v", i, err)
		}
		log.finish(id, nil)
	}

	if got := len(log.list()); got != opsKept {
		t.Errorf("kept %d operations, want %d", got, opsKept)
	}
}

func TestOperationsBindingWorksWithoutAnApplication(t *testing.T) {
	app := &App{}

	if ops := app.Operations(); len(ops) != 0 {
		t.Errorf("Operations() = %v, want none", ops)
	}

	// A record started on a test App must not panic on the application it does
	// not have; emit is nil-safe, and this is the path that proves it.
	run, err := app.beginOp("install", "one", "requests", 1)
	if err != nil {
		t.Fatalf("beginOp: %v", err)
	}
	run.step("requests")
	run.end(nil)

	ops := app.Operations()
	if len(ops) != 1 || ops[0].Running {
		t.Errorf("Operations() = %+v, want one finished operation", ops)
	}
}

// ── the completion event ────────────────────────────────────────────────────

/* recordedEvent is one emit as the frontend would receive it. */
type recordedEvent struct {
	name string
	data []any
}

// recordEvents collects what the webview would be sent, so a test can assert
// the lifecycle without a window.
func recordEvents(app *App) chan recordedEvent {
	events := make(chan recordedEvent, 64)
	app.emitHook = func(name string, data ...any) {
		events <- recordedEvent{name: name, data: data}
	}
	return events
}

func waitFor(t *testing.T, events chan recordedEvent, name string) recordedEvent {
	t.Helper()

	deadline := time.After(5 * time.Second)
	for {
		select {
		case event := <-events:
			if event.name == name {
				return event
			}
		case <-deadline:
			t.Fatalf("no %q event arrived", name)
			return recordedEvent{}
		}
	}
}

func finishedOp(t *testing.T, event recordedEvent) Op {
	t.Helper()

	if len(event.data) != 1 {
		t.Fatalf("%s carried %d payloads, want 1", event.name, len(event.data))
	}
	op, ok := event.data[0].(Op)
	if !ok {
		t.Fatalf("%s payload = %T, want Op", event.name, event.data[0])
	}
	return op
}

/*
The whole point of the event: the binding returns while pip is still running,
so the resolved promise says nothing about the outcome.
*/
func TestRunReturnsBeforeTheWorkDoesAndCompletesByEvent(t *testing.T) {
	app := &App{}
	events := recordEvents(app)

	release := make(chan struct{})
	if err := app.run("install", "one", "requests", 1, func(run *opRun) error {
		run.step("requests")
		<-release
		return nil
	}); err != nil {
		t.Fatalf("run: %v", err)
	}

	if ops := app.Operations(); len(ops) != 1 || !ops[0].Running {
		t.Fatalf("after run, operations = %+v, want one still running", ops)
	}

	close(release)

	op := finishedOp(t, waitFor(t, events, "op:done"))
	if op.Running || op.Failed || op.Done != op.Total {
		t.Errorf("op:done = %+v, want a finished, successful operation", op)
	}
	if op.ID == "" || op.Kind != "install" || op.Env != "one" || op.Name != "requests" {
		t.Errorf("op:done lost the operation's identity: %+v", op)
	}
	if op.Ended == 0 {
		t.Error("op:done has no end timestamp")
	}
}

func TestRunReportsAFailureInTheCompletionEvent(t *testing.T) {
	app := &App{}
	events := recordEvents(app)

	if err := app.run("uninstall", "one", "numpy", 1, func(run *opRun) error {
		run.step("numpy")
		return errors.New("pip uninstall failed: No such package")
	}); err != nil {
		t.Fatalf("run: %v", err)
	}

	op := finishedOp(t, waitFor(t, events, "op:done"))
	if !op.Failed {
		t.Error("a failed run should arrive marked failed")
	}
	if !strings.Contains(op.Message, "No such package") {
		t.Errorf("message = %q, want pip's reason", op.Message)
	}
}

func TestRunRefusesASecondOperationInTheSameEnvironment(t *testing.T) {
	app := &App{}
	events := recordEvents(app)

	release := make(chan struct{})
	if err := app.run("install", "one", "requests", 1, func(*opRun) error {
		<-release
		return nil
	}); err != nil {
		t.Fatalf("first run: %v", err)
	}

	// The refusal is the only thing that still returns through the binding.
	if err := app.run("upgrade", "one", "flask", 1, func(*opRun) error { return nil }); err == nil {
		t.Fatal("a second run in the same environment should be refused")
	}

	close(release)
	waitFor(t, events, "op:done")

	if ops := app.Operations(); len(ops) != 1 {
		t.Errorf("operations = %d, want the refused attempt to leave no record", len(ops))
	}
}

func TestBatchFailuresRideOnTheCompletionEvent(t *testing.T) {
	app := &App{}
	events := recordEvents(app)

	if err := app.runBatch("upgrade", "one", []string{"requests", "flask"}, func(name string) error {
		if name == "flask" {
			return errors.New("pip upgrade failed: no matching distribution")
		}
		return nil
	}); err != nil {
		t.Fatalf("runBatch: %v", err)
	}

	op := finishedOp(t, waitFor(t, events, "op:done"))
	if op.Failed {
		t.Error("a batch that ran to the end is not a failed operation")
	}
	if len(op.Failures) != 1 || !strings.Contains(op.Failures[0], "flask") {
		t.Errorf("failures = %v, want the package that failed", op.Failures)
	}
	if op.Done != 2 || op.Total != 2 {
		t.Errorf("done %d of %d, want 2 of 2", op.Done, op.Total)
	}
}

/*
This is the contract the frontend reads. If a field is renamed, the page that
draws the outcome goes quiet without an error, so the shape is pinned here.
*/
func TestFinishedOperationHasTheFieldsTheFrontendReads(t *testing.T) {
	op := Op{
		ID: "op1", Kind: "upgrade", Env: "py", Target: "2 packages", Name: "flask",
		Total: 2, Done: 2, Failures: []string{"flask — no matching distribution"},
	}

	data, err := json.Marshal(op)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var shape map[string]any
	if err := json.Unmarshal(data, &shape); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	for _, key := range []string{
		"id", "kind", "env", "target", "name", "total", "done",
		"running", "failed", "message", "failures", "started", "ended",
	} {
		if _, ok := shape[key]; !ok {
			t.Errorf("%s is missing from the operation JSON", key)
		}
	}
}
