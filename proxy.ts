import { NextResponse, type NextRequest } from "next/server";

import { getRequestAccessStatus } from "@/lib/access-control";
import {
  applyProtectedResponseHeaders,
  createAccessFailureResponse,
} from "@/lib/access-response";

const HEALTHCHECK_PATH = "/api/health";

export function proxy(request: NextRequest): Response {
  if (request.nextUrl.pathname === HEALTHCHECK_PATH) {
    return NextResponse.next();
  }

  const accessStatus = getRequestAccessStatus(request);
  if (accessStatus !== "authorized") {
    return createAccessFailureResponse(
      accessStatus,
      request.nextUrl.pathname.startsWith("/api/") ? "api" : "page",
    );
  }

  const response = NextResponse.next();
  applyProtectedResponseHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
