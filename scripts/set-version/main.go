// Command set-version writes one release tag into every file that carries the
// app version, so the tag is the only place the version is typed by hand.
//
//	go run ./scripts/set-version v0.4.0
//
// The release workflow runs it on the tag push: once in each build job before
// compiling, and once on the default branch so the committed metadata matches
// the release that was just cut.
package main

import (
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// versionTag matches the tags the release workflow fires on and captures the
// version without the leading v, which is the form the metadata files want.
var versionTag = regexp.MustCompile(`^v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?)$`)

// rule is one substitution inside a file. A pattern with capture groups keeps
// its surroundings (format uses ${1} and ${2}); a pattern that matches the
// whole line has none and format writes the line itself.
type rule struct {
	pattern string
	format  string // printf template, %s is the version
	tag     bool   // use the tag ("v0.4.0") instead of the bare version
}

type target struct {
	path  string
	rules []rule
}

func plistRules() []rule {
	return []rule{
		{pattern: `(<key>CFBundleShortVersionString</key>\s*<string>)[^<]*(</string>)`, format: `${1}%s${2}`},
		{pattern: `(<key>CFBundleVersion</key>\s*<string>)[^<]*(</string>)`, format: `${1}%s${2}`},
	}
}

// targets is every committed file the version appears in. A missing file or a
// pattern that no longer matches is a hard error, never a silent skip: a
// packaged installer with a stale version is worse than a failed release.
var targets = []target{
	{"main.go", []rule{
		{pattern: `(?m)^(?:var|const) Version = "[^"]*"`, format: `var Version = "%s"`, tag: true},
	}},
	{"wails.json", []rule{
		{pattern: `("productVersion"\s*:\s*")[^"]*(")`, format: `${1}%s${2}`},
	}},
	{"build/config.yml", []rule{
		{pattern: `(?m)^(  version: ")[^"]*(")`, format: `${1}%s${2}`},
	}},
	{"build/darwin/Info.plist", plistRules()},
	{"build/darwin/Info.dev.plist", plistRules()},
	{"build/windows/info.json", []rule{
		{pattern: `("file_version"\s*:\s*")[^"]*(")`, format: `${1}%s${2}`},
		{pattern: `("ProductVersion"\s*:\s*")[^"]*(")`, format: `${1}%s${2}`},
	}},
	{"build/windows/wails.exe.manifest", []rule{
		// Scoped to Cokpyt's own identity: the Common-Controls dependency
		// below it has a version attribute of its own that must not move.
		{pattern: `(name="io\.github\.d3ucey\.cokpyt"\s+version=")[^"]*(")`, format: `${1}%s${2}`},
	}},
	{"build/windows/nsis/wails_tools.nsh", []rule{
		{pattern: `(!define INFO_PRODUCTVERSION ")[^"]*(")`, format: `${1}%s${2}`},
	}},
}

func main() {
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, "usage: go run ./scripts/set-version v0.4.0")
	}
	flag.Parse()
	if flag.NArg() != 1 {
		flag.Usage()
		os.Exit(2)
	}

	tag := strings.TrimSpace(flag.Arg(0))
	match := versionTag.FindStringSubmatch(tag)
	if match == nil {
		fail("%q is not a version tag (want vMAJOR.MINOR.PATCH, optionally with a -suffix)", tag)
	}
	bare := match[1]

	for _, t := range targets {
		stamp(t, tag, bare)
	}
	fmt.Printf("version %s stamped into %d files\n", tag, len(targets))
}

func stamp(t target, tag, bare string) {
	src, err := os.ReadFile(t.path)
	if err != nil {
		fail("%v", err)
	}

	out := string(src)
	for _, r := range t.rules {
		re := regexp.MustCompile(r.pattern)
		if n := len(re.FindAllStringIndex(out, -1)); n != 1 {
			fail("%s: %q matches %d times, want exactly 1", t.path, r.pattern, n)
		}
		v := bare
		if r.tag {
			v = tag
		}
		out = re.ReplaceAllString(out, fmt.Sprintf(r.format, v))
	}

	if out == string(src) {
		return
	}
	if err := os.WriteFile(t.path, []byte(out), 0o644); err != nil {
		fail("%v", err)
	}
	fmt.Println("  updated", t.path)
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "set-version: "+format+"\n", args...)
	os.Exit(1)
}
