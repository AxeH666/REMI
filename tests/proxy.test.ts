import { Buffer } from "node:buffer";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { config, proxy } from "@/proxy";

const ownerPassword = "owner-password-with-32-characters!";
const friendPassword = "friend-password-with-32-characters";

function authorization(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("private-access proxy", () => {
  beforeEach(() => {
    vi.stubEnv("REMI_OWNER_PASSWORD", ownerPassword);
    vi.stubEnv("REMI_FRIEND_PASSWORD", friendPassword);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("challenges unauthenticated page requests without leaking credentials", async () => {
    const response = proxy(new NextRequest("https://remi.example/"));
    const responseText = await response.text();

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Basic realm="REMI Private POC", charset="UTF-8"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(responseText).not.toContain(ownerPassword);
    expect(responseText).not.toContain(friendPassword);
  });

  it("returns an application-shaped 401 for the protected analysis API", async () => {
    const response = proxy(
      new NextRequest("https://remi.example/api/analyze", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required to use REMI.",
      },
    });
  });

  it.each([
    ["owner", ownerPassword],
    ["friend", friendPassword],
  ])("allows the authenticated %s account", (username, password) => {
    const response = proxy(
      new NextRequest("https://remi.example/", {
        headers: { authorization: authorization(username, password) },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("fails closed without valid access configuration", async () => {
    vi.stubEnv("REMI_OWNER_PASSWORD", "short");
    const response = proxy(new NextRequest("https://remi.example/"));

    expect(response.status).toBe(503);
    expect(response.headers.has("www-authenticate")).toBe(false);
    expect(await response.text()).toBe(
      "REMI private access is not configured.",
    );
  });

  it("allows the configuration-aware healthcheck through without credentials", () => {
    const response = proxy(
      new NextRequest("https://healthcheck.railway.app/api/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("configures one catch-all matcher with only immutable assets excluded", () => {
    expect(config.matcher).toEqual([
      "/((?!_next/static|_next/image|favicon.ico).*)",
    ]);
  });
});
