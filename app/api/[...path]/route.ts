import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * We proxy:
 *   browser -> /api/<path>
 * to:
 *   local dev -> http://127.0.0.1:8000/api/<path>
 *   vercel    -> <same-origin>/api/backend/api/<path>
 */
function getUpstreamBase(req: NextRequest): string {
  const envBase = process.env.API_BASE_URL || process.env.FASTAPI_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  return req.nextUrl.origin.replace(/\/$/, "") + "/api/backend";
}

function buildUpstreamUrl(req: NextRequest, pathParts: string[]) {
  const upstreamBase = getUpstreamBase(req);
  const upstreamPath = pathParts.map(encodeURIComponent).join("/");
  const url = new URL(`${upstreamBase}/api/${upstreamPath}`);

  // Preserve query string
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

  // Guard: if someone accidentally calls /api/api/..., strip the leading "api"
  const normalizedPath = path[0] === "api" ? path.slice(1) : path;

  const upstreamUrl = buildUpstreamUrl(req, normalizedPath);

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: filterRequestHeaders(req.headers),
    redirect: "manual",
    cache: "no-store",
  };

  if (hasBody) {
    // Node fetch requires duplex when streaming a body (undici).
    init.body = req.body;
    init.duplex = "half";
  }

  const upstreamRes = await fetch(upstreamUrl, init);
  const resHeaders = new Headers(upstreamRes.headers);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
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
