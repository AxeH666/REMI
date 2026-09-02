# REMI

**Reel Evaluation & Moment Inspector**

REMI is a local proof of concept that accepts a short-form video and a natural-language question such as:

> Why does this Reel feel bad after shooting?

Gemini returns a concise creative-director critique with timestamps, evidence and exact edit or reshoot instructions.

## Current Implementation

Milestone 3 connects the complete interface to a server-only Gemini workflow. The app validates the MP4 and prompt in the browser and again in the API route, uploads the video with the official Google Gen AI SDK, waits for the provider file to become ready, validates the structured response with Zod, and renders only the application-owned result shape.

Fixtures remain test data only. The running application does not return fixture results or add an artificial wait.

## Current Scope

Version 0 does one thing:

```text
Upload MP4 + enter prompt -> Gemini analysis -> structured critique
```

It does not predict reach, connect to Instagram, remember previous Reels or permanently store videos.

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
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Test plan](docs/TEST_PLAN.md)
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

Then open the local URL printed by Next.js (normally `http://127.0.0.1:3000`). If port 3000 is already in use, stop the conflicting local service or set an available port before starting:

```powershell
$env:PORT = "3001"
npm run dev
```

The package configuration supports Node.js 22 from 22.14.0 onward and Node.js
24 or later. Node.js 23 is excluded because the current test environment does
not support that non-LTS release line.

`GEMINI_API_KEY` is required when an analysis is submitted. `GEMINI_MODEL` defaults to `gemini-3.7-flash`, and `MAX_VIDEO_MB` defaults to `100` when those optional values are blank. Invalid server configuration produces a safe browser error without exposing the key or configuration details.

## Local Analysis

1. Select one non-empty MP4 no larger than the configured limit.
2. Review or edit the default question.
3. Submit the form and leave the local server running while Gemini processes the video.
4. Review the validated verdict, timestamped problems, strengths and limitations.

The selected file stays in the browser until submission. On submit, the server sends it to Gemini for analysis. REMI does not use permanent app storage. It asks Gemini to delete the uploaded provider file after every completed or failed attempt, but that deletion is best effort; see [Security and privacy](SECURITY.md) before using sensitive material.

## Local Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Validation Goal

REMI succeeds when its critique consistently helps a creator articulate and fix problems they could previously only feel.

The first product metric is **accepted-edit rate**, not predicted reach.
