/* The page table the sidebar and the router share. Pages are React.lazy so the
   initial bundle stays small; each entry carries what the shell needs before
   the page module has loaded: its nav label, its icon, and its heading. */

import { lazy } from "react";

export const PAGES = {
  overview: {
    path: "/",
    label: "Overview",
    icon: "dashboard",
    eyebrow: "Machine",
    title: "Overview",
    needsEnvironment: false,
    Component: lazy(() => import("../pages/Overview.jsx")),
  },
  environments: {
    path: "/environments",
    label: "Environments",
    icon: "hub",
    eyebrow: "Machine",
    title: "Environments",
    needsEnvironment: false,
    Component: lazy(() => import("../pages/Environments.jsx")),
  },
  packages: {
    path: "/packages",
    label: "Packages",
    icon: "inventory_2",
    eyebrow: "Active environment",
    title: "Packages",
    Component: lazy(() => import("../pages/Packages.jsx")),
  },
  search: {
    path: "/search",
    label: "Search PyPI",
    icon: "search",
    eyebrow: "PyPI",
    title: "Search PyPI",
    Component: lazy(() => import("../pages/Search.jsx")),
  },
  updates: {
    path: "/updates",
    label: "Updates",
    icon: "update",
    eyebrow: "Active environment",
    title: "Updates",
    Component: lazy(() => import("../pages/Updates.jsx")),
  },
  cleanup: {
    path: "/cleanup",
    label: "Cleanup",
    icon: "cleaning_services",
    eyebrow: "Active environment",
    title: "Cleanup",
    Component: lazy(() => import("../pages/Cleanup.jsx")),
  },
  history: {
    path: "/history",
    label: "History",
    icon: "history",
    eyebrow: "Record",
    title: "History",
    needsEnvironment: false,
    Component: lazy(() => import("../pages/History.jsx")),
  },
  doctor: {
    path: "/doctor",
    label: "Doctor",
    icon: "health_and_safety",
    eyebrow: "Active environment",
    title: "Doctor",
    Component: lazy(() => import("../pages/Doctor.jsx")),
  },
  settings: {
    path: "/settings",
    label: "Settings",
    icon: "settings",
    eyebrow: "Cokpyt",
    title: "Settings",
    needsEnvironment: false,
    Component: lazy(() => import("../pages/Settings.jsx")),
  },
};

export const NAV = [
  PAGES.overview,
  PAGES.environments,
  PAGES.packages,
  PAGES.search,
  PAGES.updates,
  PAGES.cleanup,
  { label: "System" },
  PAGES.history,
  PAGES.doctor,
  PAGES.settings,
];

const ALL = Object.values(PAGES);

export function routeFor(path) {
  return ALL.find((page) => page.path === path) || PAGES.overview;
}

export function normalisePath(hash) {
  const path = String(hash || "").replace(/^#/, "");
  return ALL.some((page) => page.path === path) ? path : PAGES.overview.path;
}
