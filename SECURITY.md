# Security and Privacy

REMI processes unpublished creator videos. Treat every uploaded video as private, even during local development.

## Secrets

- Store the Gemini key only in `.env.local` during local development and in server-side platform variables for deployment.
- Treat the previously used Gemini key as compromised. Revoke it and create a new key for deployment.
- Never use a variable beginning with `NEXT_PUBLIC_` for the key.
- Keep `REMI_OWNER_PASSWORD` and `REMI_FRIEND_PASSWORD` server-side and give them different, randomly generated values.
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
- The UI should state that REMI provides perceptual-friction critique, not medical or platform-performance guarantees.

## Deployment Baseline

Do not deploy an unmerged branch. Private access is merged into `main`; every deployment must use an uncompromised Gemini key and configure both access passwords before exposing a Railway domain. Never reuse the previously compromised key.

The development script binds to `127.0.0.1`. The production script binds to `0.0.0.0` so Railway can reach its assigned `PORT`; private access must therefore remain configured and enabled in every deployed environment.

## Private POC Access

The private deployment is limited to the owner and one invited friend.

- The fixed usernames are `owner` and `friend`; each has a distinct 24-128 character non-space printable-ASCII password.
- HTTP Basic credentials are checked by the application-wide Next.js proxy and again inside the Gemini-backed analysis route.
- Missing or invalid access configuration fails closed.
- Unauthorized requests cannot reach request-body parsing or Gemini work.
- The public `/api/health` endpoint returns only generic configuration readiness and never calls Gemini.
- Protected responses disable shared caching and framing, suppress referrers and restrict browser camera, microphone and geolocation permissions.
- The Gemini API key remains server-side in the deployed environment.
- Existing file validation, model-output validation, safe errors, timeouts and provider cleanup remain unchanged.

High-entropy credentials are the abuse control for this two-person trusted-user POC. This is not a general-purpose account system: it has no password recovery, persistent sessions, audit history or distributed rate limiter. Rotate a credential and redeploy immediately if it is exposed. Browsers may cache Basic credentials, so shared-device users must close the private session or clear site credentials.

## Manual-Analyser and Research-Phase Boundary

Throughout the six manual-analyser PRs and the later research-grounding phase:

- access remains limited to the owner and one friend;
- inputs remain manually uploaded MP4 files and user questions;
- no database, permanent application storage, Meta authorization, old-Reel import, Insights, persistent creator-account/profile layer or creator history is introduced;
- prompts and critiques are not permanently retained by the application; and
- any temporary frames, audio segments or other derived artifacts introduced by visual/audio analysis must be uniquely scoped and deleted after success, failure and timeout.

Research sources must be handled as general evidence with provenance and limitations. Research corpora and source materials must not be ingested or joined with private creator media. Keep research-derived rubric knowledge distinct from observations about a creator's Reel, and never treat it as automatic truth about that creator.

## Railway Transport Boundary

- Railway terminates public TLS and supplies the original HTTPS protocol and host through forwarded headers.
- The analysis route uses those headers for its same-origin decision and continues to reject cross-site browser requests.
- Use only the Railway HTTPS URL. Plain HTTP POST requests are converted to GET by Railway and cannot preserve video uploads.
- The upload must complete within Railway's five-minute request-body window. REMI's current analysis timeout remains below Railway's five-minute inactive-request limit.
- `/api/health` confirms configuration presence only; it does not validate credentials against Gemini or make a provider request.

## Post-Research Meta Security

Meta integration is not part of the manual-analyser or research-grounding phase. The requirements below apply only if a connected-data phase is separately approved afterward.

- REMI's backend must perform authorization, token exchange, token refresh or renewal, and API retrieval. Gemini must never receive Instagram credentials.
- Tokens must be encrypted at rest, excluded from client responses and logs, and scoped to the creator who authorized them.
- OAuth state and redirect handling must prevent account mix-ups and request forgery.
- Revocation, expiry and authorization removal must stop subsequent access cleanly.
- Exact Meta permissions, eligible account requirements, token lifecycle and app-review requirements must be verified from current official Meta documentation during the implementation PR. This document does not assert permission names or API guarantees.

## Post-Research Creator Data Isolation

Creator memory, databases and historical comparison are not immediate planned work. The requirements below apply only after both earlier phases and a separate implementation decision.

- Every stored Reel record, critique, metric and observation tag must belong to one authenticated creator identity.
- Authorization must be applied to every read, write, comparison and deletion operation.
- The invited friend's mental-health content must never be compared with or exposed to the owner's MMA, engineering or startup content.
- Verified Instagram metrics must remain distinguishable from model-generated observations.
- Model, prompt and schema versions must be retained with each stored critique so later comparisons remain auditable.
- Cross-creator isolation requires automated tests before creator memory is used.

## Post-Research Retention and Deletion

- Do not permanently retain raw Reel videos by default.
- Store only the creator-specific structured data needed for critique history and relevant comparison.
- Define and document retention periods for tokens, structured critiques, metrics and derived frames or audio facts before broader access.
- Treat extracted frames, audio segments and other derivatives as sensitive creator content; keep them temporary unless a separately approved requirement says otherwise.
- Provide creator-visible deletion and privacy controls before REMI becomes a broader product.
- Deletion design must cover application records, derived artifacts, provider files and revoked external tokens, while accurately disclosing any best-effort provider limitation.
