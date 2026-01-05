"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from what the inline script set (or default to light)
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "light"
    const stored = localStorage.getItem("medusa-theme") as Theme | null
    if (stored) return stored
    // Check if dark class is already applied (by inline script)
    if (document.documentElement.classList.contains("dark")) return "dark"
    // Fallback to system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
  }

  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    // Sync with what might have been set by the inline script
    const stored = localStorage.getItem("medusa-theme") as Theme | null
    const currentClassTheme = document.documentElement.classList.contains("dark") ? "dark" : "light"
    
    if (stored && stored !== currentClassTheme) {
      // If localStorage has a different theme than what's applied, apply it
      setThemeState(stored)
      applyTheme(stored)
    } else if (!stored && currentClassTheme !== theme) {
      // If no stored theme but class is different, sync state
      setThemeState(currentClassTheme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("medusa-theme", newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
  }

  // Always provide the context, even before mount
  // The inline script in layout.tsx handles the initial theme to prevent flash
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

