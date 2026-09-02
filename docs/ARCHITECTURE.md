# Architecture

## Version 0

```text
Windows browser
    -> Next.js page
    -> server-side Next.js route
    -> Gemini Files API / video input
    -> Gemini structured analysis
    -> Zod validation
    -> rendered critique
```

## Components

### Client

Responsibilities:

- file selection;
- prompt input;
- client-side validation for fast feedback;
- submit multipart form data;
- show upload/analysis progress;
- render safe structured results and errors.

The client must never receive the Gemini API key.

### Server Route

Responsibilities:

- validate environment configuration;
- validate prompt, MIME type and file size again;
- upload or pass the video using the official Google Gen AI SDK;
- send the system and user prompts;
- request structured output;
- validate the response with Zod;
- return a strict, stable application response;
- best-effort delete the remotely uploaded provider file;
- clean up any local temporary file if a future SDK path requires one.

### Gemini

Responsibilities:

- understand the supplied visual and audio streams;
- inspect performance, delivery and production execution;
- identify the highest-impact issues;
- cite approximate timestamp ranges;
- produce JSON matching the application schema.

## Proposed Project Structure

```text
app/
  api/analyze/route.ts
  page.tsx
  layout.tsx
components/
  upload-form.tsx
  analysis-results.tsx
  problem-card.tsx
lib/
  env.ts
  gemini.ts
  analyze-video.ts
  analyze-api.ts
  analyze-client.ts
  analysis-schema.ts
  prompts.ts
  validation.ts
tests/
  analysis-schema.test.ts
  validation.test.ts
docs/
```

The exact scaffold may change with the installed Next.js version. Keep responsibilities equivalent.

## Data Contract

The application response follows the schema in `AI_ANALYSIS_CONTRACT.md`. The UI depends on that application-owned schema, not directly on arbitrary Gemini prose.

## File Handling Decision

The current implementation uses the official Gemini Files API through `@google/genai` 2.20.0.

- The Node.js SDK accepts a `Blob`, so the multipart `File` is uploaded directly and REMI does not create a local temporary copy.
- REMI polls the provider file until it is active, then sends the file reference followed by the documented user-context prompt.
- The generation request uses the documented system prompt, JSON response MIME type and application JSON schema. Zod remains the final trust boundary.
- A Gemini file whose name is available during the request is deleted in `finally`. If the SDK returns the name only after a timed-out upload, REMI schedules deletion when that upload resolves. Remote deletion is best effort and bounded separately so cleanup cannot replace the primary result or error.
- Do not introduce S3, Supabase Storage or a database.
- If an SDK change later requires a path, use a uniquely named operating-system temporary file and always delete it in `finally`.

## Configuration

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash
MAX_VIDEO_MB=100
```

`GEMINI_MODEL` and `MAX_VIDEO_MB` must have validated server-side defaults. Confirm the provider's current limits during implementation rather than assuming the example limit is universally supported.

## Failure Boundaries

- Browser validation improves usability but is not trusted.
- Server validation protects resources and provider calls.
- Provider errors are translated to safe application errors.
- Invalid model output produces a retryable analysis error, not a partially fabricated result.
- The user-facing upload/readiness/generation wait has an overall timeout. Polling and generation receive an abort signal. The current SDK cannot cancel a Files API byte upload already in progress, so a timed-out upload may finish in the background; REMI schedules bounded best-effort deletion if it later returns a provider file name.
- Remote deletion has its own shorter timeout and never replaces the primary result or error.
- The browser accepts only the application-owned `{ ok, result | error }` envelope and rejects malformed or status-inconsistent responses.

## Why the Stack Is Intentionally Small

The POC tests Gemini's creative diagnostic ability. Databases, preprocessing pipelines and Instagram integrations cannot rescue a model that does not provide valuable critique. Add infrastructure only in response to a measured limitation.

## Local Network Boundary

The application is unauthenticated by design in version 0. The development and production-start scripts bind to `127.0.0.1`, and the analysis route rejects cross-origin browser requests. Do not change those boundaries without first adding the controls described in `SECURITY.md`.
