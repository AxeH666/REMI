# Security and Privacy

REMI processes unpublished creator videos. Treat every uploaded video as private, even during local development.

## Secrets

- Store the Gemini key only in `.env.local`.
- Never use a variable beginning with `NEXT_PUBLIC_` for the key.
- Never commit `.env.local`, API keys or copied request headers.
- Do not paste real API keys into issues, documentation, screenshots or chat.

## Video Handling

- Accept MP4 only in version 0.
- Enforce an explicit file-size limit in both the browser and server.
- Send video to Gemini only after the user submits the form.
- Do not save videos to a database or permanent object storage.
- The current SDK accepts the uploaded `File` directly, so the application does not write a local temporary copy. If a future SDK path requires one, use a uniquely named operating-system temporary file and delete it in `finally` after success or failure.
- Delete a named remotely uploaded Gemini file in `finally` after success or failure. If its name arrives only after the request has timed out, schedule the same bounded deletion when the upload resolves. Both paths are best effort because a provider or network failure can prevent immediate deletion; Gemini Files can otherwise remain available for up to 48 hours.
- Do not log file contents, video bytes, API keys, provider file identifiers, signed/upload URLs, complete prompts or complete critiques.

## Model Output

- Treat model output as untrusted data.
- Request JSON and validate it with Zod.
- Render text, not model-provided HTML.
- Do not expose provider errors or stack traces directly to the user.
- Return only the application's strict success or error envelope to the browser.
- Bound the user-facing analysis wait and cleanup requests with timeouts and convert failures into generic, actionable messages. The current SDK cannot cancel a Files API byte upload already in progress; if one finishes after the browser request ends, REMI schedules best-effort deletion of the returned provider file.

## Mental-Health Content

The model is evaluating presentation quality, not providing medical care.

- Do not diagnose the speaker or audience.
- Do not assess whether medical claims are clinically correct unless a future feature adds evidence retrieval and review.
- Do not recommend manipulation, shame, fear or overclaiming to increase engagement.
- The UI should state that REMI provides creative feedback, not medical or platform-performance guarantees.

## Before Sharing the App

Before exposing REMI outside the developer's machine, add authentication, abuse controls, upload isolation, deletion guarantees, rate limits and an explicit privacy notice. These are intentionally outside version 0.

The `dev` and `start` scripts bind Next.js to `127.0.0.1` so this unauthenticated proof of concept is not intentionally exposed to the local network. The analysis route also rejects browser requests from a different origin.
