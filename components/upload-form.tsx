"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type RefObject,
} from "react";

import { AnalysisResults } from "@/components/analysis-results";
import { AnalyzeClientError, requestAnalysis } from "@/lib/analyze-client";
import type { AnalysisResult } from "@/lib/analysis-schema";
import {
  DEFAULT_PROMPT,
  formatFileSize,
  MAX_PROMPT_LENGTH,
  MAX_VIDEO_SIZE_MB,
  validatePrompt,
  validateVideo,
} from "@/lib/validation";

const MULTIPLE_FILES_ERROR = "Choose one MP4 video at a time.";
const PREVIEW_ERROR =
  "This video could not be previewed. Choose another MP4 file.";

type WorkflowPhase =
  | "empty"
  | "selected"
  | "analysing"
  | "input-error"
  | "request-error"
  | "completed";

type FormErrors = {
  video?: string;
  prompt?: string;
};

type UploadFormProps = {
  maxVideoSizeMb?: number;
};

export function UploadForm({
  maxVideoSizeMb = MAX_VIDEO_SIZE_MB,
}: UploadFormProps) {
  const [phase, setPhase] = useState<WorkflowPhase>("empty");
  const [video, setVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [requestError, setRequestError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const resultsRegionRef = useRef<HTMLElement>(null);
  const requestErrorRef = useRef<HTMLDivElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pendingFieldFocusRef = useRef<"video" | "prompt" | null>(null);

  const isAnalysing = phase === "analysing";
  const videoDescriptionIds = [
    !video ? "video-help" : null,
    errors.video ? "video-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (phase === "completed") {
      resultsRegionRef.current?.focus();
    } else if (phase === "request-error") {
      requestErrorRef.current?.focus();
    } else if (phase === "input-error") {
      if (pendingFieldFocusRef.current === "video") {
        fileInputRef.current?.focus();
      } else if (pendingFieldFocusRef.current === "prompt") {
        promptRef.current?.focus();
      }

      pendingFieldFocusRef.current = null;
    }
  }, [errors.prompt, errors.video, phase]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const controller = requestControllerRef.current;
      requestControllerRef.current = null;
      controller?.abort();
    },
    [],
  );

  function setAcceptedVideo(file: File) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setVideo(file);
    setErrors((current) => ({ ...current, video: undefined }));
    setAnalysisResult(null);
    setRequestError(null);
    setPhase(errors.prompt ? "input-error" : "selected");
    setStatusMessage(`${file.name} selected.`);
  }

  function handleCandidate(file: File) {
    if (requestControllerRef.current) {
      return false;
    }

    const videoError = validateVideo(file, maxVideoSizeMb);

    if (videoError) {
      setErrors((current) => ({ ...current, video: videoError }));
      setAnalysisResult(null);
      setRequestError(null);
      setPhase("input-error");
      return false;
    }

    setAcceptedVideo(file);
    return true;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const candidate = event.currentTarget.files?.[0];

    if (candidate && !handleCandidate(candidate)) {
      event.currentTarget.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (requestControllerRef.current) {
      return;
    }

    if (event.dataTransfer.files.length !== 1) {
      setErrors((current) => ({
        ...current,
        video: MULTIPLE_FILES_ERROR,
      }));
      setAnalysisResult(null);
      setRequestError(null);
      setPhase("input-error");
      return;
    }

    const candidate = event.dataTransfer.files[0];
    if (candidate) handleCandidate(candidate);
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextPrompt = event.currentTarget.value;
    setPrompt(nextPrompt);
    setErrors((current) => ({ ...current, prompt: undefined }));
    setAnalysisResult(null);
    setRequestError(null);

    if (phase === "completed" || phase === "request-error") {
      setPhase(video ? "selected" : "empty");
    } else if (phase === "input-error" && !errors.video) {
      setPhase(video ? "selected" : "empty");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requestControllerRef.current) {
      return;
    }

    const nextErrors: FormErrors = {
      video: errors.video ?? validateVideo(video, maxVideoSizeMb) ?? undefined,
      prompt: validatePrompt(prompt) ?? undefined,
    };

    if (nextErrors.video || nextErrors.prompt) {
      setErrors(nextErrors);
      setAnalysisResult(null);
      setRequestError(null);
      pendingFieldFocusRef.current = nextErrors.video ? "video" : "prompt";
      setPhase("input-error");

      return;
    }

    if (!video) return;

    const selectedVideo = video;
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setErrors({});
    setAnalysisResult(null);
    setRequestError(null);
    setPhase("analysing");
    setStatusMessage("Video upload and analysis started.");

    try {
      const result = await requestAnalysis({
        video: selectedVideo,
        prompt,
        signal: controller.signal,
      });

      if (requestControllerRef.current !== controller) return;

      setAnalysisResult(result);
      setPhase("completed");
      setStatusMessage("Analysis complete. Results are ready.");
    } catch (error) {
      if (
        requestControllerRef.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }

      if (error instanceof AnalyzeClientError && error.field) {
        setErrors({ [error.field]: error.message });
        pendingFieldFocusRef.current = error.field;
        setPhase("input-error");
        setStatusMessage("Check the highlighted input and try again.");
        return;
      }

      const message =
        error instanceof AnalyzeClientError
          ? error.message
          : "REMI could not complete the analysis. Please try again.";
      setRequestError(message);
      setPhase("request-error");
      setStatusMessage(`Analysis did not finish. ${message}`);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }

  function handleRemove() {
    const controller = requestControllerRef.current;
    requestControllerRef.current = null;
    controller?.abort();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
    setVideo(null);
    setErrors({});
    setAnalysisResult(null);
    setRequestError(null);
    setPhase("empty");
    setStatusMessage("Video removed.");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.focus();
    }
  }

  function handleChangeVideo() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f0e9] text-[#17201f]">
      <p
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        data-testid="workflow-status"
      >
        {statusMessage}
      </p>

      <header className="border-b border-white/10 bg-[#13201f] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-full bg-[#c8ff72] text-sm font-black text-[#13201f]"
            >
              R
            </span>
            <div>
              <p className="text-base font-black tracking-[0.18em]">REMI</p>
              <p className="hidden text-xs text-white/55 sm:block">
                Reel Evaluation &amp; Moment Inspector
              </p>
            </div>
          </div>

          <span className="rounded-full border border-white/15 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/75">
            Gemini analysis
          </span>
        </div>
      </header>

      <main>
        <section className="border-b border-[#c8cbc2] bg-[#17201f] text-white">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8ff72]">
                Creative direction, moment by moment
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Find the moment your Reel stops feeling right.
              </h1>
            </div>

            <div className="border-l-2 border-[#c8ff72] pl-5 text-sm leading-6 text-white/70 sm:text-base">
              REMI reviews the finished execution and turns visible, audible
              evidence into exact edits or reshoots.
            </div>
          </div>
        </section>

        <section className="border-b border-[#c8cbc2] bg-[#f8f7f1]">
          <div className="mx-auto flex max-w-[1480px] flex-wrap gap-x-7 gap-y-2 px-4 py-3 text-xs font-semibold text-[#53605d] sm:px-6 lg:px-8">
            <span className="flex items-center gap-2">
              <CheckIcon /> MP4 only
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon /> Up to {maxVideoSizeMb} MB
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon /> No permanent app storage
            </span>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1480px] items-start gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(21rem,0.72fr)_minmax(0,1.28fr)] lg:px-8 lg:py-10">
          <form
            aria-busy={isAnalysing}
            className="rounded-3xl border border-[#c8cbc2] bg-white p-5 shadow-[0_20px_55px_rgba(23,32,31,0.08)] sm:p-7 lg:sticky lg:top-6"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#67736f]">
                  New analysis
                </p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">
                  Add your finished Reel
                </h2>
              </div>
              <span className="font-mono text-xs text-[#53605c]">01 / 02</span>
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  className="text-sm font-bold text-[#273331]"
                  htmlFor="reel-video"
                  id="reel-video-label"
                >
                  Reel video
                </label>
                <span className="text-xs text-[#5d6965]">Required</span>
              </div>

              <div
                className={`relative rounded-2xl border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-[#6f9d31] bg-[#f1ffdc]"
                    : errors.video
                      ? "border-[#c76149] bg-[#fff8f5]"
                    : "border-[#66736d] bg-[#fbfcf8] hover:border-[#46534e] hover:bg-white"
                }`}
                data-testid="video-drop-zone"
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!requestControllerRef.current) setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (
                    !(nextTarget instanceof Node) ||
                    !event.currentTarget.contains(nextTarget)
                  ) {
                    setIsDragging(false);
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  accept="video/mp4,.mp4"
                  aria-describedby={videoDescriptionIds || undefined}
                  aria-invalid={Boolean(errors.video)}
                  aria-labelledby="reel-video-label"
                  className="peer sr-only"
                  disabled={isAnalysing}
                  id="reel-video"
                  name="video"
                  onChange={handleFileChange}
                  required
                  tabIndex={video ? -1 : undefined}
                  type="file"
                />

                {video && previewUrl ? (
                  <div className="overflow-hidden rounded-[0.9rem] bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#273331]">
                    <div className="relative aspect-video overflow-hidden bg-[#0d1514]">
                      <video
                        aria-label={`Preview of ${video.name}`}
                        className="size-full object-contain"
                        controls
                        onError={() => {
                          const controller = requestControllerRef.current;
                          requestControllerRef.current = null;
                          controller?.abort();

                          setErrors((current) => ({
                            ...current,
                            video: PREVIEW_ERROR,
                          }));
                          setAnalysisResult(null);
                          setRequestError(null);
                          pendingFieldFocusRef.current = "video";
                          setPhase("input-error");
                          setStatusMessage("Video preview failed.");
                        }}
                        playsInline
                        preload="metadata"
                        src={previewUrl}
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.13em] text-white">
                        Local preview
                      </span>
                    </div>

                    <div className="p-4">
                      <p
                        className="truncate text-sm font-bold text-[#1d2927]"
                        title={video.name}
                      >
                        {video.name}
                      </p>
                      <p className="mt-1 text-xs text-[#6a7672]">
                        {formatFileSize(video.size)} &middot; MP4
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-[#9ba7a2] px-3.5 py-2 text-xs font-bold text-[#273331] transition hover:border-[#273331] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#273331] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isAnalysing}
                          onClick={handleChangeVideo}
                          type="button"
                        >
                          Change video
                        </button>
                        <button
                          className="rounded-full px-3.5 py-2 text-xs font-bold text-[#a34330] transition hover:bg-[#fff0eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a34330] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isAnalysing}
                          onClick={handleRemove}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    className="flex min-h-56 flex-col items-center justify-center px-5 py-8 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#273331]"
                    htmlFor="reel-video"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-[#17201f] text-white">
                      <UploadIcon />
                    </span>
                    <span className="mt-4 text-base font-bold text-[#202c2a]">
                      {isDragging
                        ? "Release to use this video"
                        : "Drop your MP4 here"}
                    </span>
                    <span className="mt-1 text-sm text-[#66726e]">
                      or <span className="underline">choose a file</span> from
                      your device
                    </span>
                    <span
                      className="mt-4 text-xs font-medium text-[#5d6965]"
                      id="video-help"
                    >
                      One MP4, up to {maxVideoSizeMb} MB
                    </span>
                  </label>
                )}
              </div>

              {errors.video ? (
                <p
                  className="mt-2 flex gap-2 text-sm font-medium text-[#a34330]"
                  id="video-error"
                >
                  <ErrorIcon /> {errors.video}
                </p>
              ) : null}
            </div>

            <div className="mt-7 border-t border-[#dfe2dc] pt-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  className="text-sm font-bold text-[#273331]"
                  htmlFor="analysis-prompt"
                >
                  What should REMI inspect?
                </label>
                <span className="flex shrink-0 items-center gap-2 text-xs text-[#5d6965]">
                  <span>Required</span>
                  <span aria-hidden="true">&middot;</span>
                  <span id="prompt-count" className="tabular-nums">
                    {prompt.length}/{MAX_PROMPT_LENGTH} characters
                  </span>
                </span>
              </div>
              <textarea
                ref={promptRef}
                aria-describedby={`prompt-help prompt-count${errors.prompt ? " prompt-error" : ""}`}
                aria-invalid={Boolean(errors.prompt)}
                className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#66736d] bg-[#fbfcf8] px-4 py-3 text-[0.95rem] leading-6 text-[#17201f] outline-none transition placeholder:text-[#68746f] focus:border-[#273331] focus:ring-4 focus:ring-[#c8ff72]/50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAnalysing}
                id="analysis-prompt"
                maxLength={MAX_PROMPT_LENGTH}
                name="prompt"
                onChange={handlePromptChange}
                required
                value={prompt}
              />
              <p className="mt-2 text-xs leading-5 text-[#5d6965]" id="prompt-help">
                Ask about delivery, pacing, framing, edits, sound, or the
                overall feeling.
              </p>
              {errors.prompt ? (
                <p
                  className="mt-2 flex gap-2 text-sm font-medium text-[#a34330]"
                  id="prompt-error"
                >
                  <ErrorIcon /> {errors.prompt}
                </p>
              ) : null}
            </div>

            <button
              aria-describedby="analysis-privacy-note"
              className="mt-7 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#17201f] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#263431] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#55772d] disabled:cursor-wait disabled:opacity-70"
              disabled={isAnalysing}
              type="submit"
            >
              {isAnalysing ? (
                <>
                  <SpinnerIcon /> Uploading and analysing&hellip;
                </>
              ) : phase === "completed" ? (
                <>
                  Analyse again <ArrowIcon />
                </>
              ) : phase === "request-error" ? (
                <>
                  Try analysis again <ArrowIcon />
                </>
              ) : (
                <>
                  Analyse Reel <ArrowIcon />
                </>
              )}
            </button>

            <p
              className="mt-3 text-center text-xs leading-5 text-[#5d6965]"
              id="analysis-privacy-note"
            >
              Submitting sends this video and question to Gemini. REMI does not
              permanently store either.
            </p>
            <p className="mt-2 text-center text-xs leading-5 text-[#5d6965]">
              Creative feedback only&mdash;not medical advice or a guarantee of
              platform performance.
            </p>

          </form>

          <section
            ref={resultsRegionRef}
            aria-busy={isAnalysing}
            aria-label="Analysis output"
            className="min-w-0 rounded-3xl outline-none focus:ring-4 focus:ring-[#55772d]"
            tabIndex={-1}
          >
            {phase === "analysing" ? (
              <AnalysingState />
            ) : phase === "completed" && analysisResult ? (
              <div>
                <AnalysisResults result={analysisResult} />
                <button
                  className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#7c8783] bg-white px-5 py-3 text-sm font-bold text-[#273331] transition hover:border-[#273331] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#273331]"
                  onClick={handleRemove}
                  type="button"
                >
                  Review another Reel <ArrowIcon />
                </button>
              </div>
            ) : phase === "request-error" && requestError ? (
              <RequestErrorState
                containerRef={requestErrorRef}
                message={requestError}
              />
            ) : phase === "input-error" ? (
              <InputErrorState errors={errors} hasVideo={Boolean(video)} />
            ) : (
              <OutputPlaceholder
                phase={video ? "selected" : "empty"}
                video={video}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function OutputPlaceholder({
  phase,
  video,
}: {
  phase: "empty" | "selected";
  video: File | null;
}) {
  const isSelected = phase === "selected" && video;

  return (
    <div className="remi-break-anywhere flex min-h-[35rem] min-w-0 flex-col justify-between rounded-3xl border border-[#c8cbc2] bg-[#e9ebe4] p-6 sm:p-8 lg:min-h-[43rem] lg:p-10">
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.17em] text-[#53605c]">
          Analysis canvas
        </span>
        <span
          className={`size-3 rounded-full ${isSelected ? "bg-[#82ad42]" : "bg-[#aab1ad]"}`}
          title={isSelected ? "Video selected" : "Waiting for a video"}
        />
      </div>

      <div className="max-w-xl py-12">
        <span
          aria-hidden="true"
          className="font-mono text-5xl font-medium tracking-[-0.06em] text-[#b7bdb8] sm:text-7xl"
        >
          {isSelected ? "00:01" : "00:00"}
        </span>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-[#1b2725] sm:text-4xl">
          {isSelected ? "Your Reel is ready." : "Your critique will land here."}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#5d6965]">
          {isSelected
            ? `${video.name} is selected. Adjust your question, then start the analysis.`
            : "Choose a finished MP4 and tell REMI what feels off. Your structured critique will appear here after analysis."}
        </p>
      </div>

      <ol className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {["Timestamped evidence", "Exact corrections", "Strengths protected"].map(
          (item, index) => (
            <li
              className="border-t border-[#bfc5c0] pt-3 text-[#55615d]"
              key={item}
            >
              <span className="mr-2 font-mono text-xs text-[#53605c]">
                0{index + 1}
              </span>
              {item}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

function AnalysingState() {
  return (
    <div
      className="min-h-[35rem] overflow-hidden rounded-3xl border border-[#35423f] bg-[#17201f] p-6 text-white sm:p-8 lg:min-h-[43rem] lg:p-10"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.19em] text-[#c8ff72]">
          Gemini analysis in progress
        </span>
        <SpinnerIcon />
      </div>

      <div className="mt-20 max-w-2xl">
        <p className="font-mono text-sm text-white/70">VIDEO 00:00-END</p>
        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Uploading and analysing your Reel.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
          Keep this tab open. Gemini must receive and process the video before
          REMI can validate the critique, so this can take a while.
        </p>
      </div>

      <div className="mt-16 overflow-hidden rounded-full bg-white/10">
        <div className="remi-progress-bar h-2 w-1/3 rounded-full bg-[#c8ff72]" />
      </div>

      <ol className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
        <li className="border-t border-[#c8ff72] pt-3 text-white">
          01 &nbsp;Video selected &middot; Done
        </li>
        <li
          aria-current="step"
          className="border-t border-white/70 pt-3 text-white"
        >
          02 &nbsp;Upload and analysis &middot; In progress
        </li>
        <li className="border-t border-white/35 pt-3 text-white/70">
          03 &nbsp;Validated result &middot; Next
        </li>
      </ol>
    </div>
  );
}

function InputErrorState({
  errors,
  hasVideo,
}: {
  errors: FormErrors;
  hasVideo: boolean;
}) {
  const messages = [...new Set(Object.values(errors).filter(Boolean))];

  return (
    <div
      className="min-h-[28rem] rounded-3xl border border-[#d69b8e] bg-[#fff8f5] p-6 sm:p-8 lg:p-10"
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-full bg-[#a34330] text-white">
        <ErrorIcon />
      </span>
      <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-[#a34330]">
        Check your input
      </p>
      <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-[#2b211f] sm:text-4xl">
        {hasVideo
          ? "One detail needs attention."
          : "REMI needs an MP4 before it can begin."}
      </h2>
      <ul className="mt-6 max-w-xl space-y-3 text-sm leading-6 text-[#6e4037] sm:text-base">
        {messages.map((message) => (
          <li className="flex gap-3" key={message}>
            <span aria-hidden="true">—</span>
            <span>{message}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-[#76564f]">
        Correct the highlighted field and submit again. Nothing was sent to
        Gemini.
      </p>
    </div>
  );
}

function RequestErrorState({
  containerRef,
  message,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  message: string;
}) {
  return (
    <div
      ref={containerRef}
      aria-labelledby="request-error-heading"
      className="min-h-[28rem] rounded-3xl border border-[#d69b8e] bg-[#fff8f5] p-6 outline-none focus:ring-4 focus:ring-[#7d3b2d] sm:p-8 lg:p-10"
      tabIndex={-1}
    >
      <span className="grid size-11 place-items-center rounded-full bg-[#a34330] text-white">
        <ErrorIcon />
      </span>
      <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-[#a34330]">
        Analysis interrupted
      </p>
      <h2
        className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-[#2b211f] sm:text-4xl"
        id="request-error-heading"
      >
        Analysis didn&apos;t finish.
      </h2>
      <p className="mt-6 max-w-xl text-base leading-7 text-[#6e4037]">
        {message}
      </p>
      <p className="mt-8 text-sm text-[#76564f]">
        Your video and question are still selected. Nothing was saved by REMI,
        and you can try again.
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-[#688d37]"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m3 8.2 3.1 3.1L13 4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 11v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M8 5v3.5m0 2.5h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3 8h10m0 0L9.5 4.5M13 8l-3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 animate-spin"
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle
        className="opacity-25"
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        className="opacity-90"
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
