import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGetHandler } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports readiness after validating access and Gemini configuration", async () => {
    const validateAccessEnvironment = vi.fn();
    const validateServerEnvironment = vi.fn();
    const get = createGetHandler({
      validateAccessEnvironment,
      validateServerEnvironment,
    });

    const response = get();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(validateAccessEnvironment).toHaveBeenCalledTimes(1);
    expect(validateServerEnvironment).toHaveBeenCalledTimes(1);
  });

  it.each(["access", "server"])(
    "returns a generic failure when %s configuration is invalid",
    async (failingConfiguration) => {
      const privateDetails = "secret configuration detail";
      const get = createGetHandler({
        validateAccessEnvironment: () => {
          if (failingConfiguration === "access") {
            throw new Error(privateDetails);
          }
        },
        validateServerEnvironment: () => {
          if (failingConfiguration === "server") {
            throw new Error(privateDetails);
          }
        },
      });

      const response = get();
      const responseText = await response.text();

      expect(response.status).toBe(503);
      expect(responseText).toBe('{"ok":false}');
      expect(responseText).not.toContain(privateDetails);
    },
  );
});
