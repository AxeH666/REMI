# Architecture

## Status Labels

- **Current:** implemented in the working local POC.
- **Planned:** approved direction for a future PR; not implemented today.
- **Research:** unresolved details that must be verified during the owning PR.

## Current System

```text
Windows browser
    -> Railway HTTPS edge (production)
    -> Next.js private-access proxy
    -> Next.js page
    -> server-side Next.js analysis route
    -> route-level private-access check
    -> Gemini Files API / native video-and-audio input
    -> Gemini structured analysis
    -> Zod validation
    -> rendered critique
```

### Current Client

- Selects one MP4 and accepts one prompt.
- Performs client-side validation for fast feedback.
- Submits multipart form data and shows progress and safe errors.
- Renders only the application-owned validated result.
- Never receives the Gemini API key.

### Current Private Access

- Uses HTTP Basic authentication with the fixed usernames `owner` and `friend` and separate high-entropy passwords supplied through server-side environment variables.
- Runs an application-wide Next.js `proxy.ts` check before protected page and API requests.
- Repeats the authorization check inside `/api/analyze`, so bypassing or misconfiguring the page-level boundary does not expose the provider-backed action.
- Fails closed with a generic `503` response when access configuration is absent or invalid.
- Sends no-store, anti-framing, no-referrer and restrictive browser-permission headers on protected responses.
- Leaves only immutable Next.js assets and `/api/health` outside the credential challenge. The health endpoint exposes only generic readiness.

This design is intentionally limited to two trusted users. It adds no account database, password-reset flow or persistent session store.

### Current Server Route

- Validates environment configuration, prompt, MIME type and file size.
- Rejects cross-origin browser submissions.
- Uploads the video through the official Google Gen AI SDK.
- Requests structured output and validates it with Zod.
- Returns a strict success or error envelope.
- Best-effort deletes the named remote Gemini file.

### Current Gemini Boundary

Gemini inspects the complete supplied visual and audio streams, cites approximate timestamp ranges and produces structured JSON. The current schema also includes creative instructions and numeric confidence. Those fields remain implemented until the planned critique-only contract PR changes the prompt, schema, UI and tests together.

### Current Storage and Access Boundary

- The application is ready for private remote deployment but is not deployed by this PR.
- Development binds to `127.0.0.1`; production binds to `0.0.0.0` and uses the platform-assigned `PORT`.
- There is no database or permanent application video storage.
- The multipart `File` is uploaded directly as a `Blob`; REMI does not create a local temporary video copy.
- Provider deletion is best effort and does not guarantee immediate removal after a network or provider failure.

## Current File Handling

The current implementation uses the Gemini Files API through `@google/genai` 2.20.0.

- REMI polls the provider file until active, then sends its reference with the user prompt.
- The generation request includes the system prompt, JSON response MIME type and application schema. Zod is the final trust boundary.
- Cleanup runs independently so deletion failure cannot replace the primary result or error.
- If a future SDK path requires a local path, use a uniquely named operating-system temporary file and delete it in `finally`.

## Current Configuration

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash
MAX_VIDEO_MB=100
REMI_OWNER_PASSWORD=
REMI_FRIEND_PASSWORD=
```

`GEMINI_MODEL` and `MAX_VIDEO_MB` have validated server-side defaults. The Gemini key and both distinct access passwords are required at runtime. Provider limits must be verified during any implementation change rather than inferred from the example values.

## Current Railway Boundary

Railway Railpack detects and builds the existing Node.js application, then starts `npm run start`. Railway injects `PORT`; the production server listens on all container interfaces. The service's Railway dashboard configuration must set `/api/health` as its readiness check.

No legacy `railway.json` or `railway.toml` file is used because Railway has deprecated that format. Railway's newer stateful Infrastructure as Code workflow would add unnecessary project-specific deployment state for this single-service POC, so deployment settings remain an explicit post-merge owner action.

Railway terminates public TLS and supplies `X-Forwarded-Proto` and `X-Forwarded-Host`. The analysis route uses those values to compare the browser's `Origin` with the original public origin, while still rejecting `Sec-Fetch-Site: cross-site`. Local requests without forwarded headers retain the existing host-based check.

Railway currently requires request bodies to finish within five minutes and closes inactive HTTP requests after five minutes. REMI's 100 MB application limit and 110-second analysis timeout remain unchanged. A user still needs enough upload bandwidth to send the selected file inside Railway's upload window.

The deployment target is Railway Hobby or higher, not the Free plan's current 0.5 GB memory ceiling. The route materializes multipart input in the Node.js process before the Gemini upload, so peak memory must be measured with a representative near-limit video after deployment before applying a service resource cap.

## Approved Future Architecture

Every component below is planned and belongs to its own future PR. The implementation order is defined in `ROADMAP.md`.

```text
Owner or invited creator
    -> planned private access control
    -> Next.js REMI backend
         -> current Gemini full-video analysis
         -> planned deterministic visual/audio facts
         -> planned Instagram API integration
         -> planned creator-isolated metadata and critique store
    -> planned critique-only result
         -> fresh critique first
         -> separate relevant-history comparison second
```

### Implemented Private POC Access

The private-access component is implemented in `feat/private-poc-access` and becomes the stable baseline when merged. Deployment itself remains a post-merge owner action. High-entropy credentials prevent anonymous public consumption of the API-backed route, and `GEMINI_API_KEY` remains server-side.

### Planned Critique-Only Contract

The response will describe the observed moment, what feels wrong, the likely viewer effect and supporting visible or audible evidence. It will contain no creative solutions, scores or forced findings. The planned contract is defined in `AI_ANALYSIS_CONTRACT.md`.

### Planned Visual Timing and Layout Pipeline

Gemini's normal video inspection may miss sub-second visuals. FFmpeg or an equivalent deterministic tool will be evaluated for detecting visual changes, measuring exact display intervals and extracting only relevant frames and timing facts.

The evidence should help Gemini inspect inserted images, screenshots, text cards, captions, cropping, small or unreadable text, clutter, rapid cuts, sub-second images, overlong images and whether a viewer has enough time to understand an image. The full Reel will still be supplied to Gemini so preprocessing does not reduce its existing contextual analysis.

No exact frame rate or sampling strategy is approved until representative Reels have been tested.

### Planned Audio and Sensory-Load Pipeline

Gemini will continue to provide the human-like judgment about music, speech, sound effects, emotional fit and combined sensory load. FFmpeg or another deterministic tool may provide measurable loudness, peak, clipping and timing facts. Deterministic measurements and model interpretations must remain distinguishable.

### Planned Instagram Boundary

REMI's backend—not Gemini—will manage Instagram authorization, token handling and retrieval of the signed-in creator's own Reels and available Insights through Instagram's official API.

Exact Meta permission names, professional-account eligibility, accessible metrics, token lifecycle and review requirements are **research**, not finalized API guarantees. They must be verified against current official Meta documentation during `feat/instagram-connection`.

### Planned Creator Memory

A persistent store may contain:

- structured Reel critiques;
- verified Instagram performance metrics;
- Reel purpose, format, posting date and duration;
- repeated observation tags; and
- model, prompt and schema versions.

All records must be scoped to one creator identity. The invited friend's mental-health history must never be queried or compared with the owner's MMA, engineering or startup history. Raw Reel videos will not be retained permanently by default. Deletion and privacy controls are required before broader product access.

### Planned Two-Stage Historical Comparison

New unpublished Reels will be processed in two distinct stages:

1. A fresh critique receives the Reel and prompt without historical performance data.
2. A separate comparison receives that completed critique plus only relevant Reels from the same creator's history.

Historical context may add evidence but cannot overwrite or bias the fresh critique. Results should use counts, such as `Observed in 4 of 6 comparable Reels.`, rather than confidence scores. REMI may report that a pattern appeared repeatedly in weaker-performing Reels or may have contributed to performance, but it must never claim proven causation because distribution and other external factors also influence reach.

## Failure and Trust Boundaries

- Browser validation is only a usability aid; server validation protects provider calls.
- Provider errors become safe application errors.
- Invalid model output is rejected rather than partially rendered.
- The current upload, readiness and generation workflow has an overall timeout. Polling and generation receive an abort signal.
- The current SDK cannot cancel an in-flight Files API byte upload. If a timed-out upload later returns a provider file name, REMI schedules bounded best-effort deletion.
- Remote deletion has its own shorter timeout and never replaces the primary result or error.
- The browser rejects malformed or status-inconsistent API envelopes.
- Model output, preprocessing output and external API data are untrusted inputs.
- Verified Instagram metrics must remain distinguishable from model interpretation.
- Historical comparison must not cross creator boundaries.

## Intentionally Excluded

The approved architecture does not include generic viral datasets in live analysis, Gemini fine-tuning, virality prediction, universal cross-creator benchmarks, automatic creative rewriting, permanent raw-video storage, confidence scores, a full analytics dashboard or automatic Instagram posting. Public datasets may later be used only for offline evaluation.
