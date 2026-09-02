import {
  analyzeApiResponseSchema,
  type AnalyzeErrorCode,
  type AnalyzeErrorField,
} from "./analyze-api";
import type { AnalysisResult } from "./analysis-schema";

export type AnalyzeClientErrorCode =
  | AnalyzeErrorCode
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR";

export class AnalyzeClientError extends Error {
  readonly code: AnalyzeClientErrorCode;
  readonly field?: AnalyzeErrorField;

  constructor(
    code: AnalyzeClientErrorCode,
    message: string,
    field?: AnalyzeErrorField,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AnalyzeClientError";
    this.code = code;
    this.field = field;
  }
}

type RequestAnalysisInput = {
  fetchImplementation?: typeof fetch;
  prompt: string;
  signal: AbortSignal;
  video: File;
};

export async function requestAnalysis({
  fetchImplementation = globalThis.fetch,
  prompt,
  signal,
  video,
}: RequestAnalysisInput): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("video", video, video.name);
  formData.append("prompt", prompt.trim());

  let response: Response;
  try {
    response = await fetchImplementation("/api/analyze", {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;

    throw new AnalyzeClientError(
      "NETWORK_ERROR",
      "REMI could not reach the analysis service. Check your connection and try again.",
      undefined,
      { cause: error },
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw invalidResponseError(error);
  }

  const parsed = analyzeApiResponseSchema.safeParse(body);
  if (!parsed.success || parsed.data.ok !== response.ok) {
    throw invalidResponseError();
  }

  if (!parsed.data.ok) {
    throw new AnalyzeClientError(
      parsed.data.error.code,
      parsed.data.error.message,
      parsed.data.error.field,
    );
  }

  return parsed.data.result;
}

function invalidResponseError(cause?: unknown): AnalyzeClientError {
  return new AnalyzeClientError(
    "INVALID_RESPONSE",
    "REMI received an invalid response. Please try again.",
    undefined,
    { cause },
  );
}
