const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const PUBLIC_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
export const API_BASE_URL = (process.env.API_BASE_URL ?? PUBLIC_API_BASE_URL).replace(/\/$/, "");

export type ApiList<T> = {
  total: number;
  limit: number;
  offset: number;
  items: T[];
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      next: { revalidate: 30, ...init?.next },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `API request failed: ${response.status}`,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : "API is unavailable",
    };
  }
}
