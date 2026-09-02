import { analyzeVideoWithGemini } from "@/lib/analyze-video";
import { GeminiAnalysisError } from "@/lib/analyze-video";
import {
  ANALYZE_ERROR_MESSAGES,
  type AnalyzeApiError,
  type AnalyzeApiResponse,
  type AnalyzeErrorCode,
  type AnalyzeErrorField,
} from "@/lib/analyze-api";
import {
  analysisResultSchema,
  type AnalysisResult,
} from "@/lib/analysis-schema";
import { getServerEnvironment } from "@/lib/env";
import type { ServerEnvironment } from "@/lib/env-validation";
import {
  MP4_MIME_TYPE,
  PROMPT_VALIDATION_MESSAGES,
  validatePrompt,
  validateVideo,
} from "@/lib/validation";

export const runtime = "nodejs";

type RunAnalysis = (input: {
  apiKey: string;
  model: string;
  prompt: string;
  requestSignal?: AbortSignal;
  video: Blob;
}) => Promise<AnalysisResult>;

type AnalyzeHandlerDependencies = {
  analyzeVideo: RunAnalysis;
  getEnvironment: () => ServerEnvironment;
};

const defaultDependencies: AnalyzeHandlerDependencies = {
  analyzeVideo: analyzeVideoWithGemini,
  getEnvironment: getServerEnvironment,
};

export function createPostHandler(
  overrides: Partial<AnalyzeHandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function POST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
      return errorResponse("INVALID_REQUEST", 403);
    }

    let environment: ServerEnvironment;
    try {
      environment = dependencies.getEnvironment();
    } catch {
      return errorResponse("CONFIGURATION_ERROR", 503);
    }

    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      return errorResponse("INVALID_REQUEST", 400);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("INVALID_REQUEST", 400);
    }

    const requestInput = validateRequestInput(
      formData,
      environment.MAX_VIDEO_MB,
    );

    if (!requestInput.success) {
      return jsonResponse(
        { ok: false, error: requestInput.error },
        requestInput.status,
      );
    }

    try {
      const result = await dependencies.analyzeVideo({
        apiKey: environment.GEMINI_API_KEY,
        model: environment.GEMINI_MODEL,
        prompt: requestInput.prompt,
        requestSignal: request.signal,
        video: requestInput.video,
      });
      const validatedResult = analysisResultSchema.safeParse(result);

      if (!validatedResult.success) {
        return errorResponse("INVALID_MODEL_OUTPUT", 502);
      }

      return jsonResponse({ ok: true, result: validatedResult.data }, 200);
    } catch (error) {
      return mapAnalysisError(error);
    }
  };
}

export const POST = createPostHandler();

function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    const requestUrl = new URL(request.url);
    const addressedOrigin = new URL(`${requestUrl.protocol}//${host}`);

    return new URL(origin).origin === addressedOrigin.origin;
  } catch {
    return false;
  }
}

type ValidRequestInput = {
  success: true;
  prompt: string;
  video: File;
};

type InvalidRequestInput = {
  success: false;
  error: AnalyzeApiError;
  status: number;
};

function validateRequestInput(
  formData: FormData,
  maxVideoSizeMb: number,
): ValidRequestInput | InvalidRequestInput {
  const videos = formData.getAll("video");
  if (videos.length !== 1 || !(videos[0] instanceof File)) {
    return invalidInput("VIDEO_REQUIRED", "video", 400);
  }

  const video = videos[0];
  const videoError = validateVideo(video, maxVideoSizeMb);

  if (videoError) {
    if (video.type.trim().toLowerCase() !== MP4_MIME_TYPE) {
      return invalidInput("VIDEO_TYPE", "video", 415, videoError);
    }

    if (!Number.isFinite(video.size) || video.size <= 0) {
      return invalidInput("VIDEO_EMPTY", "video", 400, videoError);
    }

    return invalidInput("VIDEO_TOO_LARGE", "video", 413, videoError);
  }

  const prompts = formData.getAll("prompt");
  if (prompts.length !== 1 || typeof prompts[0] !== "string") {
    return invalidInput("PROMPT_REQUIRED", "prompt", 400);
  }

  const prompt = prompts[0];
  const promptError = validatePrompt(prompt);

  if (promptError === PROMPT_VALIDATION_MESSAGES.empty) {
    return invalidInput("PROMPT_REQUIRED", "prompt", 400, promptError);
  }

  if (promptError) {
    return invalidInput("PROMPT_TOO_LONG", "prompt", 400, promptError);
  }

  return { success: true, prompt: prompt.trim(), video };
}

function invalidInput(
  code: AnalyzeErrorCode,
  field: AnalyzeErrorField,
  status: number,
  message = ANALYZE_ERROR_MESSAGES[code],
): InvalidRequestInput {
  return {
    success: false,
    error: { code, field, message },
    status,
  };
}

function mapAnalysisError(error: unknown): Response {
  if (!(error instanceof GeminiAnalysisError)) {
    return errorResponse("INTERNAL_ERROR", 500);
  }

  switch (error.kind) {
    case "UPLOAD_FAILED":
      return errorResponse("UPLOAD_FAILED", 502);
    case "VIDEO_PROCESSING_FAILED":
      return errorResponse("VIDEO_PROCESSING_FAILED", 422);
    case "ANALYSIS_TIMEOUT":
      return errorResponse("ANALYSIS_TIMEOUT", 504);
    case "ANALYSIS_FAILED":
      return errorResponse("ANALYSIS_FAILED", 502);
    case "INVALID_MODEL_OUTPUT":
      return errorResponse("INVALID_MODEL_OUTPUT", 502);
  }
}

function errorResponse(
  code: AnalyzeErrorCode,
  status: number,
  field?: AnalyzeErrorField,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message: ANALYZE_ERROR_MESSAGES[code],
        ...(field ? { field } : {}),
      },
    },
    status,
  );
}

function jsonResponse(body: AnalyzeApiResponse, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
