import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Local dev:
 *   API_BASE_URL=http://127.0.0.1:8000
 *
 * Single Vercel deployment:
 *   leave API_BASE_URL unset -> proxy to same-origin /backend (vercel.json rewrite -> python function)
 */
function getUpstreamBase(req: NextRequest): string {
  const envBase = process.env.API_BASE_URL || process.env.FASTAPI_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  return req.nextUrl.origin.replace(/\/$/, "") + "/backend";
}

function buildUpstreamUrl(req: NextRequest, pathParts: string[]) {
  const upstreamBase = getUpstreamBase(req);

  // If someone accidentally calls /api/api/..., strip the leading "api"
  const normalized = pathParts[0] === "api" ? pathParts.slice(1) : pathParts;

  const upstreamPath = normalized.map(encodeURIComponent).join("/");
  const url = new URL(`${upstreamBase}/api/${upstreamPath}`);

  // preserve query string
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));
  return url;
}

function filterRequestHeaders(headers: Headers) {
  const out = new Headers(headers);
  out.delete("host");
  out.delete("connection");
  out.delete("content-length");
  return out;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const upstreamUrl = buildUpstreamUrl(req, path);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: filterRequestHeaders(req.headers),
    redirect: "manual",
    cache: "no-store",
  };

  if (hasBody) {
    // Node/undici requires duplex when streaming a body
    init.body = req.body;
    init.duplex = "half";
  }

  const upstreamRes = await fetch(upstreamUrl, init);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: upstreamRes.headers,
  });
}

export async function GET(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
