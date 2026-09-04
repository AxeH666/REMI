# Implementation Plan

## Document Status

This file records the original local POC implementation sequence. Milestones 0-4 produced the stable application baseline; this is not the active plan for new components.

Future component order, branch names and PR boundaries are defined in `ROADMAP.md`.

The immediate roadmap is the six-PR manual friction analyser: critique contract, operational perceptual-friction rubric, visual timing, audio friction, combined reporting and real-Reel evaluation. A later research-grounded knowledge phase must validate and improve the operational rubric before any Meta, old-Reel, Insights, creator-history or database work begins.

## Milestone 0 - Documentation Baseline

- Review all project documents.
- Resolve contradictions before coding.
- Confirm Node.js, npm and Git work on Windows.
- Confirm a Gemini API key is available locally without sharing it.

Exit condition: scope and analysis contract are understood.

## Milestone 1 - Scaffold

- Create the current stable Next.js App Router project with TypeScript and Tailwind.
- Add Zod and Vitest.
- Preserve these documentation files and merge generated ignore rules carefully.
- Add scripts for `dev`, `build`, `lint`, `typecheck` and `test`.
- Validate environment variables server-side.

Exit condition: the blank application runs and all checks pass.

## Milestone 2 - Static Interface

- Build the REMI upload form.
- Add MP4 selection and validation.
- Add editable default question.
- Add empty, selected, loading and error states.
- Build the result components against fixture JSON.

Exit condition: the entire workflow is usable with fake results.

## Milestone 3 - Gemini Integration

- Check the current official Gemini JavaScript SDK and video-input documentation.
- Implement the server-only Gemini client.
- Upload/pass the video using the simplest supported mechanism.
- Apply the system prompt and response schema.
- Validate the returned JSON.
- Map provider errors to safe application errors.
- Ensure cleanup occurs on every path.

Exit condition: one real MP4 produces a validated critique.

## Milestone 4 - Reliability

- Test missing, invalid and oversized files.
- Test missing API key and bad provider responses.
- Test response-schema parsing.
- Prevent double submissions.
- Confirm no secrets or video bytes reach logs or the browser bundle.
- Run lint, type checking, unit tests and production build.

Exit condition: documented definition of done is satisfied.

## Superseded Milestone 5 - Real Evaluation

This milestone was an original plan, not evidence that evaluation was completed. Its intent now belongs to the sixth manual-analyser PR, `test/real-reel-evaluation`, after the first five focused components are merged.

- Select approximately ten representative Reels.
- Record blind human observations before running REMI.
- Run each video using a fixed prompt.
- Score results using `TEST_PLAN.md`.
- Record incorrect timestamps, generic advice and hallucinations.
- Decide whether to continue, improve prompting, test another model or stop.

Exit condition: a written evidence-based build/no-build decision.

## Superseded Deferred List

The earlier informal deferred list and seven-component sequence have been replaced by the phase gates in `ROADMAP.md`. Do not use the original milestones to infer current priority.

During the manual-analyser and research-grounding phases, REMI remains a private two-user manual-upload application without Meta integration, old-Reel imports, Insights, creator history, a database or permanent storage. The roadmap also does not approve feedback buttons, accepted-edit tracking, version comparison, confidence or virality scores, a full analytics dashboard, automatic posting or unsolicited script/content criticism.
