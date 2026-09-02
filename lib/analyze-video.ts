import "server-only";

import type { AnalysisResult } from "./analysis-schema";
import { parseAnalysisResultJson } from "./analysis-schema";
import {
  createGeminiGateway,
  type GeminiGateway,
  type GeminiRemoteFile,
} from "./gemini";

export const GEMINI_ANALYSIS_TIMEOUT_MS = 110_000;
export const GEMINI_FILE_POLL_INTERVAL_MS = 2_000;

export type GeminiAnalysisFailure =
  | "UPLOAD_FAILED"
  | "VIDEO_PROCESSING_FAILED"
  | "ANALYSIS_TIMEOUT"
  | "ANALYSIS_FAILED"
  | "INVALID_MODEL_OUTPUT";

export class GeminiAnalysisError extends Error {
  readonly kind: GeminiAnalysisFailure;

  constructor(kind: GeminiAnalysisFailure, cause?: unknown) {
    super("Gemini analysis did not complete.", { cause });
    this.name = "GeminiAnalysisError";
    this.kind = kind;
  }
}

export type AnalyzeVideoWithGeminiInput = {
  apiKey: string;
  model: string;
  prompt: string;
  requestSignal?: AbortSignal;
  video: Blob;
};

type AnalyzeVideoWithGatewayInput = Omit<
  AnalyzeVideoWithGeminiInput,
  "apiKey"
> & {
  gateway: GeminiGateway;
};

type LifecycleOptions = {
  pollIntervalMs?: number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  timeoutMs?: number;
};

export async function analyzeVideoWithGemini(
  input: AnalyzeVideoWithGeminiInput,
): Promise<AnalysisResult> {
  return analyzeVideoWithGateway({
    ...input,
    gateway: createGeminiGateway(input.apiKey),
  });
}

export async function analyzeVideoWithGateway(
  input: AnalyzeVideoWithGatewayInput,
  options: LifecycleOptions = {},
): Promise<AnalysisResult> {
  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? GEMINI_ANALYSIS_TIMEOUT_MS,
  );
  const signal = input.requestSignal
    ? AbortSignal.any([input.requestSignal, timeoutController.signal])
    : timeoutController.signal;
  const sleep = options.sleep ?? abortableDelay;
  const pollIntervalMs =
    options.pollIntervalMs ?? GEMINI_FILE_POLL_INTERVAL_MS;
  let remoteFileName: string | undefined;

  try {
    throwIfAborted(signal);

    let uploadedFile: GeminiRemoteFile;
    let uploadPromise: Promise<GeminiRemoteFile> | undefined;
    try {
      uploadPromise = input.gateway.uploadVideo(input.video);
      uploadedFile = await waitForPromise(uploadPromise, signal);
    } catch (error) {
      if (signal.aborted && uploadPromise) {
        scheduleLateUploadCleanup(uploadPromise, input.gateway);
      }

      throw stageError("UPLOAD_FAILED", signal, error);
    }

    remoteFileName = requireString(uploadedFile.name, "UPLOAD_FAILED");
    throwIfAborted(signal);

    const readyFile = await waitForFileReady({
      file: uploadedFile,
      gateway: input.gateway,
      name: remoteFileName,
      pollIntervalMs,
      signal,
      sleep,
    });
    const fileUri = requireString(readyFile.uri, "VIDEO_PROCESSING_FAILED");
    const mimeType = requireString(
      readyFile.mimeType,
      "VIDEO_PROCESSING_FAILED",
    );

    let responseText: string | undefined;
    try {
      responseText = await input.gateway.generateAnalysis({
        model: input.model,
        fileUri,
        mimeType,
        prompt: input.prompt,
        signal,
      });
    } catch (error) {
      throw stageError("ANALYSIS_FAILED", signal, error);
    }

    if (!responseText?.trim()) {
      throw new GeminiAnalysisError("INVALID_MODEL_OUTPUT");
    }

    try {
      return parseAnalysisResultJson(responseText);
    } catch (error) {
      throw new GeminiAnalysisError("INVALID_MODEL_OUTPUT", error);
    }
  } finally {
    clearTimeout(timeoutHandle);

    if (remoteFileName) {
      try {
        await input.gateway.deleteFile(remoteFileName);
      } catch {
        // Best effort: cleanup must not replace a valid result or primary error.
      }
    }
  }
}

type WaitForFileReadyInput = {
  file: GeminiRemoteFile;
  gateway: GeminiGateway;
  name: string;
  pollIntervalMs: number;
  signal: AbortSignal;
  sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};

async function waitForFileReady({
  file,
  gateway,
  name,
  pollIntervalMs,
  signal,
  sleep,
}: WaitForFileReadyInput): Promise<GeminiRemoteFile> {
  let currentFile = file;

  while (currentFile.state !== "ACTIVE") {
    if (currentFile.state === "FAILED") {
      throw new GeminiAnalysisError("VIDEO_PROCESSING_FAILED");
    }

    if (
      currentFile.state &&
      currentFile.state !== "PROCESSING" &&
      currentFile.state !== "STATE_UNSPECIFIED"
    ) {
      throw new GeminiAnalysisError("VIDEO_PROCESSING_FAILED");
    }

    throwIfAborted(signal);

    try {
      await sleep(pollIntervalMs, signal);
      currentFile = await gateway.getFile(name, signal);
    } catch (error) {
      if (error instanceof GeminiAnalysisError) throw error;
      throw stageError("VIDEO_PROCESSING_FAILED", signal, error);
    }
  }

  return currentFile;
}

function stageError(
  fallback: GeminiAnalysisFailure,
  signal: AbortSignal,
  cause?: unknown,
): GeminiAnalysisError {
  if (signal.aborted) {
    return new GeminiAnalysisError("ANALYSIS_TIMEOUT", cause);
  }

  return new GeminiAnalysisError(fallback, cause);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new GeminiAnalysisError("ANALYSIS_TIMEOUT", signal.reason);
  }
}

function requireString(
  value: string | undefined,
  failure: GeminiAnalysisFailure,
): string {
  if (!value?.trim()) {
    throw new GeminiAnalysisError(failure);
  }

  return value;
}

function waitForPromise<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener("abort", handleAbort);
      reject(signal.reason);
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

function scheduleLateUploadCleanup(
  uploadPromise: Promise<GeminiRemoteFile>,
  gateway: GeminiGateway,
): void {
  void uploadPromise.then(
    async (uploadedFile) => {
      const name = uploadedFile.name?.trim();

      if (!name) return;

      try {
        await gateway.deleteFile(name);
      } catch {
        // The SDK cannot abort an in-flight byte upload. If it finishes after
        // the request timeout, deletion remains best effort and independent.
      }
    },
    () => undefined,
  );
}

function abortableDelay(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const handle = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      clearTimeout(handle);
      reject(signal.reason);
    };

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}
