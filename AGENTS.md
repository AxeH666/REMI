# REMI Agent Instructions

## Mission

Build a local proof of concept that accepts one short-form video and one user prompt, sends both to Gemini, and returns a specific, evidence-based creative critique.

REMI means **Reel Evaluation & Moment Inspector**.

The product question is:

> Can video AI explain why a finished Reel feels wrong and provide corrections the creator would actually use?

## Read Before Coding

Read these files in order:

1. `docs/PRD.md`
2. `docs/AI_ANALYSIS_CONTRACT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ROADMAP.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/TEST_PLAN.md`
7. `docs/DECISIONS.md`
8. `SECURITY.md`

If implementation and documentation disagree, stop and update the documentation or ask for a decision. Do not silently change scope.

## Fixed Scope

Version 0 contains:

- one local web page;
- one video upload;
- one prompt input;
- Gemini video analysis;
- structured critique results;
- loading and error states;
- no permanent storage.

## Explicit Non-Goals

Do not add any of these unless the user changes the scope:

- authentication;
- database or Supabase;
- Instagram API integration;
- analytics or Insights screenshots;
- creator history;
- version comparison;
- FFmpeg, OpenCV, MediaPipe or separate transcription;
- Grok or model routing;
- payments;
- deployment;
- automatic editing or posting;
- virality or reach prediction.

## Required Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Gemini API via the current official Google Gen AI JavaScript SDK
- Zod for server-side input and model-output validation
- Vitest for unit tests

Use Node.js 22.14.0 as the development baseline. Do not raise the minimum unless an installed dependency requires it.

## Engineering Rules

- Keep `GEMINI_API_KEY` server-side. Never expose it through client code or a `NEXT_PUBLIC_` variable.
- Validate video type and size before sending it to Gemini.
- Accept MP4 first. Other formats are optional, not required.
- Keep the model identifier configurable with `GEMINI_MODEL`.
- Request structured JSON and validate it before displaying it.
- Never render raw model HTML.
- Delete temporary local files in a `finally` block if temporary files are used.
- Do not log video bytes, API keys, or the full critique in production-style logs.
- Prefer small modules with explicit names over abstractions intended for hypothetical future features.
- Do not introduce a database, queue, container or second backend for this POC.
- Preserve user-facing errors without exposing secrets or stack traces.

## AI Behaviour Rules

The model must:

- assess the finished execution, not merely rewrite the script;
- watch the whole available video before judging it;
- cite timestamps and visible or audible evidence;
- return no more than three highest-impact problems;
- provide executable edit or reshoot instructions;
- identify what should remain unchanged;
- state uncertainty;
- avoid generic advice;
- never invent reach, retention, engagement or audience statistics;
- never claim causal certainty about future performance.

For mental-health content, the critique must not reward fearmongering, shame, diagnosis-by-video, disclosure pressure, manipulation or clinical overclaiming.

## Definition of Done

The POC is done when:

- a user can select an MP4, enter a question and submit it;
- the API key remains server-side;
- the UI shows upload/analysis progress;
- Gemini returns a response conforming to the documented schema;
- the results show a verdict, up to three timestamped problems, exact fixes, strengths and limitations;
- invalid files, missing prompts, API failures and invalid model output have useful errors;
- tests cover validation and result parsing;
- `npm run lint`, `npm run typecheck` and `npm test` pass;
- the README contains working Windows setup instructions.

## Working Style

- Implement one milestone at a time from `docs/IMPLEMENTATION_PLAN.md`.
- After each milestone, run the relevant checks and report exactly what passed or failed.
- Update `docs/DECISIONS.md` whenever a material architectural or product decision changes.
- Do not broaden scope merely because an additional feature is easy.

## Branch and PR Workflow

- Treat `main` as the stable baseline.
- Do all further work on a branch; do not develop directly on `main`.
- Keep one logical component per PR.
- Keep the tests and documentation for that component in the same PR.
- Do not begin the next component until the current PR has been reviewed and merged.
- Planned components may be developed while the deployed stable POC remains usable.
