import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Better Auth CSRF compares Origin to a static allow-list. Published hosts
 * (*.vercel.app) are same-origin with this app but not always listed, which
 * produced "Invalid origin". Relabel Origin only after confirming it matches
 * this request's Host. Do not consume the body — Vercel/Nitro locks it.
 */
const ALWAYS_TRUSTED_ORIGIN = "http://localhost:8080";

function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "";
  }
}

function alreadyTrusted(origin: string): boolean {
  const host = hostnameOf(origin);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "grok-sandbox.com" ||
    host.endsWith(".grok-sandbox.com")
  );
}

function requestServerOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostHeader = forwardedHost || request.headers.get("host") || "";
  const requestUrl = new URL(request.url);
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  if (!hostHeader) return requestUrl.origin;
  try {
    return new URL(`${proto}://${hostHeader}`).origin;
  } catch {
    return requestUrl.origin;
  }
}

function alignSameOriginCsrf(request: Request): Request {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return request;
  }

  const rawOrigin = request.headers.get("origin") || "";
  if (!rawOrigin || rawOrigin === "null") return request;

  let clientOrigin: string;
  try {
    clientOrigin = new URL(rawOrigin).origin;
  } catch {
    return request;
  }

  if (alreadyTrusted(clientOrigin)) return request;

  const serverOrigin = requestServerOrigin(request);
  const requestOrigin = new URL(request.url).origin;
  const sameOrigin = clientOrigin === serverOrigin || clientOrigin === requestOrigin;
  if (!sameOrigin) return request;

  const headers = new Headers(request.headers);
  headers.set("origin", ALWAYS_TRUSTED_ORIGIN);
  try {
    return new Request(request, { headers, duplex: "half" } as RequestInit);
  } catch {
    return request;
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(alignSameOriginCsrf(request)),
    },
  },
});
