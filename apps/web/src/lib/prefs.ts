/** Per-device preferences and hints. Every read/write tolerates blocked storage. */
export const PREF = {
  text: 'rk-text',
  contrast: 'rk-contrast',
  cookie: 'rk-cookie-ok',
  signedIn: 'rk-signed-in',
  /** The organization last chosen in the account menu (one account may belong to several). */
  org: 'rk-org',
} as const;

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/** Text-size steps offered by the accessibility tools (percent of the browser default). */
export const TEXT_STEPS = [87.5, 100, 112.5, 125, 137.5] as const;
