// Raw brand palette — identical to the landing page (Colors.png). Components never import this
// directly; they read semantic roles from `useTheme()`. Brand art (stripes, card faces) may.
export const palette = {
  paper: "#fbf8f5",
  purple: { 50: "#f0e7f7", 100: "#d1b4e5", 200: "#ba90d9", 300: "#9b5dc7", 400: "#873dbd", 500: "#690dac", 600: "#600c9d", 700: "#4b097a", 800: "#3a075f", 900: "#2c0548" },
  orange: { 50: "#ffefe9", 100: "#ffceba", 200: "#ffb798", 300: "#ff966a", 400: "#ff814d", 500: "#ff6220", 600: "#e8591d", 700: "#b54617", 800: "#8c3612", 900: "#6b290d" },
  ink: { 50: "#ededed", 100: "#c7c7c7", 200: "#acacac", 300: "#868686", 400: "#6f6e6e", 500: "#4b4a4a", 600: "#444343", 700: "#353535", 800: "#292929", 900: "#201f1f" },
  success: { 50: "#eaf6ed", 300: "#71c185", 500: "#2ba349", 600: "#279442", 900: "#12441f" },
  error: { 50: "#ffe8e8", 400: "#ff4747", 600: "#e81717", 900: "#6b0b0b" },
  warning: { 50: "#fffbeb", 300: "#ffe678", 500: "#ffda35", 700: "#b59b26" },
  blue: { 500: "#0095ff", 700: "#006ab5" },
  white: "#ffffff",
  black: "#000000",
} as const;
