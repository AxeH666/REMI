import { describe, expect, it } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_VIDEO_MB,
  parsePublicEnvironment,
  parseServerEnvironment,
} from "@/lib/env-validation";

describe("parsePublicEnvironment", () => {
  it("parses the public-safe upload limit without requiring an API key", () => {
    expect(parsePublicEnvironment({ MAX_VIDEO_MB: "75" })).toEqual({
      MAX_VIDEO_MB: 75,
    });
  });

  it("applies and validates the shared upload-limit default", () => {
    expect(parsePublicEnvironment({})).toEqual({
      MAX_VIDEO_MB: DEFAULT_MAX_VIDEO_MB,
    });
    expect(() => parsePublicEnvironment({ MAX_VIDEO_MB: "0" })).toThrow(
      "Invalid server environment configuration: MAX_VIDEO_MB",
    );
  });
});

describe("parseServerEnvironment", () => {
  it("parses explicit valid server settings", () => {
    expect(
      parseServerEnvironment({
        GEMINI_API_KEY: "test-api-key",
        GEMINI_MODEL: "test-model",
        MAX_VIDEO_MB: "50",
      }),
    ).toEqual({
      GEMINI_API_KEY: "test-api-key",
      GEMINI_MODEL: "test-model",
      MAX_VIDEO_MB: 50,
    });
  });

  it("applies documented defaults to omitted optional settings", () => {
    expect(parseServerEnvironment({ GEMINI_API_KEY: "test-api-key" })).toEqual(
      {
        GEMINI_API_KEY: "test-api-key",
        GEMINI_MODEL: DEFAULT_GEMINI_MODEL,
        MAX_VIDEO_MB: DEFAULT_MAX_VIDEO_MB,
      },
    );
  });

  it("applies documented defaults to blank optional settings", () => {
    expect(
      parseServerEnvironment({
        GEMINI_API_KEY: "test-api-key",
        GEMINI_MODEL: "   ",
        MAX_VIDEO_MB: "",
      }),
    ).toMatchObject({
      GEMINI_MODEL: DEFAULT_GEMINI_MODEL,
      MAX_VIDEO_MB: DEFAULT_MAX_VIDEO_MB,
    });
  });

  it.each([
    undefined,
    "",
    "   ",
    "replace_with_your_key",
    "replace_with_a_new_key",
  ])(
    "rejects a missing, blank, or placeholder Gemini API key (%s)",
    (apiKey) => {
      expect(() =>
        parseServerEnvironment({ GEMINI_API_KEY: apiKey }),
      ).toThrow("Invalid server environment configuration: GEMINI_API_KEY");
    },
  );

  it.each(["0", "-1", "1.5", "not-a-number"])(
    "rejects an invalid video-size limit (%s)",
    (maxVideoMb) => {
      expect(() =>
        parseServerEnvironment({
          GEMINI_API_KEY: "test-api-key",
          MAX_VIDEO_MB: maxVideoMb,
        }),
      ).toThrow("Invalid server environment configuration: MAX_VIDEO_MB");
    },
  );

  it("does not return unrelated environment values", () => {
    expect(
      parseServerEnvironment({
        GEMINI_API_KEY: "test-api-key",
        UNRELATED_SECRET: "do-not-return",
      }),
    ).not.toHaveProperty("UNRELATED_SECRET");
  });
});
