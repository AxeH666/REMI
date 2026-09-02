import { describe, expect, it, vi } from "vitest";

import fixture from "@/fixtures/analysis-result.json";
import {
  AnalyzeClientError,
  requestAnalysis,
} from "@/lib/analyze-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function requestWith(
  fetchImplementation: typeof fetch,
  overrides: Partial<{
    prompt: string;
    signal: AbortSignal;
    video: File;
  }> = {},
) {
  return requestAnalysis({
    fetchImplementation,
    prompt: "  Why does this Reel feel wrong?  ",
    signal: new AbortController().signal,
    video: new File(["video-bytes"], "selected-reel.mp4", {
      type: "video/mp4",
    }),
    ...overrides,
  });
}

describe("requestAnalysis", () => {
  it("posts the selected File and trimmed prompt as browser-owned multipart data", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ok: true, result: fixture }));
    const video = new File(["selected-video-bytes"], "chosen-reel.mp4", {
      type: "video/mp4",
    });
    const controller = new AbortController();

    const result = await requestWith(fetchImplementation, {
      prompt: "  Focus on the pacing.  ",
      signal: controller.signal,
      video,
    });

    expect(result).toEqual(fixture);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImplementation.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(init).toMatchObject({
      method: "POST",
      signal: controller.signal,
    });
    expect(init).not.toHaveProperty("headers");
    expect(init?.body).toBeInstanceOf(FormData);

    const formData = init?.body as FormData;
    const uploadedVideo = formData.get("video");
    expect(uploadedVideo).toBeInstanceOf(File);

    if (!(uploadedVideo instanceof File)) {
      throw new TypeError("Expected multipart video to be a File.");
    }

    expect(uploadedVideo.name).toBe(video.name);
    expect(uploadedVideo.type).toBe(video.type);
    expect(uploadedVideo.size).toBe(video.size);
    expect(await uploadedVideo.text()).toBe("selected-video-bytes");
    expect(formData.get("prompt")).toBe("Focus on the pacing.");
  });

  it("returns the validated result from a successful API envelope", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ok: true, result: fixture }));

    await expect(requestWith(fetchImplementation)).resolves.toEqual(fixture);
  });

  it("throws the safe API error with its field metadata", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error: {
            code: "VIDEO_TOO_LARGE",
            field: "video",
            message: "The selected MP4 is larger than the configured limit.",
          },
        },
        413,
      ),
    );

    await expect(requestWith(fetchImplementation)).rejects.toMatchObject({
      name: "AnalyzeClientError",
      code: "VIDEO_TOO_LARGE",
      field: "video",
      message: "The selected MP4 is larger than the configured limit.",
    } satisfies Partial<AnalyzeClientError>);
  });

  it("maps a fetch failure to a safe network error", async () => {
    const cause = new TypeError("socket details that must not reach the UI");
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(cause);

    await expect(requestWith(fetchImplementation)).rejects.toMatchObject({
      name: "AnalyzeClientError",
      code: "NETWORK_ERROR",
      message:
        "REMI could not reach the analysis service. Check your connection and try again.",
      cause,
    } satisfies Partial<AnalyzeClientError>);
  });

  it("passes through an aborted request instead of disguising it as a network error", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(abortError);
    controller.abort();

    await expect(
      requestWith(fetchImplementation, { signal: controller.signal }),
    ).rejects.toBe(abortError);
  });

  it.each([
    ["non-JSON response", new Response("Bad gateway", { status: 502 })],
    [
      "malformed success envelope",
      jsonResponse({ ok: true, result: { verdict: "Incomplete" } }),
    ],
    ["unknown envelope", jsonResponse({ message: "not the API contract" })],
  ])("rejects a %s as an invalid response", async (_name, response) => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response);

    await expect(requestWith(fetchImplementation)).rejects.toMatchObject({
      name: "AnalyzeClientError",
      code: "INVALID_RESPONSE",
      message: "REMI received an invalid response. Please try again.",
    } satisfies Partial<AnalyzeClientError>);
  });

  it.each([
    [
      "HTTP success with an error envelope",
      200,
      {
        ok: false,
        error: {
          code: "ANALYSIS_FAILED",
          message: "Gemini could not complete the analysis. Please try again.",
        },
      },
    ],
    ["HTTP failure with a success envelope", 502, { ok: true, result: fixture }],
  ])("rejects %s", async (_name, status, body) => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(body, status));

    await expect(requestWith(fetchImplementation)).rejects.toMatchObject({
      name: "AnalyzeClientError",
      code: "INVALID_RESPONSE",
    } satisfies Partial<AnalyzeClientError>);
  });
});
