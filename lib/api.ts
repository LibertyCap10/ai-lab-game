const isDev = process.env.NODE_ENV !== "production";

/**
 * dev: browser -> /_proxy/* (Next route handler) -> http://127.0.0.1:8000/*
 * prod: browser -> /api/* (served by python on Vercel, once we wire that up)
 */
export const API_BASE = isDev ? "/_proxy" : "/api";

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(joinUrl(API_BASE, path), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload?: unknown): Promise<T> {
  const res = await fetch(joinUrl(API_BASE, path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}
