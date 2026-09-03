# REMI

**Reel Evaluation & Moment Inspector**

REMI is a local proof of concept for inspecting a completed short-form Reel. A user submits one MP4 and one natural-language question; Gemini inspects the video's visual and audio streams and REMI returns a validated, timestamped critique.

## Current Status

The working baseline currently:

- accepts one completed MP4 Reel and one user question;
- sends both to Gemini through a server-only Next.js route;
- uses Gemini's native video-and-audio analysis;
- validates structured output with Zod before rendering it;
- shows timestamped observations, a verdict, strengths and limitations; and
- does not permanently store uploaded videos.

The current response schema still includes edit or reshoot instructions and numeric confidence. Those fields are part of the implemented baseline, not the finalized product direction. The planned `feat/critique-only-contract` PR will remove them while preserving the quality of the working Gemini analysis.

REMI does not currently have authentication, deployment access, Instagram integration, persistent storage, creator memory or historical comparison. Planned components are described in the [roadmap](docs/ROADMAP.md); they are not implemented.

## Product Direction

REMI is a Reel critic, not a creative director. Its job is to identify an exact moment, describe the observable problem, explain the likely viewer effect and cite visible or audible evidence. It may report that no meaningful problem was found.

REMI will not rewrite scripts, invent hooks, direct the creator's personal expression, prescribe edits or reshoots, produce viral or confidence scores, force criticism or claim that one issue definitely caused poor performance.

## Current Workflow

```text
Upload one MP4 + enter one question
    -> server-side Gemini video-and-audio analysis
    -> Zod-validated structured critique
    -> safe rendered result
```

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Google Gen AI JavaScript SDK
- Zod
- Vitest

## Documentation

- [Product requirements](docs/PRD.md)
- [AI analysis contract](docs/AI_ANALYSIS_CONTRACT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Test and evaluation plan](docs/TEST_PLAN.md)
- [Decision log](docs/DECISIONS.md)
- [Security and privacy](SECURITY.md)

## Windows Setup

Install Node.js 22.14.0, the project's development baseline. Copy the environment example and add your key only to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

```env
GEMINI_API_KEY=replace_with_your_key
GEMINI_MODEL=gemini-3.7-flash
MAX_VIDEO_MB=100
```

Never commit `.env.local`. Restart the development server after changing environment values.

Install dependencies and start the loopback-only development server:

```powershell
npm install
npm run dev
```

Then open the local URL printed by Next.js, normally `http://127.0.0.1:3000`. If port 3000 is already in use, stop the conflicting local service or set an available port before starting:

```powershell
$env:PORT = "3001"
npm run dev
```

The package configuration supports Node.js 22 from 22.14.0 onward and Node.js 24 or later. Node.js 23 is excluded because the current test environment does not support that non-LTS release line.

`GEMINI_API_KEY` is required when an analysis is submitted. `GEMINI_MODEL` defaults to `gemini-3.7-flash`, and `MAX_VIDEO_MB` defaults to `100` when those optional values are blank. Invalid server configuration produces a safe browser error without exposing the key or configuration details.

## Local Analysis

1. Select one non-empty MP4 no larger than the configured limit.
2. Review or edit the default question.
3. Submit the form and leave the local server running while Gemini processes the video.
4. Review the validated critique.

The selected file stays in the browser until submission. On submit, the server sends it to Gemini for analysis. REMI does not use permanent application storage. It asks Gemini to delete the uploaded provider file after every completed or failed attempt, but that deletion is best effort; see [Security and privacy](SECURITY.md) before using sensitive material.

## Local Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Validation Goal

REMI succeeds when its critique consistently helps a creator understand problems they could previously only feel, without taking over the creator's creative decisions.
