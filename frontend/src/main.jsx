import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AppProvider } from "./app/AppProvider.jsx";
import { DataProvider } from "./app/DataProvider.jsx";
import { DialogProvider } from "./app/DialogProvider.jsx";
import { ToastProvider } from "./app/ToastProvider.jsx";
import "./styles/app.css";

/* Provider order is the dependency order: toasts are the only thing the app
   reports through, the data layer is what the app invalidates, and dialogs are
   independent of both. */
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <AppProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </AppProvider>
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
);
