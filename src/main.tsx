import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Kořenový prvek aplikace nebyl nalezen.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
