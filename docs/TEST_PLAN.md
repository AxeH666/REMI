# Test and Evaluation Plan

## Status

This document separates tests for the current working POC from acceptance criteria for planned future components. Planned criteria are not claims about implemented behavior.

## Current Automated Tests

### Validation

- Accept a valid MP4 under the configured limit.
- Reject a missing, empty, unsupported or oversized video.
- Reject an empty or excessive prompt.
- Reject missing required environment variables.

### Current Model Response

- Accept a complete valid response and fewer than three problems.
- Reject more than three problems, invalid timestamp ordering, malformed JSON and incomplete results.
- Validate the currently implemented `fixType`, `instruction` and numeric `confidence` fields.

These three fields remain part of the software baseline only. Their tests must be replaced, not silently removed, when `feat/critique-only-contract` changes the prompt, schema and UI.

### Current API Route

- Never return secrets.
- Map provider errors to safe statuses and messages.
- Repeat MIME type, file size, prompt and environment validation before provider work.
- Reject cross-origin browser submissions before configuration or provider work.
- Best-effort delete every named provider upload after success and failure.
- Schedule deletion when an upload resolves after request timeout.
- Return only the application-owned response envelope.

All normal automated tests replace the Gemini boundary with a fake or mock and must fail if a real provider or network call is attempted.

## Current Creative Evaluation Method

Use approximately ten Reels covering varied execution and subject matter:

- unnatural delivery or weak eye contact;
- flat voice or mismatched emotional tone;
- slow pacing, confusing edits or continuity breaks;
- bad music and voice balance;
- excessive or poorly timed on-screen text;
- fast-moving inserted images or screenshots;
- calm mental-health content that must not be pushed toward manipulation;
- energetic MMA or technical content where higher sensory load may be appropriate; and
- effective Reels where zero findings is the correct result.

For each Reel, a reviewer records observations and important timestamps before seeing REMI's result. Compare REMI's output without changing those notes. Repeated runs should use the same video, prompt, model, prompt version and schema version.

Evaluate:

- whether each cited moment exists and is materially relevant;
- whether the description matches visible or audible evidence;
- whether the likely viewer effect is plausible and cautiously worded;
- whether REMI prioritises material issues;
- whether it avoids invented events, statistics and causal claims;
- whether it avoids forced criticism and accepts a zero-finding result;
- whether it respects mental-health safety; and
- whether repeat runs are directionally consistent.

Track timestamp accuracy, evidence quality, useful-explanation rate, forced-criticism rate, hallucination rate, domain-safety failures, median analysis time and provider failure rate. These are learning measures, not performance or marketing claims.

## Planned Acceptance Criteria

All sections below are **planned**. Each belongs to its named future PR and must be refined into automated and manual tests in that PR.

### Planned: `feat/private-poc-access`

- Only the owner and invited friend can reach or invoke the deployed analysis workflow.
- Anonymous users cannot consume the Gemini-backed API.
- The Gemini API key never enters client code, responses or logs.
- Access failures are safe and do not reveal account or infrastructure details.
- The existing MP4-plus-question Gemini workflow remains usable after deployment.

### Planned: `feat/critique-only-contract`

- Every finding contains an observed moment, what feels wrong, likely viewer effect and supporting visible or audible evidence.
- Zero findings is valid and renders clearly.
- No prompt, model response, application schema or UI element requires or displays a creative solution, edit instruction, reshoot instruction, confidence score or confidence percentage.
- Script rewrites, invented hooks, generic advice and unsupported causal claims are rejected in evaluation.
- Full-video inspection, timestamp usefulness, evidence quality and mental-health safeguards are preserved.

### Planned: `feat/visual-timing-analysis`

- Representative tests cover inserted images, screenshots, text cards, captions, cropping, unreadable text, clutter, rapid cuts, sub-second visuals and unnecessarily long holds.
- Deterministic timing agrees with fixture ground truth within a tolerance selected during implementation.
- Relevant frames and timing facts reach Gemini without replacing the complete-video input.
- The chosen sampling or change-detection strategy is based on test evidence; no frame rate is assumed in advance.
- Evaluation checks whether REMI can judge whether viewers have enough time to understand an image.

### Planned: `feat/audio-sensory-analysis`

- Fixtures cover speech/music competition, distracting effects, sudden volume changes, clipping, excessive loudness, emotional mismatch and combined visual/audio overload.
- Deterministic loudness, peak and timing facts are tested independently from Gemini's qualitative judgment.
- The result does not present model interpretation as a measured audio fact.

### Planned: `feat/instagram-connection`

- Tests use only permissions, account types, metrics and token behavior verified from current official Meta documentation during implementation.
- OAuth state and token handling resist cross-user access and accidental disclosure.
- Only the authorized creator's own eligible Reels and available Insights are imported.
- Gemini never receives Instagram credentials or retrieves Instagram data directly.
- Revocation, expired tokens, missing permissions and partial metric availability fail safely.

### Planned: `feat/creator-memory`

- Stored records include creator scope plus model, prompt and schema versions.
- Structured critique, verified metrics, Reel purpose and format, posting date, duration and observation tags remain attributable to the correct Reel and creator.
- Cross-creator reads and comparisons are denied and covered by tests.
- The friend's mental-health content can never enter queries for the owner's MMA, engineering or startup history, or vice versa.
- Raw Reel videos are not retained permanently by default.
- Deletion and privacy controls work before access expands beyond the private POC.

### Planned: `feat/historical-comparison`

- The fresh critique runs without historical performance data and is stored or passed forward unchanged.
- The second stage uses only relevant previous Reels from the same creator.
- Historical context cannot overwrite or alter the fresh critique.
- Pattern statements use observed counts, for example `Observed in 4 of 6 comparable Reels.`
- No confidence score is generated.
- Wording may describe association or possible contribution but never proven causation.
- Tests include distribution-driven counterexamples where similar creative traits have different reach.

## Evaluation Guardrail

Public datasets may later support offline evaluation, but they are not the source of truth for a creator's personal critique and are not inputs to live analysis under the approved roadmap.
