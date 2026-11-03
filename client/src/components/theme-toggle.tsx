"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle() { const { theme, setTheme } = useTheme(); return <button className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>; }
