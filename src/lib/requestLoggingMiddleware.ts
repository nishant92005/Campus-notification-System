import type { NextRequest } from "next/server";

interface RequestLogInput {
  request: NextRequest;
  requestId: string;
  startedAt: number;
  status: number;
}

export function createRequestLogEntry({ request, requestId, startedAt, status }: RequestLogInput) {
  return {
    event: "http.request",
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    status,
    latencyMs: Date.now() - startedAt
  };
}

