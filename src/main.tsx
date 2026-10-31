import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { paths } from "./app/routes";
import { applyTheme, readStoredTheme } from "./app/theme";
import { parseSharedContent } from "./features/gifts/shareTarget";
import "./styles/global.css";

// A forced light/dark theme applies before the first render (no flash of the system theme).
applyTheme(readStoredTheme());

// Content shared from another app (manifest share_target) opens quick add prefilled;
// the query is replaced so a reload does not share it again.
const shared = parseSharedContent(window.location.search);
if (shared !== null) {
  window.history.replaceState(null, "", `${window.location.pathname}${paths.quickAdd(undefined, shared)}`);
}

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Kořenový prvek aplikace nebyl nalezen.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
