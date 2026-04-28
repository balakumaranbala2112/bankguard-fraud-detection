// src/shared/contexts/ThemeContext.jsx — F24: Dark Mode

import { createContext, useContext } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Hardcoded to false to completely disable dark mode functionality.
  return (
    <ThemeContext.Provider value={{ isDark: false, toggleDark: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
