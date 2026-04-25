import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = window.localStorage.getItem("theme");
const shouldUseDarkTheme = savedTheme ? savedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", shouldUseDarkTheme);

// Register service worker for local notifications.
// Skipped inside the Lovable preview iframe (and on lovable preview hosts)
// to avoid cache/navigation issues during editing.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    // Clean up any previously registered SW in preview/iframe contexts
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
