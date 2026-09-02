import { DEFAULT_MAX_VIDEO_MB } from "./project-config";

export const DEFAULT_PROMPT = "Why does this Reel feel wrong?";
export const MAX_PROMPT_LENGTH = 500;

export const MP4_MIME_TYPE = "video/mp4";
export const MAX_VIDEO_SIZE_MB = DEFAULT_MAX_VIDEO_MB;
export const BYTES_PER_MEBIBYTE = 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * BYTES_PER_MEBIBYTE;

export const VIDEO_VALIDATION_MESSAGES = {
  missing: "Select an MP4 video to analyse.",
  unsupportedType: "Choose an MP4 video. Other file types are not supported.",
  empty: "The selected video is empty. Choose a different MP4 file.",
  oversized: `Choose an MP4 video no larger than ${MAX_VIDEO_SIZE_MB} MB.`,
} as const;

export const PROMPT_VALIDATION_MESSAGES = {
  empty: "Enter a question about your Reel.",
  excessive: `Keep your question to ${MAX_PROMPT_LENGTH} characters or fewer.`,
} as const;

/** The browser File fields needed for validation, kept small for easy unit testing. */
export type VideoFileLike = Pick<File, "size" | "type">;

/** Returns a user-facing validation message, or null when the video is valid. */
export function validateVideo(
  file: VideoFileLike | null | undefined,
  maxVideoSizeMb = MAX_VIDEO_SIZE_MB,
): string | null {
  if (!file) {
    return VIDEO_VALIDATION_MESSAGES.missing;
  }

  if (file.type.trim().toLowerCase() !== MP4_MIME_TYPE) {
    return VIDEO_VALIDATION_MESSAGES.unsupportedType;
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return VIDEO_VALIDATION_MESSAGES.empty;
  }

  if (file.size > maxVideoSizeMb * BYTES_PER_MEBIBYTE) {
    return `Choose an MP4 video no larger than ${maxVideoSizeMb} MB.`;
  }

  return null;
}

/** Returns a user-facing validation message, or null when the prompt is valid. */
export function validatePrompt(prompt: string): string | null {
  if (prompt.trim().length === 0) {
    return PROMPT_VALIDATION_MESSAGES.empty;
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return PROMPT_VALIDATION_MESSAGES.excessive;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < BYTES_PER_MEBIBYTE) {
    return `${formatNumber(bytes / 1024)} KB`;
  }

  return `${formatNumber(bytes / BYTES_PER_MEBIBYTE)} MB`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}
