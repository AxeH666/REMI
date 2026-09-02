import fixture from "@/fixtures/analysis-result.json";
import {
  analyzeVideoWithGateway,
  GeminiAnalysisError,
} from "@/lib/analyze-video";
import { parseAnalysisResult } from "@/lib/analysis-schema";
import type { GeminiGateway, GeminiRemoteFile } from "@/lib/gemini";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gemini", () => ({ createGeminiGateway: vi.fn() }));

const analysisFixture = parseAnalysisResult(fixture);
const responseText = JSON.stringify(fixture);
const video = new Blob(["video-bytes"], { type: "video/mp4" });

const activeFile: GeminiRemoteFile = {
  name: "files/remi-test-video",
  uri: "https://example.invalid/files/remi-test-video",
  mimeType: "video/mp4",
  state: "ACTIVE",
};

type LifecycleOptions = NonNullable<
  Parameters<typeof analyzeVideoWithGateway>[1]
>;

function createGateway(
  overrides: Partial<GeminiGateway> = {},
): GeminiGateway {
  return {
    uploadVideo: vi.fn(async () => activeFile),
    getFile: vi.fn(async () => activeFile),
    generateAnalysis: vi.fn(async () => responseText),
    deleteFile: vi.fn(async () => undefined),
    ...overrides,
  };
}

function analyze(
  gateway: GeminiGateway,
  options: LifecycleOptions = {},
  requestSignal?: AbortSignal,
) {
  return analyzeVideoWithGateway(
    {
      gateway,
      model: "test-model",
      prompt: "Why does this Reel feel wrong?",
      requestSignal,
      video,
    },
    {
      pollIntervalMs: 1,
      sleep: async () => undefined,
      timeoutMs: 30_000,
      ...options,
    },
  );
}

function expectRemoteDelete(gateway: GeminiGateway) {
  expect(gateway.deleteFile).toHaveBeenCalledTimes(1);
  expect(gateway.deleteFile).toHaveBeenCalledWith(activeFile.name);
}

describe("analyzeVideoWithGateway", () => {
  it("analyses an already active upload and deletes it", async () => {
    const gateway = createGateway();

    await expect(analyze(gateway)).resolves.toEqual(analysisFixture);

    expect(gateway.uploadVideo).toHaveBeenCalledWith(video);
    expect(gateway.getFile).not.toHaveBeenCalled();
    expect(gateway.generateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUri: activeFile.uri,
        mimeType: activeFile.mimeType,
        model: "test-model",
        prompt: "Why does this Reel feel wrong?",
        signal: expect.any(AbortSignal),
      }),
    );
    expectRemoteDelete(gateway);
  });

  it("polls a processing upload until it is active, then deletes it", async () => {
    const processingFile = { ...activeFile, state: "PROCESSING" };
    const sleep = vi.fn(async () => undefined);
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => processingFile),
      getFile: vi.fn(async () => activeFile),
    });

    await expect(analyze(gateway, { sleep })).resolves.toEqual(analysisFixture);

    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(gateway.getFile).toHaveBeenCalledWith(
      activeFile.name,
      expect.any(AbortSignal),
    );
    expectRemoteDelete(gateway);
  });

  it.each(["FAILED", "PAUSED"])(
    "rejects a %s processing state and deletes the upload",
    async (state) => {
      const gateway = createGateway({
        uploadVideo: vi.fn(async () => ({ ...activeFile, state })),
      });

      await expect(analyze(gateway)).rejects.toMatchObject({
        kind: "VIDEO_PROCESSING_FAILED",
      });

      expect(gateway.generateAnalysis).not.toHaveBeenCalled();
      expectRemoteDelete(gateway);
    },
  );

  it("maps an upload rejection and does not attempt deletion without a name", async () => {
    const providerError = new Error("upload failed");
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => {
        throw providerError;
      }),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      cause: providerError,
      kind: "UPLOAD_FAILED",
    });

    expect(gateway.getFile).not.toHaveBeenCalled();
    expect(gateway.generateAnalysis).not.toHaveBeenCalled();
    expect(gateway.deleteFile).not.toHaveBeenCalled();
  });

  it("returns on request abort during upload and deletes a late provider file", async () => {
    const requestController = new AbortController();
    let resolveUpload: ((file: GeminiRemoteFile) => void) | undefined;
    const pendingUpload = new Promise<GeminiRemoteFile>((resolve) => {
      resolveUpload = resolve;
    });
    const gateway = createGateway({
      uploadVideo: vi.fn(() => pendingUpload),
    });

    const analysis = analyze(gateway, {}, requestController.signal);
    requestController.abort(new DOMException("Request cancelled", "AbortError"));

    await expect(analysis).rejects.toMatchObject({
      kind: "ANALYSIS_TIMEOUT",
    });
    expect(gateway.deleteFile).not.toHaveBeenCalled();

    resolveUpload?.(activeFile);
    await vi.waitFor(() => expectRemoteDelete(gateway));
    expect(gateway.getFile).not.toHaveBeenCalled();
    expect(gateway.generateAnalysis).not.toHaveBeenCalled();
  });

  it("maps a polling rejection and deletes the upload", async () => {
    const providerError = new Error("status failed");
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => ({ ...activeFile, state: "PROCESSING" })),
      getFile: vi.fn(async () => {
        throw providerError;
      }),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      cause: providerError,
      kind: "VIDEO_PROCESSING_FAILED",
    });

    expect(gateway.generateAnalysis).not.toHaveBeenCalled();
    expectRemoteDelete(gateway);
  });

  it("maps a generation rejection and deletes the upload", async () => {
    const providerError = new Error("generation failed");
    const gateway = createGateway({
      generateAnalysis: vi.fn(async () => {
        throw providerError;
      }),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      cause: providerError,
      kind: "ANALYSIS_FAILED",
    });

    expectRemoteDelete(gateway);
  });

  it.each([undefined, "", "   "])(
    "rejects empty model output (%j) and deletes the upload",
    async (output) => {
      const gateway = createGateway({
        generateAnalysis: vi.fn(async () => output),
      });

      await expect(analyze(gateway)).rejects.toMatchObject({
        kind: "INVALID_MODEL_OUTPUT",
      });

      expectRemoteDelete(gateway);
    },
  );

  it.each([
    ["malformed JSON", '{"verdict":'],
    ["schema-invalid JSON", JSON.stringify({ verdict: "Incomplete" })],
  ])("rejects %s and deletes the upload", async (_label, output) => {
    const gateway = createGateway({
      generateAnalysis: vi.fn(async () => output),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      kind: "INVALID_MODEL_OUTPUT",
    });

    expectRemoteDelete(gateway);
  });

  it("rejects an upload without a remote name and cannot delete it", async () => {
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => ({
        ...activeFile,
        name: undefined,
      })),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      kind: "UPLOAD_FAILED",
    });

    expect(gateway.getFile).not.toHaveBeenCalled();
    expect(gateway.generateAnalysis).not.toHaveBeenCalled();
    expect(gateway.deleteFile).not.toHaveBeenCalled();
  });

  it.each(["uri", "mimeType"] as const)(
    "rejects an active upload without %s and still deletes it",
    async (field) => {
      const gateway = createGateway({
        uploadVideo: vi.fn(async () => ({
          ...activeFile,
          [field]: undefined,
        })),
      });

      await expect(analyze(gateway)).rejects.toMatchObject({
        kind: "VIDEO_PROCESSING_FAILED",
      });

      expect(gateway.generateAnalysis).not.toHaveBeenCalled();
      expectRemoteDelete(gateway);
    },
  );

  it("times out during processing and deletes the upload", async () => {
    vi.useFakeTimers();
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => ({ ...activeFile, state: "PROCESSING" })),
    });
    const sleep: LifecycleOptions["sleep"] = (_milliseconds, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });

    const analysis = analyze(gateway, { sleep, timeoutMs: 25 });
    const rejection = expect(analysis).rejects.toMatchObject({
      kind: "ANALYSIS_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
    expectRemoteDelete(gateway);
  });

  it("maps a request abort after upload to a timeout and deletes the upload", async () => {
    const requestController = new AbortController();
    let markSleepStarted: (() => void) | undefined;
    const sleepStarted = new Promise<void>((resolve) => {
      markSleepStarted = resolve;
    });
    const sleep: LifecycleOptions["sleep"] = (_milliseconds, signal) => {
      markSleepStarted?.();
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    };
    const gateway = createGateway({
      uploadVideo: vi.fn(async () => ({ ...activeFile, state: "PROCESSING" })),
    });

    const analysis = analyze(gateway, { sleep }, requestController.signal);
    const rejection = expect(analysis).rejects.toMatchObject({
      kind: "ANALYSIS_TIMEOUT",
    });
    await sleepStarted;
    requestController.abort(new DOMException("Request cancelled", "AbortError"));

    await rejection;
    expectRemoteDelete(gateway);
  });

  it("does not let deletion failure mask a valid result", async () => {
    const gateway = createGateway({
      deleteFile: vi.fn(async () => {
        throw new Error("delete failed");
      }),
    });

    await expect(analyze(gateway)).resolves.toEqual(analysisFixture);
    expectRemoteDelete(gateway);
  });

  it("does not let deletion failure mask the primary analysis error", async () => {
    const providerError = new Error("generation failed");
    const gateway = createGateway({
      generateAnalysis: vi.fn(async () => {
        throw providerError;
      }),
      deleteFile: vi.fn(async () => {
        throw new Error("delete failed");
      }),
    });

    await expect(analyze(gateway)).rejects.toMatchObject({
      cause: providerError,
      kind: "ANALYSIS_FAILED",
    });
    expectRemoteDelete(gateway);
  });

  it("uses the public analysis error type for lifecycle failures", async () => {
    const gateway = createGateway({
      generateAnalysis: vi.fn(async () => undefined),
    });

    await expect(analyze(gateway)).rejects.toBeInstanceOf(GeminiAnalysisError);
  });
});
