import fixture from "@/fixtures/analysis-result.json";
import { requestAnalysis } from "@/lib/analyze-client";
import { parseAnalysisResult, type AnalysisResult } from "@/lib/analysis-schema";
import type { ServerEnvironment } from "@/lib/env-validation";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPostHandler } from "@/app/api/analyze/route";

const BROWSER_ORIGIN = "http://127.0.0.1:3001";
const NEXT_NORMALIZED_ROUTE_URL = "http://localhost:3001/api/analyze";
const SYNTHETIC_VIDEO_BYTES = 1_468_006;

const environment = {
  GEMINI_API_KEY: "test-only-key",
  GEMINI_MODEL: "test-model",
  MAX_VIDEO_MB: 2,
} satisfies ServerEnvironment;

const result = parseAnalysisResult(fixture);

type HandlerOverrides = NonNullable<
  Parameters<typeof createPostHandler>[0]
>;
type AnalyzeVideo = NonNullable<HandlerOverrides["analyzeVideo"]>;

describe("browser to analysis route boundary", () => {
  it("accepts native multipart data when Next normalizes a loopback request URL", async () => {
    const analyzeVideo = vi.fn<AnalyzeVideo>(
      async (): Promise<AnalysisResult> => result,
    );
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    });
    const fetchBridge = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("/api/analyze");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toBeUndefined();
      expect(init?.body).toBeInstanceOf(FormData);

      const request = new Request(NEXT_NORMALIZED_ROUTE_URL, {
        body: init?.body,
        headers: {
          host: new URL(BROWSER_ORIGIN).host,
          origin: BROWSER_ORIGIN,
          "sec-fetch-site": "same-origin",
        },
        method: init?.method,
        signal: init?.signal,
      });

      expect(request.headers.get("content-type")).toMatch(
        /^multipart\/form-data; boundary=/,
      );

      return post(request);
    });
    const prompt = "p".repeat(302);
    const video = new File(
      [new Uint8Array(SYNTHETIC_VIDEO_BYTES)],
      "browser-selected.mp4",
      { type: "video/mp4" },
    );

    await expect(
      requestAnalysis({
        fetchImplementation: fetchBridge,
        prompt,
        signal: new AbortController().signal,
        video,
      }),
    ).resolves.toEqual(result);

    expect(analyzeVideo).toHaveBeenCalledTimes(1);
    const analysisInput = analyzeVideo.mock.calls[0]?.[0];
    expect(analysisInput?.prompt).toBe(prompt);
    expect(analysisInput?.video).toBeInstanceOf(File);
    expect(analysisInput?.video).toMatchObject({
      name: "browser-selected.mp4",
      size: SYNTHETIC_VIDEO_BYTES,
      type: "video/mp4",
    });
  });
});
