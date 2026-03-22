import { CalendarDays, CheckSquare, Settings, Sparkles, Moon, Sun, Shield, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const links = [
  { to: "/", icon: CheckSquare, label: "Tasks" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/privacy", icon: Shield, label: "Privacy Policy" },
  { to: "/terms", icon: FileText, label: "Terms of Service" },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // Init from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDark(true);
    else if (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
  }, []);

  return [dark, () => setDark((d) => !d)] as const;
}

export function AppSidebar() {
  const [dark, toggleDark] = useDarkMode();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-16 flex-col items-center bg-sidebar-background border-r border-sidebar-border py-6 gap-2 lg:w-56 lg:items-start lg:px-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="hidden lg:block font-bold text-sidebar-foreground text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          TaskFlow
        </span>
      </div>

      <nav className="flex flex-col gap-1 w-full flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground"
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={toggleDark}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
        <span className="hidden lg:block">{dark ? "Light Mode" : "Dark Mode"}</span>
      </button>
    </aside>
  );
}