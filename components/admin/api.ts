/** Small fetch wrapper for the staff-only API routes used by the admin tabs. */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function callApi<T>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401) {
      // Session ended: a full page load back to the login page, so no signed-in state lingers.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation
      window.location.assign("/admin/login");
      return { ok: false, status: 401, error: "Your session has ended. Please sign in again." };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, status: response.status, error: data.error ?? "That did not work. Please try again." };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection." };
  }
}
