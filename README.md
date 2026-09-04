# REMI

**Reel Evaluation & Moment Inspector**

REMI is a private two-user proof of concept for inspecting a completed short-form Reel. The owner or one invited friend manually submits one MP4 and one natural-language question; Gemini inspects the video's visual and audio streams and REMI returns a validated, timestamped critique.

## Current Status

The working baseline currently:

- accepts one completed MP4 Reel and one user question;
- sends both to Gemini through a server-only Next.js route;
- uses Gemini's native video-and-audio analysis;
- validates structured output with Zod before rendering it;
- shows timestamped observations, a verdict, strengths and limitations;
- supports private Railway access with separate owner and friend credentials; and
- does not permanently store uploaded videos.

The current response schema still includes legacy edit or reshoot instructions and numeric confidence, and its prompt broadly asks about hook, clarity, progression and payoff. Those are parts of today's implemented behavior, not the approved manual-analyser contract. The first planned PR, `feat/critique-only-contract`, will remove the solution/score fields and enforce the no-unsolicited-script/content boundary while preserving the quality of the working Gemini analysis.

Private access is merged into `main`. Deployment health is external operational state and is not asserted by this document. REMI has no Meta integration, old-Reel import, Insights, database, persistent storage, creator memory or historical comparison.

## Product Direction

REMI is a Reel critic, not a creative director. Its job is to identify an exact moment, describe the observable problem, explain the likely viewer effect and cite visible or audible evidence. It may report that no meaningful problem was found.

REMI will not rewrite scripts, invent hooks, direct the creator's personal expression, prescribe edits or reshoots, produce viral or confidence scores, force criticism, volunteer criticism of the creator's script or content choices, or claim that one issue definitely caused poor performance.

## Current Workflow

```text
Upload one MP4 + enter one question
    -> server-side Gemini video-and-audio analysis
    -> Zod-validated structured critique
    -> safe rendered result
```

## Roadmap

The immediate manual-friction-analyser phase is split into six sequential PRs: critique-only contract, operational perceptual-friction rubric, visual timing, audio friction, combined reporting and real-Reel evaluation. Throughout those PRs, REMI stays private to two users and keeps manual MP4 uploads with no database, permanent storage or Meta data.

The operational rubric is a working product framework, not established viewer science. Only after the manual analyser is complete will a separate research-grounded viewer-friction knowledge phase validate and improve it using reliable evidence. Meta authorization, old-Reel imports, Insights, creator history and databases are gated until both phases are complete. See the [roadmap](docs/ROADMAP.md) for the authoritative order.

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
GEMINI_API_KEY=replace_with_a_new_key
GEMINI_MODEL=gemini-3.7-flash
MAX_VIDEO_MB=100
REMI_OWNER_PASSWORD=replace_with_a_unique_random_owner_password
REMI_FRIEND_PASSWORD=replace_with_a_unique_random_friend_password
```

Never commit `.env.local`. The two fixed usernames are `owner` and `friend`. Give each a different password containing 24-128 non-space printable ASCII characters; generate the passwords with a password manager. The previously used Gemini key must be treated as compromised and must not be reused for deployment. Restart the development server after changing environment values.

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

`GEMINI_API_KEY`, `REMI_OWNER_PASSWORD` and `REMI_FRIEND_PASSWORD` are required. `GEMINI_MODEL` defaults to `gemini-3.7-flash`, and `MAX_VIDEO_MB` defaults to `100` when those optional values are blank. Invalid server configuration produces a safe error without exposing secret values.

The browser shows its native sign-in prompt. Use `owner` with the owner's password or `friend` with the friend's password. Private access is enforced before page rendering and again inside the analysis route.

## Local Analysis

1. Select one non-empty MP4 no larger than the configured limit.
2. Review or edit the default question.
3. Submit the form and leave the local server running while Gemini processes the video.
4. Review the validated critique.

The selected file stays in the browser until submission. On submit, the server sends it to Gemini for analysis. REMI does not use permanent application storage. It asks Gemini to delete the uploaded provider file after every completed or failed attempt, but that deletion is best effort; see [Security and privacy](SECURITY.md) before using sensitive material.

## Railway Deployment

Railway is the supported private-POC target. Its current public edge supplies HTTPS and the forwarded host/protocol headers used by REMI's same-origin check. Its five-minute upload and idle-request windows exceed REMI's current 110-second analysis timeout. See Railway's official [public-networking limits](https://docs.railway.com/networking/public-networking/specs-and-limits), [Next.js deployment guide](https://docs.railway.com/guides/nextjs), [healthcheck documentation](https://docs.railway.com/deployments/healthchecks) and [plan resource limits](https://docs.railway.com/pricing/plans).

For a new or rebuilt Railway service using the merged private-access baseline:

1. Create a Railway Hobby project (or higher) from the GitHub repository, select `main` and use Railpack. Do not generate a public domain yet.
2. Add a newly created Gemini key and the two unique access passwords as Railway service variables. Do not reuse the previous Gemini key.
3. In the Railway service settings, set the healthcheck path to `/api/health` and leave the default 300-second healthcheck timeout.
4. After the configured deployment is healthy, generate the Railway HTTPS domain.
5. Open the HTTPS domain and verify both accounts separately before sharing the friend's credentials.

Railway injects `PORT`; `npm start` listens on that port on `0.0.0.0`. Do not manually expose a second port. Use HTTPS only: Railway redirects plain HTTP GET requests, while a plain HTTP POST is converted to GET and cannot safely carry an upload.

No Railway configuration file is committed. Railway's [legacy Config as Code format](https://docs.railway.com/config-as-code/reference) is deprecated, and this single-service POC does not justify adding Railway's stateful Infrastructure as Code workflow. Railpack can detect the existing Node.js build and start scripts; the healthcheck is the only required dashboard setting.

The public health endpoint returns only `{ "ok": true }` or `{ "ok": false }` and makes no Gemini call. A healthy response means required runtime configuration is present, not that Gemini credentials or provider availability have been tested.

### Deployment Limits

- The complete request body must finish uploading to Railway within five minutes.
- An HTTP request with no transferred data is closed after five minutes. REMI's application timeout remains 110 seconds.
- The Free plan's current 0.5 GB memory ceiling is not the deployment target. Multipart parsing and the Gemini upload can temporarily hold substantial data for a 100 MB video; use Hobby or higher, inspect Railway peak-memory metrics with a representative near-limit upload, and add a resource cap only after measuring real use.
- Basic Auth is intentionally limited to this two-person POC. Browsers may cache credentials and do not offer a reliable application logout; close the private browser session or clear site credentials on a shared device.
- Rotate either password and redeploy immediately if it is shared accidentally. High-entropy credentials are the abuse control for this trusted-user POC; there is no persistent account system or distributed rate-limit store.
- Provider-file deletion remains best effort, and Gemini's own retention behavior still applies as described in `SECURITY.md`.

## Local Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Validation Goal

REMI succeeds when its critique consistently helps a creator understand problems they could previously only feel, without taking over the creator's creative decisions.
