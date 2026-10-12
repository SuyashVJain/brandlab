/**
 * The participant's own email and code, remembered in THIS browser so the
 * submit page can pre-fill them (localStorage key "bl_participant").
 * Only those two values, exactly as the participant entered them, and only on
 * their device. Nothing here is trusted: the server still verifies the pair.
 *
 * Every access is wrapped, so a browser that blocks storage (private mode,
 * strict settings) simply behaves as if nothing was saved.
 * Browser only: call these from event handlers or after mount.
 */

export type SavedParticipant = { email: string; code: string };

const STORAGE_KEY = "bl_participant";
const listeners = new Set<() => void>();

/** Raw stored text, or null when nothing is saved or storage is unavailable. */
export function readParticipantRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseParticipant(raw: string | null): SavedParticipant | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SavedParticipant>;
    return typeof value.email === "string" && typeof value.code === "string" && value.email && value.code
      ? { email: value.email, code: value.code }
      : null;
  } catch {
    return null;
  }
}

export function saveParticipant(participant: SavedParticipant) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: participant.email, code: participant.code }));
  } catch {
    // Storage blocked or full: nothing is remembered, and nothing breaks.
  }
  listeners.forEach((notify) => notify());
}

export function clearParticipant() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove.
  }
  listeners.forEach((notify) => notify());
}

/** For useSyncExternalStore: re-read when this tab (or another one) changes the saved details. */
export function subscribeParticipant(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}
