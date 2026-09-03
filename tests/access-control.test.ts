import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  FRIEND_USERNAME,
  getRequestAccessStatus,
  MIN_ACCESS_PASSWORD_LENGTH,
  OWNER_USERNAME,
  parseAccessEnvironment,
} from "@/lib/access-control";

const accessEnvironment = {
  REMI_OWNER_PASSWORD: "owner-password-with-32-characters!",
  REMI_FRIEND_PASSWORD: "friend-password-with-32-characters",
};

function requestWithCredentials(username?: string, password?: string): Request {
  const headers = new Headers();
  if (username !== undefined && password !== undefined) {
    headers.set(
      "authorization",
      `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`,
    );
  }

  return new Request("https://remi.example", { headers });
}

describe("parseAccessEnvironment", () => {
  it("accepts two unique high-entropy private-access passwords", () => {
    expect(parseAccessEnvironment(accessEnvironment)).toEqual(
      accessEnvironment,
    );
  });

  it.each([
    [{}, "REMI_OWNER_PASSWORD, REMI_FRIEND_PASSWORD"],
    [
      {
        ...accessEnvironment,
        REMI_OWNER_PASSWORD: "short",
      },
      "REMI_OWNER_PASSWORD",
    ],
    [
      {
        ...accessEnvironment,
        REMI_FRIEND_PASSWORD: accessEnvironment.REMI_OWNER_PASSWORD,
      },
      "REMI_FRIEND_PASSWORD",
    ],
    [
      {
        ...accessEnvironment,
        REMI_OWNER_PASSWORD:
          "replace_with_a_unique_random_owner_password",
      },
      "REMI_OWNER_PASSWORD",
    ],
  ])("rejects unsafe access configuration", (source, invalidNames) => {
    expect(() => parseAccessEnvironment(source)).toThrow(invalidNames);
  });

  it("requires at least 24 printable ASCII characters", () => {
    expect(MIN_ACCESS_PASSWORD_LENGTH).toBe(24);
    expect(() =>
      parseAccessEnvironment({
        ...accessEnvironment,
        REMI_OWNER_PASSWORD: `${"x".repeat(23)}\n`,
      }),
    ).toThrow("REMI_OWNER_PASSWORD");
  });
});

describe("getRequestAccessStatus", () => {
  it.each([
    [OWNER_USERNAME, accessEnvironment.REMI_OWNER_PASSWORD],
    [FRIEND_USERNAME, accessEnvironment.REMI_FRIEND_PASSWORD],
  ])("authorizes the %s account", (username, password) => {
    expect(
      getRequestAccessStatus(
        requestWithCredentials(username, password),
        accessEnvironment,
      ),
    ).toBe("authorized");
  });

  it.each([
    ["missing credentials", requestWithCredentials()],
    [
      "wrong password",
      requestWithCredentials(OWNER_USERNAME, "wrong-password-with-32-characters"),
    ],
    [
      "unknown username",
      requestWithCredentials(
        "attacker",
        accessEnvironment.REMI_OWNER_PASSWORD,
      ),
    ],
    [
      "malformed scheme",
      new Request("https://remi.example", {
        headers: { authorization: "Bearer token" },
      }),
    ],
    [
      "malformed base64",
      new Request("https://remi.example", {
        headers: { authorization: "Basic ab=c" },
      }),
    ],
  ])("rejects %s", (_label, request) => {
    expect(getRequestAccessStatus(request, accessEnvironment)).toBe(
      "unauthorized",
    );
  });

  it("fails closed when access configuration is invalid", () => {
    expect(getRequestAccessStatus(requestWithCredentials(), {})).toBe(
      "misconfigured",
    );
  });
});
