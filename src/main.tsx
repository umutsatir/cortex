import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, useThemeStore } from "./store/themeStore";

// Apply saved theme + accent before first render to avoid flash
const { theme, accent } = useThemeStore.getState();
applyTheme(theme, accent);

// Keep in sync with system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme, accent } = useThemeStore.getState();
  applyTheme(theme, accent);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
