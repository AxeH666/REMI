import { z } from "zod";

import { analysisResultSchema } from "./analysis-schema";

export const analyzeErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "VIDEO_REQUIRED",
  "VIDEO_TYPE",
  "VIDEO_EMPTY",
  "VIDEO_TOO_LARGE",
  "PROMPT_REQUIRED",
  "PROMPT_TOO_LONG",
  "CONFIGURATION_ERROR",
  "UPLOAD_FAILED",
  "VIDEO_PROCESSING_FAILED",
  "ANALYSIS_TIMEOUT",
  "ANALYSIS_FAILED",
  "INVALID_MODEL_OUTPUT",
  "INTERNAL_ERROR",
]);

export const analyzeErrorFieldSchema = z.enum(["video", "prompt"]);

export const analyzeApiErrorSchema = z
  .object({
    code: analyzeErrorCodeSchema,
    message: z.string().trim().min(1).max(300),
    field: analyzeErrorFieldSchema.optional(),
  })
  .strict();

export const analyzeApiResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      result: analysisResultSchema,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: analyzeApiErrorSchema,
    })
    .strict(),
]);

export type AnalyzeErrorCode = z.infer<typeof analyzeErrorCodeSchema>;
export type AnalyzeErrorField = z.infer<typeof analyzeErrorFieldSchema>;
export type AnalyzeApiError = z.infer<typeof analyzeApiErrorSchema>;
export type AnalyzeApiResponse = z.infer<typeof analyzeApiResponseSchema>;

export const ANALYZE_ERROR_MESSAGES: Record<AnalyzeErrorCode, string> = {
  INVALID_REQUEST: "Submit one MP4 video and one question.",
  VIDEO_REQUIRED: "Select an MP4 video to analyse.",
  VIDEO_TYPE: "Choose an MP4 video. Other file types are not supported.",
  VIDEO_EMPTY: "The selected video is empty. Choose a different MP4 file.",
  VIDEO_TOO_LARGE: "The selected MP4 is larger than the configured limit.",
  PROMPT_REQUIRED: "Enter a question about your Reel.",
  PROMPT_TOO_LONG: "The question is longer than the configured limit.",
  CONFIGURATION_ERROR:
    "REMI is not configured for analysis. Add a valid Gemini API key and try again.",
  UPLOAD_FAILED:
    "Gemini could not receive this video. Check the file and try again.",
  VIDEO_PROCESSING_FAILED:
    "Gemini could not process this video. Try another MP4 file.",
  ANALYSIS_TIMEOUT: "The analysis took too long. Please try again.",
  ANALYSIS_FAILED: "Gemini could not complete the analysis. Please try again.",
  INVALID_MODEL_OUTPUT:
    "Gemini returned an invalid critique. Please try again.",
  INTERNAL_ERROR: "REMI could not complete the analysis. Please try again.",
};
