import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function filterRequestHeaders(headers: Headers) {
  const out = new Headers(headers);
  out.delete("host");
  out.delete("connection");
  out.delete("content-length");
  return out;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  const upstreamBase = (process.env.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const upstreamPath = path.map(encodeURIComponent).join("/");

  const url = new URL(`${upstreamBase}/${upstreamPath}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: filterRequestHeaders(req.headers),
    redirect: "manual",
    cache: "no-store",
  };

  if (hasBody) {
    init.body = req.body;
    init.duplex = "half"; // required for streaming body in Node/undici
  }

  const upstreamRes = await fetch(url, init);

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
