import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { analysisResultJsonSchema } from "@/lib/analysis-schema";
import {
  createGeminiGateway,
  GEMINI_DELETE_TIMEOUT_MS,
  GEMINI_REQUEST_TIMEOUT_MS,
} from "@/lib/gemini";
import { buildUserContextPrompt, REMI_SYSTEM_PROMPT } from "@/lib/prompts";

const sdkMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const get = vi.fn();
  const deleteFile = vi.fn();
  const generateContent = vi.fn();
  const client = {
    files: { delete: deleteFile, get, upload },
    models: { generateContent },
  };
  const GoogleGenAI = vi.fn(function MockGoogleGenAI() {
    return client;
  });
  const createPartFromUri = vi.fn((uri: string, mimeType: string) => ({
    kind: "video",
    mimeType,
    uri,
  }));
  const createUserContent = vi.fn((parts: unknown[]) => ({
    parts,
    role: "user",
  }));

  return {
    GoogleGenAI,
    createPartFromUri,
    createUserContent,
    deleteFile,
    generateContent,
    get,
    upload,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: sdkMocks.GoogleGenAI,
  createPartFromUri: sdkMocks.createPartFromUri,
  createUserContent: sdkMocks.createUserContent,
}));

const networkFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  networkFetch.mockRejectedValue(
    new Error("A Gemini adapter unit test attempted real network access."),
  );
  vi.stubGlobal("fetch", networkFetch);

  sdkMocks.upload.mockResolvedValue({
    mimeType: "video/mp4",
    name: "files/remi-video",
    state: "PROCESSING",
    uri: "https://generativelanguage.googleapis.com/files/remi-video",
  });
  sdkMocks.get.mockResolvedValue({
    mimeType: "video/mp4",
    name: "files/remi-video",
    state: "ACTIVE",
    uri: "https://generativelanguage.googleapis.com/files/remi-video",
  });
  sdkMocks.generateContent.mockResolvedValue({ text: "validated JSON text" });
  sdkMocks.deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  try {
    expect(networkFetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

describe("createGeminiGateway", () => {
  it("constructs the SDK client and uploads the Blob with MP4 configuration", async () => {
    const gateway = createGeminiGateway("test-api-key");
    const video = new Blob(["video-bytes"], { type: "video/mp4" });

    const uploaded = await gateway.uploadVideo(video);

    expect(sdkMocks.GoogleGenAI).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
    });
    expect(sdkMocks.upload).toHaveBeenCalledWith({
      file: video,
      config: { mimeType: "video/mp4" },
    });
    expect(uploaded).toEqual({
      mimeType: "video/mp4",
      name: "files/remi-video",
      state: "PROCESSING",
      uri: "https://generativelanguage.googleapis.com/files/remi-video",
    });
  });

  it("passes the caller's abort signal to polling file lookups", async () => {
    const gateway = createGeminiGateway("test-api-key");
    const signal = new AbortController().signal;

    const remoteFile = await gateway.getFile("files/remi-video", signal);

    expect(sdkMocks.get).toHaveBeenCalledWith({
      name: "files/remi-video",
      config: { abortSignal: signal },
    });
    expect(remoteFile).toEqual({
      mimeType: "video/mp4",
      name: "files/remi-video",
      state: "ACTIVE",
      uri: "https://generativelanguage.googleapis.com/files/remi-video",
    });
  });

  it("places the video before documented user context and requests structured JSON", async () => {
    const gateway = createGeminiGateway("test-api-key");
    const signal = new AbortController().signal;
    const prompt = "Focus on whether the reassurance feels natural.";
    const fileUri =
      "https://generativelanguage.googleapis.com/files/remi-video";

    const output = await gateway.generateAnalysis({
      fileUri,
      mimeType: "video/mp4",
      model: "gemini-test-model",
      prompt,
      signal,
    });

    expect(sdkMocks.createPartFromUri).toHaveBeenCalledWith(
      fileUri,
      "video/mp4",
    );
    expect(sdkMocks.createUserContent).toHaveBeenCalledWith([
      {
        kind: "video",
        mimeType: "video/mp4",
        uri: fileUri,
      },
      buildUserContextPrompt(prompt),
    ]);

    const createdContent = sdkMocks.createUserContent.mock.results[0]?.value;
    expect(sdkMocks.generateContent).toHaveBeenCalledWith({
      model: "gemini-test-model",
      contents: createdContent,
      config: {
        abortSignal: signal,
        responseJsonSchema: analysisResultJsonSchema,
        responseMimeType: "application/json",
        systemInstruction: REMI_SYSTEM_PROMPT,
      },
    });
    expect(output).toBe("validated JSON text");
  });

  it("deletes independently with a fresh bounded cleanup signal", async () => {
    const cleanupSignal = new AbortController().signal;
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(cleanupSignal);
    const gateway = createGeminiGateway("test-api-key");

    await gateway.deleteFile("files/remi-video");

    expect(timeout).toHaveBeenCalledWith(GEMINI_DELETE_TIMEOUT_MS);
    expect(sdkMocks.deleteFile).toHaveBeenCalledWith({
      name: "files/remi-video",
      config: {
        abortSignal: cleanupSignal,
        httpOptions: { timeout: GEMINI_DELETE_TIMEOUT_MS },
      },
    });
    expect(sdkMocks.upload).not.toHaveBeenCalled();
    expect(sdkMocks.get).not.toHaveBeenCalled();
    expect(sdkMocks.generateContent).not.toHaveBeenCalled();
  });
});
