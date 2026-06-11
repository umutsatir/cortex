import React from "react";
import ReactDOM from "react-dom/client";
import { startOfWeek } from "date-fns";
import App from "./App";
import "./index.css";
import { applyTheme, useThemeStore } from "./store/themeStore";
import { useGeneralStore } from "./store/generalStore";
import { useTaskStore } from "./store/taskStore";

// Apply saved theme + accent before first render to avoid flash
const { theme, accent } = useThemeStore.getState();
applyTheme(theme, accent);

// Sync generalStore settings to taskStore after persist hydration
const { weekStartsOn, defaultView } = useGeneralStore.getState();
useTaskStore.setState({
  currentView: defaultView,
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn }),
});

// Keep accent in sync with system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme, accent } = useThemeStore.getState();
  applyTheme(theme, accent);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
