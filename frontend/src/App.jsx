/* The shell: the sidebar, the page out of the hash router, the status bar, and
   the toast list.

   Everything that outlives a page lives in a provider (see app/), so this
   component only routes and lays out. */

import { Suspense, useEffect, useState } from "react";
import { useApp } from "./app/AppProvider.jsx";
import { normalisePath, routeFor } from "./app/routes.js";
import { IconSprite } from "./components/IconSprite.jsx";
import { PageShell } from "./components/PageShell.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { StatusBar } from "./components/StatusBar.jsx";
import { Toaster } from "./components/Toaster.jsx";
import { ErrorNote, Loading, ScanningBlock } from "./ui/components.jsx";

export default function App() {
  const { state, activeEnv, refreshOperations } = useApp();
  const [path, setPath] = useState(() => normalisePath(window.location.hash));
  const page = routeFor(path);
  const Page = page.Component;

  useEffect(() => {
    const onHashChange = () => setPath(normalisePath(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /* The App's record is the authority on what is running, and re-reading it
     whenever the page changes is what keeps a run that finished while an event
     was missed from leaving a spinner on screen for ever. */
  useEffect(() => {
    if (!state.ready) return;
    refreshOperations().catch(() => {});
  }, [path, state.ready, refreshOperations]);

  if (!state.ready) return null;

  const missingEnvironment = page.needsEnvironment !== false && !activeEnv;

  return (
    <>
      <IconSprite />
      <Sidebar path={path} />

      <main className="main">
        {missingEnvironment ? (
          <PageShell eyebrow={page.eyebrow} title={page.title}>
            {state.scanning ? (
              <ScanningBlock message={state.scanMessage} />
            ) : (
              <ErrorNote>
                No Python environment found. Install Python, or use “Scan a folder” on Environments to
                point Cokpyt at a project that has a venv.
              </ErrorNote>
            )}
          </PageShell>
        ) : (
          <Suspense
            fallback={
              <PageShell eyebrow={page.eyebrow} title={page.title}>
                <Loading />
              </PageShell>
            }
          >
            <Page key={page.path} />
          </Suspense>
        )}

        <StatusBar />
      </main>

      <Toaster />
    </>
  );
}
