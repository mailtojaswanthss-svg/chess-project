/** Where the app looks for the FastAPI engine server, and the saved "Connect my engine" choice. */

const ENGINE_URL_KEY = "chesswise.engine-url";

/** The address people type in most: the server started by start-chesswise.bat on this PC */
export const LOCAL_ENGINE_URL = "http://localhost:8000";

/**
 * The built-in address. VITE_API_URL wins when set. Otherwise a copy opened on this
 * machine or the home network talks to port 8000 on the same host (so phones on the
 * Wi-Fi reach the PC, not themselves), and a public copy uses a same-origin path that
 * isn't there, which puts the app in its calm offline mode.
 */
export function defaultApiUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const { hostname, protocol } = window.location;
  const isPrivate =
    protocol === "file:" ||
    hostname === "" ||
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    /^(127|10)\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  return isPrivate ? `http://${hostname || "127.0.0.1"}:8000` : "/api";
}

/** The engine address saved in this browser, if the player connected one. */
export function savedEngineUrl(): string | null {
  try {
    return localStorage.getItem(ENGINE_URL_KEY);
  } catch {
    return null;
  }
}

export function saveEngineUrl(url: string | null): void {
  try {
    if (url) localStorage.setItem(ENGINE_URL_KEY, url);
    else localStorage.removeItem(ENGINE_URL_KEY);
  } catch {
    // Storage blocked (private window): the choice lasts for this visit only
  }
}

export function initialApiUrl(): string {
  return savedEngineUrl() ?? defaultApiUrl();
}

/**
 * Turns what the player typed ("localhost:8000", "192.168.1.5:8000/") into a clean
 * origin-style URL, or null when it isn't an http(s) address.
 */
export function normalizeEngineUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}
