import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROMPT,
  formatFileSize,
  MAX_PROMPT_LENGTH,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_SIZE_MB,
  MP4_MIME_TYPE,
  PROMPT_VALIDATION_MESSAGES,
  validatePrompt,
  validateVideo,
  VIDEO_VALIDATION_MESSAGES,
  type VideoFileLike,
} from "@/lib/validation";

const fileLike = (
  overrides: Partial<VideoFileLike> = {},
): VideoFileLike => ({
  size: 5 * 1024 * 1024,
  type: MP4_MIME_TYPE,
  ...overrides,
});

describe("validation constants", () => {
  it("uses the required default prompt and limits", () => {
    expect(DEFAULT_PROMPT).toBe("Why does this Reel feel wrong?");
    expect(MAX_PROMPT_LENGTH).toBe(500);
    expect(MP4_MIME_TYPE).toBe("video/mp4");
    expect(MAX_VIDEO_SIZE_MB).toBe(100);
    expect(MAX_VIDEO_SIZE_BYTES).toBe(100 * 1024 * 1024);
  });
});

describe("validateVideo", () => {
  it("accepts an MP4 below the size limit", () => {
    expect(validateVideo(fileLike())).toBeNull();
  });

  it("accepts an MP4 exactly at the size limit", () => {
    expect(validateVideo(fileLike({ size: MAX_VIDEO_SIZE_BYTES }))).toBeNull();
  });

  it("normalises harmless MIME casing and whitespace", () => {
    expect(validateVideo(fileLike({ type: "  VIDEO/MP4  " }))).toBeNull();
  });

  it.each([null, undefined])("rejects a missing video (%s)", (file) => {
    expect(validateVideo(file)).toBe(VIDEO_VALIDATION_MESSAGES.missing);
  });

  it.each(["", "video/quicktime", "image/png", "application/octet-stream"])(
    "rejects the unsupported MIME type %j",
    (type) => {
      expect(validateVideo(fileLike({ type }))).toBe(
        VIDEO_VALIDATION_MESSAGES.unsupportedType,
      );
    },
  );

  it("rejects an empty video", () => {
    expect(validateVideo(fileLike({ size: 0 }))).toBe(
      VIDEO_VALIDATION_MESSAGES.empty,
    );
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "handles an invalid file size as an empty video (%s)",
    (size) => {
      expect(validateVideo(fileLike({ size }))).toBe(
        VIDEO_VALIDATION_MESSAGES.empty,
      );
    },
  );

  it("rejects a video one byte above the size limit", () => {
    expect(validateVideo(fileLike({ size: MAX_VIDEO_SIZE_BYTES + 1 }))).toBe(
      VIDEO_VALIDATION_MESSAGES.oversized,
    );
  });

  it("uses a server-provided public size limit", () => {
    expect(
      validateVideo(fileLike({ size: 11 * 1024 * 1024 }), 10),
    ).toBe("Choose an MP4 video no larger than 10 MB.");
    expect(validateVideo(fileLike({ size: 10 * 1024 * 1024 }), 10)).toBeNull();
  });
});

describe("validatePrompt", () => {
  it("accepts the default prompt", () => {
    expect(validatePrompt(DEFAULT_PROMPT)).toBeNull();
  });

  it("accepts a prompt exactly at the character limit", () => {
    expect(validatePrompt("a".repeat(MAX_PROMPT_LENGTH))).toBeNull();
  });

  it.each(["", " ", "\t\r\n"])("rejects an empty prompt (%j)", (prompt) => {
    expect(validatePrompt(prompt)).toBe(PROMPT_VALIDATION_MESSAGES.empty);
  });

  it("rejects a prompt above the character limit", () => {
    expect(validatePrompt("a".repeat(MAX_PROMPT_LENGTH + 1))).toBe(
      PROMPT_VALIDATION_MESSAGES.excessive,
    );
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [1024 * 1024, "1 MB"],
    [5.25 * 1024 * 1024, "5.3 MB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back safely for an invalid byte count (%s)",
    (bytes) => {
      expect(formatFileSize(bytes)).toBe("0 B");
    },
  );
});
