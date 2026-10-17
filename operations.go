package main

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

// Op is one pip run that changes an environment.
//
// The frontend deliberately does not own this state: a page is torn down when
// the user navigates, and with it every spinner and disabled button it drew.
// The App keeps the record instead, so the page the user comes back to can ask
// what is still running before it paints, and the status bar can say so while
// they are somewhere else.
type Op struct {
	ID       string   `json:"id"`
	Kind     string   `json:"kind"`   // install, uninstall, upgrade, cleanup
	Env      string   `json:"env"`    // interpreter path the work runs against
	Target   string   `json:"target"` // what the user asked for, for the banner
	Name     string   `json:"name"`   // package being changed right now, when there is one
	Total    int      `json:"total"`  // steps in the batch; 1 for a single action
	Done     int      `json:"done"`   // steps started so far
	Running  bool     `json:"running"`
	Failed   bool     `json:"failed"`
	Message  string   `json:"message"`            // why it failed, as the caller was told
	Failures []string `json:"failures,omitempty"` // packages a batch could not change
	Started  int64    `json:"started"`            // unix milliseconds
	Ended    int64    `json:"ended"`
}

// opsKept is how many finished operations are remembered. The UI only draws
// the running ones; the tail exists so a page that arrives just after the end
// still sees the outcome instead of a gap.
const opsKept = 12

// opLog is the App's record of operations in flight and the ones that finished
// most recently.
type opLog struct {
	mu      sync.Mutex
	seq     int
	order   []string // oldest first
	ops     map[string]*Op
	changed func([]Op) // the whole record, whenever it moves
	done    func(Op)   // one finished operation, with its outcome
}

func newOpLog() *opLog { return &opLog{ops: make(map[string]*Op)} }

// begin registers an operation. A second one for the same environment is
// refused: pip writes to one site-packages tree at a time, and two runs
// racing there fail in ways that look like a broken install.
func (l *opLog) begin(kind, env, target string, total int) (string, error) {
	if total < 1 {
		total = 1
	}

	l.mu.Lock()
	for _, id := range l.order {
		if op := l.ops[id]; op.Running && op.Env == env {
			blocking := op.Kind
			l.mu.Unlock()
			return "", fmt.Errorf("another operation (%s) is still running in this environment", blocking)
		}
	}

	l.seq++
	id := fmt.Sprintf("op%d", l.seq)
	l.ops[id] = &Op{
		ID:      id,
		Kind:    kind,
		Env:     env,
		Target:  target,
		Total:   total,
		Running: true,
		Started: time.Now().UnixMilli(),
	}
	l.order = append(l.order, id)
	l.trimLocked()

	snapshot := l.snapshotLocked()
	l.mu.Unlock()
	l.notify(snapshot)
	return id, nil
}

// step names the work in flight. For a batch that is the package being
// changed; for a single action it is what the user asked for.
func (l *opLog) step(id, name string) {
	l.mu.Lock()
	if op := l.ops[id]; op != nil {
		op.Name = name
		if op.Done < op.Total {
			op.Done++
		}
	}
	snapshot := l.snapshotLocked()
	l.mu.Unlock()
	l.notify(snapshot)
}

// finish closes the record with the outcome of the work. The list is broadcast
// first so the frontend's state is current, and the finished operation goes out
// after it: that event is the only report of success or failure the caller gets,
// because the binding returned when the work started.
func (l *opLog) finish(id string, err error) {
	l.mu.Lock()
	var finished Op
	found := false
	if op := l.ops[id]; op != nil {
		op.Running = false
		op.Ended = time.Now().UnixMilli()
		if err != nil {
			op.Failed = true
			op.Message = err.Error()
		} else {
			op.Done = op.Total
		}
		finished = *op
		finished.Failures = append([]string(nil), op.Failures...)
		found = true
	}
	snapshot := l.snapshotLocked()
	l.mu.Unlock()
	l.notify(snapshot)
	if found {
		l.announceDone(finished)
	}
}

// fail records one package in a batch that could not be changed. The batch
// carries on; the list travels with the finished operation.
func (l *opLog) fail(id, reason string) {
	l.mu.Lock()
	if op := l.ops[id]; op != nil {
		op.Failures = append(op.Failures, reason)
	}
	l.mu.Unlock()
}

// list is every remembered operation, newest first.
func (l *opLog) list() []Op {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.snapshotLocked()
}

func (l *opLog) snapshotLocked() []Op {
	out := make([]Op, 0, len(l.order))
	for i := len(l.order) - 1; i >= 0; i-- {
		if op := l.ops[l.order[i]]; op != nil {
			out = append(out, *op)
		}
	}
	return out
}

// trimLocked drops the oldest finished records. A running operation is never
// dropped, however old it is.
func (l *opLog) trimLocked() {
	for len(l.order) > opsKept {
		oldest := l.ops[l.order[0]]
		if oldest != nil && oldest.Running {
			return
		}
		delete(l.ops, l.order[0])
		l.order = l.order[1:]
	}
}

func (l *opLog) notify(list []Op) {
	if l.changed != nil {
		l.changed(list)
	}
}

func (l *opLog) announceDone(op Op) {
	if l.done != nil {
		l.done(op)
	}
}

// ── wiring into the App ──────────────────────────────────────────────────────

// operationsLog starts the tracker on first use, so an App built by a test
// with no application behind it still records operations.
func (a *App) operationsLog() *opLog {
	a.opsOnce.Do(func() {
		log := newOpLog()
		log.changed = func(list []Op) { a.emit("ops:changed", list) }
		log.done = func(op Op) { a.emit("op:done", op) }
		a.ops = log
	})
	return a.ops
}

// run starts an operation and returns as soon as the App has accepted it. The
// outcome arrives as an op:done event rather than as the return value of the
// binding: a pip run outlives the call that started it, and the page that made
// the call may be gone by the time pip is. Only a refusal to start (an unknown
// interpreter, an environment that is already busy) comes back here.
func (a *App) run(kind, env, target string, total int, work func(*opRun) error) error {
	run, err := a.beginOp(kind, env, target, total)
	if err != nil {
		return err
	}
	go func() {
		run.end(work(run))
	}()
	return nil
}

// runBatch starts one operation that walks several packages. A package that
// fails does not abandon the rest of the batch; the failures travel with the
// finished operation, because there is no return value to carry them.
func (a *App) runBatch(kind, env string, names []string, work func(string) error) error {
	return a.run(kind, env, batchLabel(names), len(names), func(run *opRun) error {
		for _, name := range names {
			run.step(name)
			if err := work(name); err != nil {
				run.fail(name, err)
			}
		}
		return nil
	})
}

// opRun is the handle a tracked operation carries while it runs.
type opRun struct {
	log *opLog
	id  string
}

func (r *opRun) step(name string) { r.log.step(r.id, name) }

// fail records one package in a batch that could not be changed.
func (r *opRun) fail(name string, err error) {
	r.log.fail(r.id, fmt.Sprintf("%s — %s", name, strings.TrimPrefix(err.Error(), "pip ")))
}

// end closes the record and hands the same error back to the caller.
func (r *opRun) end(err error) error {
	r.log.finish(r.id, err)
	return err
}

// beginOp starts the record for a mutating call. The environment is the
// resolved interpreter path, not what the caller passed in.
func (a *App) beginOp(kind, env, target string, total int) (*opRun, error) {
	log := a.operationsLog()
	id, err := log.begin(kind, env, target, total)
	if err != nil {
		return nil, err
	}
	return &opRun{log: log, id: id}, nil
}

// Operations is every operation in flight, newest first, plus the handful that
// finished most recently. Every page asks for it when it mounts: the work a
// page started outlives the page itself, and the loading state has to come
// back with it.
func (a *App) Operations() []Op { return a.operationsLog().list() }
