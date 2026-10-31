import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { applyTheme, readStoredTheme } from "./app/theme";
import "./styles/global.css";

// A forced light/dark theme applies before the first render (no flash of the system theme).
applyTheme(readStoredTheme());

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Kořenový prvek aplikace nebyl nalezen.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
