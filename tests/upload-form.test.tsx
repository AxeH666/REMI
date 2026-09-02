// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UploadForm } from "@/components/upload-form";
import fixture from "@/fixtures/analysis-result.json";
import {
  ANALYZE_ERROR_MESSAGES,
  type AnalyzeApiResponse,
} from "@/lib/analyze-api";
import { parseAnalysisResult } from "@/lib/analysis-schema";
import { DEFAULT_PROMPT } from "@/lib/validation";

const analysisFixture = parseAnalysisResult(fixture);
const fetchMock = vi.fn<typeof fetch>();

function makeVideo(name = "calm-reel.mp4", size?: number) {
  const file = new File(["video-bytes"], name, { type: "video/mp4" });

  if (size !== undefined) {
    Object.defineProperty(file, "size", { configurable: true, value: size });
  }

  return file;
}

function getFileInput() {
  return screen.getByLabelText("Reel video") as HTMLInputElement;
}

function apiResponse(body: AnalyzeApiResponse, status = 200): Response {
  return {
    json: vi.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

describe("UploadForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error("Unexpected network request."));
    vi.stubGlobal("fetch", fetchMock);

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:remi-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the empty state, required prompt, and real-analysis disclosure", () => {
    render(<UploadForm />);

    expect(
      screen.getByRole("heading", {
        name: "Find the moment your Reel stops feeling right.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Drop your MP4 here")).toBeInTheDocument();
    expect(getFileInput()).toBeRequired();
    expect(getFileInput()).toHaveAccessibleName("Reel video");

    const prompt = screen.getByRole("textbox", {
      name: "What should REMI inspect?",
    });
    expect(prompt).toHaveValue(DEFAULT_PROMPT);
    expect(prompt).toBeRequired();
    expect(
      screen.getByText(`${DEFAULT_PROMPT.length}/500 characters`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse Reel" }),
    ).toHaveAccessibleDescription(
      "Submitting sends this video and question to Gemini. REMI does not permanently store either.",
    );
    expect(screen.queryByText(/fixture|static preview/i)).not.toBeInTheDocument();
  });

  it("keeps the primary empty-state controls keyboard reachable", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.tab();
    expect(getFileInput()).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("textbox", { name: "What should REMI inspect?" }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Analyse Reel" })).toHaveFocus();
  });

  it("shows a selected MP4 preview and removes it", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.upload(getFileInput(), makeVideo());

    expect(screen.getByText("calm-reel.mp4")).toBeInTheDocument();
    expect(screen.getByText(/11 B/)).toBeInTheDocument();
    expect(screen.getByLabelText("Preview of calm-reel.mp4")).toHaveAttribute(
      "src",
      "blob:remi-preview",
    );
    expect(
      screen.getByRole("heading", { name: "Your Reel is ready." }),
    ).toBeInTheDocument();
    expect(getFileInput()).toHaveAttribute("tabindex", "-1");

    getFileInput().focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Change video" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText("Drop your MP4 here")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:remi-preview");
    expect(screen.getByTestId("workflow-status")).toHaveTextContent(
      "Video removed.",
    );
  });

  it("changes the selected video and revokes only the replaced preview", async () => {
    const user = userEvent.setup();
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:first-preview")
      .mockReturnValueOnce("blob:second-preview");
    render(<UploadForm />);

    await user.upload(getFileInput(), makeVideo("first.mp4"));
    await user.click(screen.getByRole("button", { name: "Change video" }));
    fireEvent.change(getFileInput(), {
      target: { files: [makeVideo("second.mp4")] },
    });

    expect(screen.getByText("second.mp4")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview of second.mp4")).toHaveAttribute(
      "src",
      "blob:second-preview",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first-preview");
  });

  it("accepts drag-and-drop and submits the state-held file as multipart data", async () => {
    const deferred = deferredResponse();
    fetchMock.mockReturnValue(deferred.promise);
    render(<UploadForm />);
    const droppedVideo = makeVideo("dropped-reel.mp4");
    const files = Object.assign([droppedVideo], {
      item: (index: number) => [droppedVideo][index] ?? null,
    });

    fireEvent.drop(screen.getByTestId("video-drop-zone"), {
      dataTransfer: { dropEffect: "copy", files },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toBeUndefined();
    const body = options?.body as FormData;
    const submittedVideo = body.get("video") as File;
    expect(submittedVideo.name).toBe("dropped-reel.mp4");
    expect(submittedVideo.type).toBe("video/mp4");
    expect(body.get("prompt")).toBe(DEFAULT_PROMPT);
  });

  it("enforces the server-provided public video size limit", () => {
    render(<UploadForm maxVideoSizeMb={1} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeVideo("too-large.mp4", 1024 * 1024 + 1)] },
    });

    expect(
      screen.getAllByText("Choose an MP4 video no larger than 1 MB."),
    ).toHaveLength(2);
    expect(screen.getByText("Up to 1 MB")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects multiple or unsupported candidates without falling back to an old file", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);
    await user.upload(getFileInput(), makeVideo());

    const invalidFile = new File(["notes"], "notes.txt", {
      type: "text/plain",
    });
    fireEvent.change(getFileInput(), { target: { files: [invalidFile] } });
    await user.click(screen.getByRole("button", { name: "Analyse Reel" }));

    expect(
      screen.getAllByText(
        "Choose an MP4 video. Other file types are not supported.",
      ),
    ).toHaveLength(2);
    expect(screen.getByText("calm-reel.mp4")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.drop(screen.getByTestId("video-drop-zone"), {
      dataTransfer: {
        files: [makeVideo("first.mp4"), makeVideo("second.mp4")],
      },
    });
    expect(screen.getAllByText("Choose one MP4 video at a time.")).toHaveLength(
      2,
    );
  });

  it("focuses and describes client-side missing fields", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.click(screen.getByRole("button", { name: "Analyse Reel" }));
    expect(getFileInput()).toHaveFocus();
    expect(getFileInput()).toHaveAttribute("aria-invalid", "true");

    await user.upload(getFileInput(), makeVideo());
    const prompt = screen.getByRole("textbox", {
      name: "What should REMI inspect?",
    });
    await user.clear(prompt);
    await user.click(screen.getByRole("button", { name: "Analyse Reel" }));

    expect(prompt).toHaveFocus();
    expect(prompt).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows one honest indeterminate analysing state and blocks duplicate submissions", () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });
    const form = screen.getByRole("button", { name: "Analyse Reel" }).closest(
      "form",
    );
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", {
        name: "Uploading and analysing your Reel.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Uploading and analysing/i }),
    ).toBeDisabled();
    expect(getFileInput()).toBeDisabled();
    expect(screen.getByTestId("workflow-status")).toHaveTextContent(
      "Video upload and analysis started.",
    );
  });

  it("renders the validated server result, keeps the preview, and focuses output", async () => {
    fetchMock.mockResolvedValue(
      apiResponse({ ok: true, result: analysisFixture }),
    );
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });

    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));

    expect(await screen.findByText(analysisFixture.verdict)).toBeInTheDocument();
    expect(screen.getByText("Analysis complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Analysis output")).toHaveFocus();
    expect(screen.getByLabelText("Preview of calm-reel.mp4")).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByTestId("workflow-status")).toHaveTextContent(
      "Analysis complete. Results are ready.",
    );

    const firstProblem = screen
      .getByRole("heading", { name: analysisFixture.problems[0].title })
      .closest("article");
    expect(firstProblem).not.toBeNull();
    const card = within(firstProblem as HTMLElement);
    expect(firstProblem).toHaveTextContent("00:00");
    expect(firstProblem).toHaveTextContent("00:02");
    expect(card.getByText(analysisFixture.problems[0].observation)).toBeInTheDocument();
    expect(card.getByText(analysisFixture.problems[0].interpretation)).toBeInTheDocument();
    expect(card.getByText(analysisFixture.problems[0].instruction)).toBeInTheDocument();
    expect(card.getByLabelText("Confidence: high, 94 percent")).toBeInTheDocument();
    for (const problem of analysisFixture.problems) {
      expect(screen.getByRole("heading", { name: problem.title })).toBeInTheDocument();
    }
    for (const strength of analysisFixture.keep) {
      expect(screen.getByText(strength)).toBeInTheDocument();
    }
    for (const limitation of analysisFixture.limitations) {
      expect(screen.getByText(limitation)).toBeInTheDocument();
    }
  });

  it("maps a server field error back to the field and preserves the selection", async () => {
    fetchMock.mockResolvedValue(
      apiResponse(
        {
          ok: false,
          error: {
            code: "VIDEO_TOO_LARGE",
            field: "video",
            message: "Choose an MP4 video no larger than 1 MB.",
          },
        },
        413,
      ),
    );
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });

    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));

    await waitFor(() => expect(getFileInput()).toHaveFocus());
    expect(getFileInput()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("calm-reel.mp4")).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("shows a focused safe provider error, preserves input, and can retry", async () => {
    fetchMock
      .mockResolvedValueOnce(
        apiResponse(
          {
            ok: false,
            error: {
              code: "ANALYSIS_FAILED",
              message: ANALYZE_ERROR_MESSAGES.ANALYSIS_FAILED,
            },
          },
          502,
        ),
      )
      .mockResolvedValueOnce(apiResponse({ ok: true, result: analysisFixture }));
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });

    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));

    const errorHeading = await screen.findByRole("heading", {
      name: "Analysis didn't finish.",
    });
    const errorPanel = errorHeading.closest("[tabindex='-1']");
    expect(errorPanel).toHaveFocus();
    expect(screen.getByText(ANALYZE_ERROR_MESSAGES.ANALYSIS_FAILED)).toBeInTheDocument();
    expect(screen.getByText("calm-reel.mp4")).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Try analysis again" }),
    );
    expect(await screen.findByText(analysisFixture.verdict)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("turns malformed and network responses into safe request errors", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ providerError: "secret detail" }),
        ok: false,
        status: 500,
      } as unknown as Response)
      .mockRejectedValueOnce(new Error("socket included internal details"));
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });

    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));
    expect(
      await screen.findByText("REMI received an invalid response. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/i)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Try analysis again" }),
    );
    expect(
      await screen.findByText(
        "REMI could not reach the analysis service. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/socket included/i)).not.toBeInTheDocument();
  });

  it("aborts an in-flight request on preview failure and ignores its late success", async () => {
    const deferred = deferredResponse();
    fetchMock.mockReturnValue(deferred.promise);
    render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });
    const preview = screen.getByLabelText("Preview of calm-reel.mp4");

    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal;
    fireEvent.error(preview);

    expect(signal.aborted).toBe(true);
    expect(
      screen.getAllByText(
        "This video could not be previewed. Choose another MP4 file.",
      ),
    ).toHaveLength(2);

    await act(async () => {
      deferred.resolve(apiResponse({ ok: true, result: analysisFixture }));
      await Promise.resolve();
    });
    expect(screen.queryByText(analysisFixture.verdict)).not.toBeInTheDocument();
  });

  it("aborts on unmount and revokes the current preview URL", () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    const { unmount } = render(<UploadForm />);
    fireEvent.change(getFileInput(), { target: { files: [makeVideo()] } });
    fireEvent.click(screen.getByRole("button", { name: "Analyse Reel" }));
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal;

    unmount();

    expect(signal.aborted).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:remi-preview");
  });
});
