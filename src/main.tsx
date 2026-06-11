import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, useThemeStore } from "./store/themeStore";

// Apply saved theme before first render to avoid flash
applyTheme(useThemeStore.getState().theme);

// Keep in sync with system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  applyTheme(useThemeStore.getState().theme);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
