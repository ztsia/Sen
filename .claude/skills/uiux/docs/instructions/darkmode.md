# Dark mode

**This app follows the phone.** Light and dark switch when Android switches, live. Settings offers
*System* (the default), *Light* and *Dark*. Adapted from shadcn's Vite guide
(ui.shadcn.com/docs/dark-mode/vite), with two changes:

- **The guide reads the phone's setting only once, at start.** This version listens for changes,
  so the app flips the moment the phone does, such as when dark mode turns on at sunset.
- **The Android status bar follows the theme too**, through the shell's status bar plugin.

## The provider

`components/theme-provider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
      // The shell's status bar plugin is called here, so the status bar matches (D42).
    }

    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setTheme(next)
    },
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
```

## Wrap the app

```tsx
import { ThemeProvider } from "@/components/theme-provider"

export function App() {
  return <ThemeProvider defaultTheme="system">{/* routes */}</ThemeProvider>
}
```

## The setting

In Settings, use a three-way choice (`ToggleGroup` or `RadioGroup`): *System*, *Light* and *Dark*.
There's no toggle button in a header: the phone decides unless you override it here.

## Rules

- Every colour is a semantic token, defined for both `:root` and `.dark` (`theming.md`). A raw colour
  is a bug, because it breaks in one of the two modes.
- The money tokens (money in, money out, pending, warning) and the chart palette are checked for
  contrast in both modes before they ship.
- Avoid a flash of the wrong theme on start: set the class in a tiny inline script in `index.html`,
  before React loads, using the same storage key.
