# REMI Agent Instructions

## Mission

Build and improve a private manual friction analyser that accepts one short-form video and one user question, sends the video to Gemini, and returns a specific, evidence-based critique of perceptual execution.

REMI means **Reel Evaluation & Moment Inspector**.

The product question is:

> Can video AI identify and explain why a finished Reel feels wrong without taking over the creator's creative decisions?

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

## Current Scope

The private POC contains:

- one remotely deployable web page;
- one video upload;
- one prompt input;
- Gemini video analysis;
- structured critique results;
- loading and error states;
- HTTP Basic access for the owner and one friend;
- no permanent storage.

## Explicit Non-Goals

Do not add any of these during the manual-analyser or research-grounding phases unless the roadmap is explicitly changed:

- database or Supabase;
- Instagram API integration;
- analytics or Insights screenshots;
- creator history;
- version comparison;
- FFmpeg, OpenCV, MediaPipe, OCR or separate transcription outside the owning visual-timing or audio-friction PR;
- Grok or model routing;
- payments;
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
- Require distinct high-entropy `REMI_OWNER_PASSWORD` and `REMI_FRIEND_PASSWORD` values in every deployed environment.
- Protect the analysis route directly as well as through the application-wide request proxy.
- Keep `/api/health` public but limited to a generic configuration-readiness result.
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

## Current and Planned AI Behaviour

The stable code currently returns edit/reshoot instructions and numeric confidence, and its prompt broadly asks about hook, clarity, progression and payoff. Those are legacy implementation facts, not the approved product boundary. Do not claim they are already removed. `feat/critique-only-contract` must narrow the default scope, enforce the no-unsolicited-script/content boundary and change the prompt, schema, interface and tests together before later manual-analyser work begins.

The approved manual friction analyser must:

- assess the finished execution, not merely rewrite the script;
- watch the whole available video before judging it;
- cite timestamps and visible or audible evidence;
- return no more than three highest-impact problems;
- distinguish the observed moment, what feels wrong, likely viewer effect and supporting evidence;
- allow zero findings;
- state limitations qualitatively;
- avoid generic advice;
- avoid unsolicited criticism of the creator's script, topic, claims, personal story or content choices;
- never provide creative edits, reshoot instructions, script rewrites or invented hooks;
- never produce confidence, virality, reach, retention or engagement scores;
- never invent reach, retention, engagement or audience statistics;
- never claim causal certainty about future performance.

The operational perceptual-friction rubric belongs to the manual analyser and is a versioned working framework, not established science or a universal benchmark. A later research-grounded viewer-friction knowledge phase will validate and improve it using reliable evidence with recorded provenance and limitations.

For mental-health content, the critique must not reward fearmongering, shame, diagnosis-by-video, disclosure pressure, manipulation or clinical overclaiming.

## Current Stable Baseline

The current POC baseline is present when:

- a user can select an MP4, enter a question and submit it;
- only the owner and invited friend can access the application or analysis route;
- the API key remains server-side;
- the UI shows upload/analysis progress;
- Gemini returns a response conforming to the documented schema;
- the results show a validated verdict, up to three timestamped observations, strengths and limitations using the currently implemented schema;
- invalid files, missing prompts, API failures and invalid model output have useful errors;
- tests cover validation and result parsing;
- tests cover private access, endpoint authorization, proxy-aware same-origin checks and deployment health;
- `npm run lint`, `npm run typecheck` and `npm test` pass;
- the README contains working Windows setup instructions.

## Working Style

- Treat `docs/ROADMAP.md` as the authority for phase order and PR boundaries. `docs/IMPLEMENTATION_PLAN.md` records the original POC milestones only.
- Implement one roadmap component at a time.
- After each roadmap component, run the relevant checks and report exactly what passed or failed.
- Update `docs/DECISIONS.md` whenever a material architectural or product decision changes.
- Do not broaden scope merely because an additional feature is easy.

## Branch and PR Workflow

- Treat `main` as the stable baseline.
- Do all further work on a branch; do not develop directly on `main`.
- Keep one logical component per PR.
- Keep the tests and documentation for that component in the same PR.
- Do not begin the next component until the current PR has been reviewed and merged.
- Planned components may be developed while the deployed stable POC remains usable.
