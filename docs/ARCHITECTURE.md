# Architecture

## Status Labels

- **Current:** implemented in the stable private POC.
- **Planned:** approved direction for a future PR; not implemented today.
- **Research:** unresolved details that must be verified during the owning PR.

## Current System

```text
Windows browser
    -> Railway HTTPS edge (production deployment path)
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

Gemini inspects the complete supplied visual and audio streams, cites approximate timestamp ranges and produces structured JSON. The current prompt also broadly asks about hook, clarity, progression and payoff, and the schema includes creative instructions and numeric confidence. That legacy framing remains implemented until the critique-only contract PR narrows the scope, prohibits unsolicited script/content criticism and changes the prompt, schema, UI and tests together.

### Current Storage and Access Boundary

- Private access and Railway production support are implemented on `main`; live deployment health remains external operational state rather than an architecture claim.
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

## Planned Architecture Sequence

The implementation order is defined in `ROADMAP.md`. Planned components below are not present in the current runtime.

```text
Current private manual upload
    -> current Gemini full-video analysis

Phase 1: manual friction analyser
    -> critique-only response contract
    -> operational perceptual-friction rubric
    -> native Gemini review
       + deterministic visual-timing evidence
       + deterministic audio-friction evidence
    -> combined, deduplicated timestamped critique
    -> real-Reel evaluation gate

Phase 2: research-grounded viewer-friction knowledge
    -> reliable evidence with provenance and limitations
    -> validate, revise or remove operational rubric criteria

Phase 3: connected creator data, only if later approved
    -> Meta authorization and old-Reel/Insights retrieval
    -> creator-isolated persistent records
    -> separate historical comparison after fresh critique
```

### Phase 1 - Manual Friction Analyser

All six manual-analyser PRs retain the current private two-user access and manual one-MP4-plus-one-question boundary. They add no database, permanent storage, Meta access, old-Reel import, Insights or creator history.

The critique-only contract removes the current solution and confidence fields. The operational rubric then provides a versioned working framework for relating visible or audible execution evidence to likely viewer friction. It is not a scientific claim, universal benchmark or scoring model, and it must not invite unsolicited criticism of the creator's script, topic, claims or content choices.

The visual-timing pipeline may use FFmpeg or an equivalent deterministic tool to detect changes, measure display intervals and extract relevant frames. It must preserve the complete-video Gemini input, select no fixed sampling rate before representative testing, and keep all source and derived media temporary.

The audio-friction pipeline may provide measurable loudness, peak, clipping and timing facts. Gemini remains responsible for qualitative audio judgment. The audio PR does not own cross-modal conclusions.

Combined reporting aligns the native review, rubric, visual evidence and audio evidence by time, preserves their provenance and limitations, merges overlapping observations and assesses combined visual/audio load. It must return one coherent critique without scores, confidence percentages or duplicated findings.

Real-Reel evaluation uses manual uploads and external evaluation notes. It does not require application storage or add a runtime service.

### Phase 2 - Research-Grounded Viewer-Friction Knowledge

Only after real-Reel evaluation of the integrated manual analyser is completed and reviewed may a separate research phase validate and improve the operational rubric using reliable evidence. Sources, provenance, applicability, conflicting findings and limitations must remain reviewable. A criterion may be retained, changed or removed based on that evidence.

This phase does not create a live generic-content corpus, universal viewer model, confidence score or virality predictor. Its runtime architecture and PR breakdown are not yet approved.

### Phase 3 - Connected Creator Data

Meta integration and persistence are gated until both earlier phases are complete. If later approved, REMI's backend—not Gemini—will manage Meta authorization, token handling and retrieval of the authorized creator's own old Reels and available Insights. Exact permissions, account eligibility, metrics, token lifecycle and review requirements remain implementation research.

A later persistent store would require strict creator isolation, deletion controls and versioned records. Raw Reel videos would not be retained permanently by default. The invited friend's mental-health data must never be queried with the owner's MMA, engineering or startup data.

Any historical comparison would remain a second stage after an unchanged fresh critique. It could report observed counts and cautious association, but never confidence scores or proven causation. The exact connected-data PR order is not yet approved.

## Failure and Trust Boundaries

- Browser validation is only a usability aid; server validation protects provider calls.
- Provider errors become safe application errors.
- Invalid model output is rejected rather than partially rendered.
- The current upload, readiness and generation workflow has an overall timeout. Polling and generation receive an abort signal.
- The current SDK cannot cancel an in-flight Files API byte upload. If a timed-out upload later returns a provider file name, REMI schedules bounded best-effort deletion.
- Remote deletion has its own shorter timeout and never replaces the primary result or error.
- The browser rejects malformed or status-inconsistent API envelopes.
- Model output, preprocessing output, research evidence and future external API data are untrusted inputs.
- Future verified Meta metrics must remain distinguishable from model interpretation.
- Any future historical comparison must not cross creator boundaries.

## Intentionally Excluded

The approved architecture does not include generic viral datasets in live analysis, Gemini fine-tuning, virality prediction, universal cross-creator benchmarks, unsolicited script/content criticism, automatic creative rewriting, permanent raw-video storage, confidence scores, a full analytics dashboard or automatic Instagram posting. Reliable public evidence may later inform the research phase, but it is not automatically an input to personal critique.
