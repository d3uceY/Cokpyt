/* Pure helpers over the environment list. Nothing here holds state. */

/* envName is how an environment is referred to in prose and in the picker.
   A runtime's label already carries its version ("Python 3.14.3"); a venv's
   does not ("tts/.venv"), so the version is only appended when it adds
   something. */
export function envName(env) {
  if (!env) return "";
  if (!env.version || env.label.includes(env.version)) return env.label;
  return `${env.label} (${env.version})`;
}

/* activeEnv prefers the picker's choice and falls back to the first one found,
   so a page never has to reason about an empty selection. */
export function activeEnvironment(state) {
  return state.envs.find((env) => env.python === state.active) || state.envs[0] || null;
}

export function totalPackages(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export function environmentsWithPackages(state) {
  return state.envs.filter((env) => (state.counts[env.python] || 0) > 0).length;
}

/* pip treats "PyYAML" and "pyyaml" as the same project. PEP 503 collapses a
   run of -_. to a single dash, so this has to be a run replacement and not a
   character replacement: "zope..if" is "zope-if", not "zope--if". */
export function normalise(name) {
  return String(name)
    .toLowerCase()
    .replace(/[-_.]+/g, "-");
}
