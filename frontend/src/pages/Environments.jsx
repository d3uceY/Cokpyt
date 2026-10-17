/* Environments — the page the rest of the app is built around.

   `pip list` answers for one interpreter. A machine with a launcher, a couple
   of runtimes and a few project venvs has several answers, and the one pip
   happens to give you is usually the least interesting. This page is that list. */

import { useState } from "react";
import { api } from "../api.js";
import { useApp } from "../app/AppProvider.jsx";
import { useNotify } from "../app/ToastProvider.jsx";
import { PAGES } from "../app/routes.js";
import { EnvironmentsTable } from "../components/EnvironmentsTable.jsx";
import { PageShell } from "../components/PageShell.jsx";
import { totalPackages } from "../lib/env.js";
import { Button, Icon, Note, Panel } from "../ui/components.jsx";

const page = PAGES.environments;

export default function Environments() {
  const { state, scanFolder } = useApp();
  const notify = useNotify();
  const [scanning, setScanning] = useState(false);

  async function pickFolder() {
    const folder = await api.chooseFolder().catch(() => "");
    if (!folder) return;

    setScanning(true);
    try {
      const found = await scanFolder(folder);
      notify(
        found.length
          ? `Found ${found.length} environment${found.length === 1 ? "" : "s"} in ${folder}.`
          : `No environments in ${folder}.`,
        found.length ? "ok" : "warn",
      );
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setScanning(false);
    }
  }

  return (
    <PageShell
      eyebrow={page.eyebrow}
      title={page.title}
      subtitle="Every Python environment found."
      actions={
        <Button busy={scanning} onClick={pickFolder}>
          <Icon name="folder_open" size={14} />
          Scan a folder
        </Button>
      }
    >
      <div className="stack">
        {state.notes.length > 0 ? (
          <div className="stack">
            {state.notes.map((text, index) => (
              <Note key={index}>{text}</Note>
            ))}
          </div>
        ) : null}

        <Panel
          title="Found on this machine"
          actions={
            <span className="eyebrow">
              {state.envs.length} environments · {totalPackages(state.counts)} packages
            </span>
          }
        >
          <EnvironmentsTable expand />
        </Panel>
      </div>
    </PageShell>
  );
}
