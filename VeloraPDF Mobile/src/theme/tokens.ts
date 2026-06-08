export const darkTheme = {
  mode: "dark",
  app: "#050506",
  workspace: "#09090B",
  surface: "#151518",
  elevated: "#1D1D22",
  toolbar: "#202027",
  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  border: "rgba(255,255,255,0.10)",
  accent: "#6657FF",
  accent2: "#9B6CFF",
  accentGlow: "rgba(101, 87, 255, 0.35)",
  canvas: "#24242B",
  eye: "#11100D",
  pageTint: "rgba(246, 241, 232, 0.16)"
};

export const lightTheme = {
  mode: "light",
  app: "#F7F7FA",
  workspace: "#ECECF1",
  surface: "#FFFFFF",
  elevated: "#F4F4F7",
  toolbar: "#FFFFFF",
  text: "#0E0E12",
  textMuted: "#666A73",
  border: "rgba(15, 15, 20, 0.10)",
  accent: "#5B4DFF",
  accent2: "#8D5CFF",
  accentGlow: "rgba(91, 77, 255, 0.24)",
  canvas: "#ECECF1",
  eye: "#F6F1E8",
  pageTint: "rgba(246, 241, 232, 0.35)"
};

export const annotationColors = {
  yellow: "#FFE66D",
  green: "#89F7B4",
  purple: "#C7B7FF",
  pink: "#FFB5D8",
  blue: "#A7D8FF",
  inkDark: "#171717",
  inkPurple: "#6657FF",
  inkRed: "#FF5B5B"
};

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export function getTheme(mode: ResolvedTheme, eyeProtection = false) {
  const theme = mode === "dark" ? darkTheme : lightTheme;
  return {
    ...theme,
    workspace: eyeProtection ? theme.eye : theme.workspace,
    canvas: eyeProtection ? theme.eye : theme.canvas
  };
}
