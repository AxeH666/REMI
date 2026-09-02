import fixture from "@/fixtures/analysis-result.json";
import {
  ANALYZE_ERROR_MESSAGES,
  analyzeApiResponseSchema,
  type AnalyzeErrorCode,
  type AnalyzeErrorField,
} from "@/lib/analyze-api";
import {
  analysisResultSchema,
  type AnalysisResult,
} from "@/lib/analysis-schema";
import {
  GeminiAnalysisError,
  type GeminiAnalysisFailure,
} from "@/lib/analyze-video";
import type { ServerEnvironment } from "@/lib/env-validation";
import {
  BYTES_PER_MEBIBYTE,
  MAX_PROMPT_LENGTH,
  PROMPT_VALIDATION_MESSAGES,
} from "@/lib/validation";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPostHandler } from "@/app/api/analyze/route";

const API_URL = "http://localhost/api/analyze";
const TEST_API_KEY = "test-secret-api-key";
const TEST_MODEL = "test-gemini-model";
const DEFAULT_PROMPT = "Why does this Reel feel wrong?";

const environment = {
  GEMINI_API_KEY: TEST_API_KEY,
  GEMINI_MODEL: TEST_MODEL,
  MAX_VIDEO_MB: 1,
} satisfies ServerEnvironment;

const validResult = analysisResultSchema.parse(fixture);

type HandlerOverrides = NonNullable<
  Parameters<typeof createPostHandler>[0]
>;
type AnalyzeVideo = NonNullable<HandlerOverrides["analyzeVideo"]>;

function createVideo({
  bytes = new Uint8Array([1, 2, 3]),
  name = "reel.mp4",
  type = "video/mp4",
}: {
  bytes?: BlobPart;
  name?: string;
  type?: string;
} = {}): File {
  return new File([bytes], name, { type });
}

function createValidFormData({
  prompt = DEFAULT_PROMPT,
  video = createVideo(),
}: {
  prompt?: string;
  video?: File;
} = {}): FormData {
  const formData = new FormData();
  formData.append("video", video);
  formData.append("prompt", prompt);
  return formData;
}

function createRequest(formData: FormData): Request {
  return new Request(API_URL, { method: "POST", body: formData });
}

function createAnalyzeMock(result: AnalysisResult = validResult) {
  return vi.fn<AnalyzeVideo>(async () => result);
}

function createHarness(analyzeVideo = createAnalyzeMock()) {
  return {
    analyzeVideo,
    post: createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    }),
  };
}

async function expectErrorResponse(
  response: Response,
  {
    code,
    field,
    message = ANALYZE_ERROR_MESSAGES[code],
    secrets = [],
    status,
  }: {
    code: AnalyzeErrorCode;
    field?: AnalyzeErrorField;
    message?: string;
    secrets?: string[];
    status: number;
  },
) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-type")).toContain("application/json");

  const responseText = await response.text();
  for (const secret of secrets) {
    expect(responseText).not.toContain(secret);
  }

  const body = JSON.parse(responseText) as unknown;
  expect(body).toEqual({
    ok: false,
    error: {
      code,
      message,
      ...(field ? { field } : {}),
    },
  });
  expect(analyzeApiResponseSchema.parse(body)).toEqual(body);
}

describe("POST /api/analyze request parsing", () => {
  it.each([
    ["a different Origin", { origin: "https://attacker.example" }],
    ["a cross-site fetch marker", { "sec-fetch-site": "cross-site" }],
  ])("rejects %s before loading configuration", async (_label, headers) => {
    const analyzeVideo = createAnalyzeMock();
    const getEnvironment = vi.fn(() => environment);
    const post = createPostHandler({ analyzeVideo, getEnvironment });
    const request = new Request(API_URL, {
      body: createValidFormData(),
      headers,
      method: "POST",
    });

    const response = await post(request);

    await expectErrorResponse(response, {
      code: "INVALID_REQUEST",
      status: 403,
    });
    expect(getEnvironment).not.toHaveBeenCalled();
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects a non-multipart content type without running analysis", async () => {
    const { analyzeVideo, post } = createHarness();
    const request = new Request(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: DEFAULT_PROMPT }),
    });

    const response = await post(request);

    await expectErrorResponse(response, {
      code: "INVALID_REQUEST",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects malformed multipart data without exposing parser details", async () => {
    const { analyzeVideo, post } = createHarness();
    const parserDetails = "private multipart parser details";
    const request = new Request(API_URL, {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=broken-boundary",
      },
      body: parserDetails,
    });

    const response = await post(request);

    await expectErrorResponse(response, {
      code: "INVALID_REQUEST",
      secrets: [parserDetails],
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });
});

describe("POST /api/analyze video validation", () => {
  it("rejects a missing video", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = new FormData();
    formData.append("prompt", DEFAULT_PROMPT);

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_REQUIRED",
      field: "video",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects multiple videos", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = createValidFormData();
    formData.append("video", createVideo({ name: "second.mp4" }));

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_REQUIRED",
      field: "video",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects a non-file video form value", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = new FormData();
    formData.append("video", "not-a-file");
    formData.append("prompt", DEFAULT_PROMPT);

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_REQUIRED",
      field: "video",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects a file whose MIME type is not MP4", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = createValidFormData({
      video: createVideo({ name: "still.png", type: "image/png" }),
    });

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_TYPE",
      field: "video",
      status: 415,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects an empty MP4", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = createValidFormData({
      video: createVideo({ bytes: new Uint8Array() }),
    });

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_EMPTY",
      field: "video",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects an MP4 above the server-configured limit", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = createValidFormData({
      video: createVideo({
        bytes: new Uint8Array(BYTES_PER_MEBIBYTE + 1),
      }),
    });

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "VIDEO_TOO_LARGE",
      field: "video",
      message: "Choose an MP4 video no larger than 1 MB.",
      status: 413,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });
});

describe("POST /api/analyze prompt validation", () => {
  it("rejects a missing prompt", async () => {
    const { analyzeVideo, post } = createHarness();
    const formData = new FormData();
    formData.append("video", createVideo());

    const response = await post(createRequest(formData));

    await expectErrorResponse(response, {
      code: "PROMPT_REQUIRED",
      field: "prompt",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects a blank prompt", async () => {
    const { analyzeVideo, post } = createHarness();
    const response = await post(
      createRequest(createValidFormData({ prompt: " \t\r\n " })),
    );

    await expectErrorResponse(response, {
      code: "PROMPT_REQUIRED",
      field: "prompt",
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });

  it("rejects a prompt above the character limit", async () => {
    const { analyzeVideo, post } = createHarness();
    const response = await post(
      createRequest(
        createValidFormData({ prompt: "x".repeat(MAX_PROMPT_LENGTH + 1) }),
      ),
    );

    await expectErrorResponse(response, {
      code: "PROMPT_TOO_LONG",
      field: "prompt",
      message: PROMPT_VALIDATION_MESSAGES.excessive,
      status: 400,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });
});

describe("POST /api/analyze environment handling", () => {
  it("returns a safe configuration error when environment loading fails", async () => {
    const environmentFailure = `Invalid configuration: ${TEST_API_KEY}`;
    const analyzeVideo = createAnalyzeMock();
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => {
        throw new Error(environmentFailure);
      },
    });

    const response = await post(createRequest(createValidFormData()));

    await expectErrorResponse(response, {
      code: "CONFIGURATION_ERROR",
      secrets: [TEST_API_KEY, environmentFailure],
      status: 503,
    });
    expect(analyzeVideo).not.toHaveBeenCalled();
  });
});

describe("POST /api/analyze success", () => {
  it("passes exact validated inputs and returns the application envelope safely", async () => {
    const analyzeVideo = createAnalyzeMock();
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    });
    const request = createRequest(
      createValidFormData({ prompt: `  ${DEFAULT_PROMPT}  ` }),
    );

    const response = await post(request);

    expect(analyzeVideo).toHaveBeenCalledTimes(1);
    const input = analyzeVideo.mock.calls[0]?.[0];
    expect(input).toEqual({
      apiKey: TEST_API_KEY,
      model: TEST_MODEL,
      prompt: DEFAULT_PROMPT,
      requestSignal: request.signal,
      video: expect.any(File),
    });
    expect(input?.video).toMatchObject({
      name: "reel.mp4",
      size: 3,
      type: "video/mp4",
    });
    expect(Array.from(new Uint8Array(await input!.video.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");

    const responseText = await response.text();
    expect(responseText).not.toContain(TEST_API_KEY);
    expect(responseText).not.toContain("apiKey");

    const body = JSON.parse(responseText) as unknown;
    expect(body).toEqual({ ok: true, result: validResult });
    expect(analyzeApiResponseSchema.parse(body)).toEqual(body);
  });
});

describe("POST /api/analyze failure mapping", () => {
  it.each(
    [
      ["UPLOAD_FAILED", 502],
      ["VIDEO_PROCESSING_FAILED", 422],
      ["ANALYSIS_TIMEOUT", 504],
      ["ANALYSIS_FAILED", 502],
      ["INVALID_MODEL_OUTPUT", 502],
    ] satisfies ReadonlyArray<readonly [GeminiAnalysisFailure, number]>,
  )("maps %s to a safe %i response", async (kind, status) => {
    const privateProviderDetails = `${TEST_API_KEY}: private provider failure`;
    const analyzeVideo = vi.fn<AnalyzeVideo>(
      async (): Promise<AnalysisResult> => {
        throw new GeminiAnalysisError(
          kind,
          new Error(privateProviderDetails),
        );
      },
    );
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    });

    const response = await post(createRequest(createValidFormData()));

    await expectErrorResponse(response, {
      code: kind,
      secrets: [TEST_API_KEY, privateProviderDetails],
      status,
    });
  });

  it("rejects a malformed result returned by the injected analysis dependency", async () => {
    const malformedResult = {
      ...validResult,
      problems: [
        {
          ...validResult.problems[0],
          confidence: 2,
        },
      ],
    };
    const analyzeVideo = vi.fn<AnalyzeVideo>(
      async (): Promise<AnalysisResult> =>
        malformedResult as unknown as AnalysisResult,
    );
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    });

    const response = await post(createRequest(createValidFormData()));

    await expectErrorResponse(response, {
      code: "INVALID_MODEL_OUTPUT",
      status: 502,
    });
  });

  it("maps an unknown error to a safe internal error", async () => {
    const privateError = `Unexpected stack detail containing ${TEST_API_KEY}`;
    const analyzeVideo = vi.fn<AnalyzeVideo>(
      async (): Promise<AnalysisResult> => {
        throw new Error(privateError);
      },
    );
    const post = createPostHandler({
      analyzeVideo,
      getEnvironment: () => environment,
    });

    const response = await post(createRequest(createValidFormData()));

    await expectErrorResponse(response, {
      code: "INTERNAL_ERROR",
      secrets: [TEST_API_KEY, privateError],
      status: 500,
    });
  });
});
