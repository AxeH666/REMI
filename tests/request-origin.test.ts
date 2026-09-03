import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "@/lib/request-origin";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://internal-service:3000/api/analyze", { headers });
}

const invalidForwardedHeaders: Array<Record<string, string>> = [
  {
    origin: "https://remi-production.up.railway.app",
    "x-forwarded-host": "remi-production.up.railway.app",
  },
  {
    origin: "https://remi-production.up.railway.app",
    "x-forwarded-proto": "https",
  },
  {
    origin: "https://remi-production.up.railway.app",
    "x-forwarded-host": "remi-production.up.railway.app",
    "x-forwarded-proto": "javascript",
  },
];

describe("isSameOriginRequest", () => {
  it("uses paired forwarded host and protocol behind the production proxy", () => {
    expect(
      isSameOriginRequest(
        requestWith({
          origin: "https://remi-production.up.railway.app",
          "x-forwarded-host": "remi-production.up.railway.app",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(true);
  });

  it.each(invalidForwardedHeaders)(
    "rejects incomplete or invalid forwarded origin data",
    (headers) => {
      expect(isSameOriginRequest(requestWith(headers))).toBe(false);
    },
  );

  it("uses only the first value from a forwarded header chain", () => {
    expect(
      isSameOriginRequest(
        requestWith({
          origin: "https://remi-production.up.railway.app",
          "x-forwarded-host":
            "remi-production.up.railway.app, internal-service:3000",
          "x-forwarded-proto": "https, http",
        }),
      ),
    ).toBe(true);
  });

  it("preserves the direct host check for local requests", () => {
    expect(
      isSameOriginRequest(
        new Request("http://localhost:3000/api/analyze", {
          headers: {
            host: "127.0.0.1:3000",
            origin: "http://127.0.0.1:3000",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-site browser metadata before inspecting origins", () => {
    expect(
      isSameOriginRequest(
        requestWith({
          origin: "https://remi-production.up.railway.app",
          "sec-fetch-site": "cross-site",
          "x-forwarded-host": "remi-production.up.railway.app",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  });
});
