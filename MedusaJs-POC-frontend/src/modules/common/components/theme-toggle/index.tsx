"use client"

import { useTheme } from "@lib/context/theme-context"
import ThemeToggleIcon from "@modules/common/icons/theme-toggle"

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-grey-10 dark:hover:bg-grey-70 transition-all duration-200 group relative"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <ThemeToggleIcon
          size="20"
          isDark={isDark}
          className={`text-grey-70 dark:text-grey-20 transition-all duration-500 ease-in-out ${
            isDark ? "rotate-0 scale-100" : "rotate-12 scale-100"
          } group-hover:scale-110`}
        />
      </div>
    </button>
  )
}

export default ThemeToggle

