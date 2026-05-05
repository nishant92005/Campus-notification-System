import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createRequestLogEntry } from "@/lib/requestLoggingMiddleware";

export function middleware(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = NextResponse.next();
  const entry = createRequestLogEntry({
    request,
    requestId,
    startedAt,
    status: response.status
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set("x-log-event", entry.event);
  response.headers.set("x-log-latency-ms", String(entry.latencyMs));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

