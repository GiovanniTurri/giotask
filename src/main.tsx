import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = window.localStorage.getItem("theme");
const shouldUseDarkTheme = savedTheme ? savedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", shouldUseDarkTheme);

createRoot(document.getElementById("root")!).render(<App />);
