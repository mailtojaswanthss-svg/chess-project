import { useCallback, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
export type BoardTheme = "green" | "walnut" | "ocean";

const THEME_KEY = "chesswise.theme";
const BOARD_KEY = "chesswise.board-theme";

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private window): the choice still applies for this visit
  }
};

/** Light/dark preference and board colours, mirrored onto <html> as data attributes. */
export function useAppearance() {
  const [theme, setThemeState] = useState<ThemePref>(() => read(THEME_KEY, ["system", "light", "dark"] as const, "system"));
  const [board, setBoardState] = useState<BoardTheme>(() => read(BOARD_KEY, ["green", "walnut", "ocean"] as const, "green"));
  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (board === "green") root.removeAttribute("data-board");
    else root.setAttribute("data-board", board);
  }, [board]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    write(THEME_KEY, t);
  }, []);

  const setBoard = useCallback((b: BoardTheme) => {
    setBoardState(b);
    write(BOARD_KEY, b);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);
  return { theme, setTheme, board, setBoard, isDark };
}
