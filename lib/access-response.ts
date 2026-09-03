import type { AccessStatus } from "./access-control";

export const PRIVATE_ACCESS_REALM = "REMI Private POC";

const protectedResponseHeaders = {
  "Cache-Control": "private, no-store",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function applyProtectedResponseHeaders(headers: Headers): void {
  for (const [name, value] of Object.entries(protectedResponseHeaders)) {
    headers.set(name, value);
  }
}

export function createAccessFailureResponse(
  status: Exclude<AccessStatus, "authorized">,
  responseType: "api" | "page",
): Response {
  const isUnauthorized = status === "unauthorized";
  const httpStatus = isUnauthorized ? 401 : 503;
  const message = isUnauthorized
    ? "Authentication is required to use REMI."
    : responseType === "api"
      ? "REMI is not configured for analysis."
      : "REMI private access is not configured.";
  const headers = new Headers();

  applyProtectedResponseHeaders(headers);
  if (isUnauthorized) {
    headers.set(
      "WWW-Authenticate",
      `Basic realm="${PRIVATE_ACCESS_REALM}", charset="UTF-8"`,
    );
  }

  if (responseType === "api") {
    headers.set("Content-Type", "application/json");
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: isUnauthorized
            ? "AUTHENTICATION_REQUIRED"
            : "CONFIGURATION_ERROR",
          message,
        },
      }),
      { headers, status: httpStatus },
    );
  }

  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(message, { headers, status: httpStatus });
}
