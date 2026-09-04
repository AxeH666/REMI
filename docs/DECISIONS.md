# Decision Log

Record material product and architecture decisions here. Do not rewrite history; append a new decision when something changes.

## D-001 - Product Name

**Status:** Accepted  
**Decision:** Use REMI, expanded as Reel Evaluation & Moment Inspector, for the proof of concept.  
**Reason:** Short, memorable and directly related to moment-level Reel evaluation. The name may change later.

## D-002 - Core Validation Question

**Status:** Accepted  
**Decision:** Test whether AI can explain why a completed Reel feels wrong and prescribe useful fixes.  
**Reason:** This is the unresolved problem. Reach analytics and distribution features do not answer it.

## D-003 - Video Plus Prompt First

**Status:** Accepted  
**Decision:** Version 0 accepts one video and one free-form prompt.  
**Reason:** This is the smallest experiment that can validate Gemini's creative judgment.

## D-004 - Gemini Before Grok

**Status:** Accepted  
**Decision:** Use Gemini video understanding as the only model provider in version 0.  
**Reason:** Gemini officially supports uploaded video understanding across visual and audio streams with timestamp-aware questions. Grok's documented video API currently centres generation/editing rather than textual critique of uploaded video.

## D-005 - Single Next.js Application

**Status:** Accepted  
**Decision:** Use Next.js App Router for UI and server route.  
**Reason:** A separate FastAPI service adds no value to the first experiment.

## D-006 - No Persistence

**Status:** Partially superseded by D-025; no database or permanent video storage remains accepted

**Decision:** No database, accounts or permanent video storage in version 0.  
**Reason:** The first experiment does not need history. Minimising storage also reduces privacy risk.

## D-007 - No Preprocessing Pipeline

**Status:** Accepted  
**Decision:** Do not initially add FFmpeg, OpenCV, MediaPipe, OCR or separate transcription.  
**Reason:** Add them only if evaluation demonstrates that direct video understanding misses important details.

## D-008 - No Reach Prediction

**Status:** Accepted  
**Decision:** REMI must not produce a virality score or claim future reach/retention.  
**Reason:** Those outcomes cannot be established from an unpublished video alone and fabricated certainty would undermine trust.

## D-009 - Windows Development

**Status:** Accepted  
**Decision:** Develop directly on Windows in a simple local folder outside OneDrive.  
**Reason:** The version 0 stack is fully supported on Windows and WSL is unnecessary overhead for the developer.

## D-010 - Accepted-Edit Rate First

**Status:** Accepted  
**Decision:** Use accepted-edit rate as the initial product-quality metric.  
**Reason:** Before testing performance lift, prove the system gives recommendations a real creator agrees with and applies.

## D-011 - Node.js 22 Development Baseline

**Status:** Accepted  
**Decision:** Use Node.js 22.14.0 as the local development baseline. Support Node.js 22 from 22.14.0 onward and Node.js 24 or later; do not claim support for Node.js 23.  
**Reason:** Node.js 22.14.0 is the machine's normal LTS runtime and satisfies Next.js 16 and every installed dependency. The current test environment excludes Node.js 23, while Node.js 24 remains optional rather than required.

## D-012 - Direct Gemini Files Upload

**Status:** Accepted  
**Decision:** Upload the validated multipart `File` directly as a `Blob` through the Google Gen AI SDK and do not create a local temporary file while that SDK path remains supported.  
**Reason:** `@google/genai` 2.20.0 supports `Blob` uploads in Node.js. Direct upload is the smallest implementation and avoids an unnecessary second copy of a private video. If a future API requires a path, the fallback must use a unique operating-system temporary file and delete it in `finally`.

## D-013 - Best-Effort Provider Cleanup

**Status:** Accepted  
**Decision:** Delete each available named Gemini Files API upload in `finally` with a separate bounded cleanup request. If an upload returns its name only after the request timeout, schedule the same cleanup when that upload resolves. Preserve the primary analysis result or error if deletion itself fails.  
**Reason:** Immediate deletion minimises exposure, while cleanup failure must not hide a valid critique or the real analysis failure. The UI and security documentation disclose that provider deletion cannot be guaranteed by this local proof of concept.

## D-014 - Application-Owned API Envelope

**Status:** Accepted  
**Decision:** The analysis route returns only a strict REMI success or error envelope. The browser validates that envelope and never consumes raw Gemini responses or provider error details.  
**Reason:** This prevents provider changes, malformed output, secrets and implementation details from becoming part of the public UI contract.

## D-015 - Loopback and Same-Origin Local Boundary

**Status:** Partially superseded by D-025 through D-027; local development remains loopback-only

**Decision:** Bind the `dev` and `start` scripts to `127.0.0.1` and reject cross-origin browser submissions to the analysis route.  
**Reason:** Version 0 has no authentication or abuse controls. These local boundaries keep the API-key-backed route from being intentionally exposed to the network or invoked by an unrelated website, without introducing an authentication system.

## D-016 - REMI Is a Critic, Not a Creative Director

**Status:** Accepted; implementation planned in `feat/critique-only-contract`

**Decision:** REMI will identify timestamped observable problems, explain likely viewer effects and cite visible or audible evidence. It will not rewrite scripts, invent hooks, prescribe edits or reshoots, direct personal expression, produce viral or confidence scores, force findings or claim causal certainty. Zero findings is valid. This supersedes the creative-solution requirement in D-002 and the accepted-edit metric in D-010; the current implementation remains unchanged until the owning feature PR.

**Reason:** The product is most valuable as an evidence-based second set of eyes. Creative prescriptions overstep the role, reduce creator ownership and create false authority.

## D-017 - Private Access Before Shared Use

**Status:** Accepted; implemented on `main` by PR #2 and refined by D-025

**Decision:** Deploy the working POC only after access control prevents anonymous public use. Initial access is limited to the owner and one invited friend, and the Gemini API key remains server-side.

**Reason:** A shared unauthenticated provider-backed endpoint creates privacy, abuse and cost risks.

## D-018 - Deterministic Visual Timing Complements Gemini

**Status:** Accepted; implementation planned in `feat/visual-timing-analysis`

**Decision:** Preserve Gemini's complete-video inspection and add FFmpeg or equivalent deterministic preprocessing to detect visual changes, measure display intervals and supply relevant frames and timing facts. Do not lock a frame rate before testing. This extends rather than reverses the direct-analysis starting decision in D-007.

**Reason:** Ordinary model inspection may miss sub-second images and cannot be relied on for exact display duration, while Gemini remains better suited to judging meaning and viewer effect.

## D-019 - Separate Audio Facts From Sensory Judgment

**Status:** Accepted technical direction; sequencing and cross-modal ownership superseded by D-028

**Decision:** Gemini will judge speech/music competition, distracting effects, emotional fit and combined sensory load. FFmpeg or equivalent tooling may supply measurable loudness, peak, clipping and timing facts.

**Reason:** Deterministic measurements and human-like interpretation solve different parts of the problem and should remain distinguishable.

## D-020 - Instagram Data Flows Through REMI's Backend

**Status:** Accepted future direction; gated and left unscheduled by D-030

**Decision:** An eligible professional-account creator may eventually authorize REMI through Instagram's official API. REMI's backend—not Gemini—will handle authentication and retrieve that creator's own available Reels and Insights. No exact Meta permission, metric availability or review requirement is recorded as guaranteed.

**Reason:** Backend mediation protects credentials, supports authorization boundaries and keeps external data provenance separate from model judgment. Meta requirements can change and must be verified when implemented.

## D-021 - Creator-Isolated Memory Without Raw Video Retention

**Status:** Accepted future direction; gated and left unscheduled by D-030

**Decision:** Creator memory may store structured critiques, verified Instagram metrics, Reel purpose and format, posting date, duration, repeated observation tags, and model, prompt and schema versions. Raw videos are not retained permanently by default. All history is isolated per creator, with deletion and privacy controls required before broader use.

**Reason:** Structured history can support useful longitudinal evidence while minimizing privacy risk. Mixing the friend's mental-health content with the owner's MMA, engineering or startup content would be irrelevant and unsafe.

## D-022 - Fresh Critique Precedes Historical Comparison

**Status:** Accepted future direction; gated and left unscheduled by D-030

**Decision:** Analyse every new unpublished Reel first without historical performance data. Run relevant same-creator history comparison only as a separate second stage that cannot overwrite the fresh critique. Describe repeated evidence with counts, not confidence scores. Historical associations may suggest that an issue contributed to weaker performance but must never be presented as proven causation.

**Reason:** Separating the stages protects the direct evidence in the new Reel from hindsight and performance bias. Instagram distribution and other external factors prevent causal conclusions from observational history.

## D-023 - Live Analysis Exclusions

**Status:** Accepted product direction; legacy confidence removal is planned in `feat/critique-only-contract`

**Decision:** Do not add generic viral datasets to live analysis, Gemini fine-tuning, virality prediction, universal cross-creator benchmarks, automatic creative rewriting, permanent raw-video storage, confidence scores, a full analytics dashboard or automatic Instagram posting. Public datasets may later support offline evaluation only.

**Reason:** These additions do not improve the core critic role, create misleading certainty or broaden privacy and implementation risk before the central product is validated.

## D-024 - One Planned Component Per PR

**Status:** Accepted

**Decision:** Keep `main` as the stable baseline. Develop all further work on branches, with one logical component and its tests and documentation in each PR. Do not begin the next component until the current PR is reviewed and merged. Planned components may be developed while the deployed stable POC remains usable.

**Reason:** Small sequential PRs keep behavior changes reviewable, preserve a usable baseline and make regressions easier to isolate.

## D-025 - Two-Account HTTP Basic Access

**Status:** Accepted; implemented on `main` by PR #2

**Decision:** Protect the private POC with the fixed usernames `owner` and `friend`, backed by separate high-entropy passwords in server-side environment variables. Enforce the check in the application-wide Next.js proxy and repeat it inside `/api/analyze`. Do not add a database, identity provider or persistent session store.

**Reason:** HTTP Basic over Railway-managed HTTPS is the smallest robust access boundary for two trusted users. Route-level enforcement ensures that protecting the page is not mistaken for protecting the Gemini-backed action. Distinct credentials can be rotated independently without adding a broader account system.

## D-026 - Railway Railpack Deployment Target

**Status:** Accepted; deployment support implemented on `main` by PR #2

**Decision:** Target Railway's GitHub/Railpack flow. Start the production Next.js server on `0.0.0.0` using Railway's injected `PORT`, configure the public `/api/health` readiness check in the Railway service settings after merge, and retain the existing 100 MB application upload limit and 110-second analysis timeout. Do not commit Railway's deprecated legacy Config as Code format or introduce the newer stateful Infrastructure as Code workflow for this single service. This supersedes only the production-loopback portion of D-015; local development remains bound to `127.0.0.1`.

**Reason:** Railway supports Node.js/Next.js, managed HTTPS, original-host forwarding, five-minute request-body uploads and five-minute inactive HTTP requests. Those limits fit REMI's current direct MP4 upload and Gemini analysis workflow without a container, object store or second backend.

## D-027 - Proxy-Aware Same-Origin Validation

**Status:** Accepted; implemented on `main` by PR #2

**Decision:** When both forwarded protocol and host are present, compare the browser `Origin` with that original public origin. Reject incomplete or invalid forwarded origin data and continue rejecting `Sec-Fetch-Site: cross-site`. Fall back to the direct request protocol and `Host` for local operation.

**Reason:** Railway terminates HTTPS before forwarding to the Node.js service, so the internal request URL may not match the browser's public HTTPS origin. Using the paired forwarded values preserves CSRF protection behind the trusted production proxy without breaking local development.

## D-028 - Manual Friction Analyser Is the Immediate Six-PR Phase

**Status:** Accepted; implementation planned as six sequential PRs

**Decision:** Keep the merged private-access application as the stable foundation and deliver the manual friction analyser in this order: `feat/critique-only-contract`, `feat/operational-friction-rubric`, `feat/visual-timing-analysis`, `feat/audio-friction-analysis`, `feat/combined-friction-reporting`, and `test/real-reel-evaluation`. PR 1 removes the currently implemented creative instructions and confidence values. PR 5, not the audio-only PR, owns combined visual/audio reporting.

Throughout this phase REMI remains private to the owner and one friend, accepts manual MP4 uploads and one question, and adds no database, permanent storage, Meta integration, old-Reel import, Insights, creator memory or historical comparison. PR 1 is the entry gate for the new output boundary; after it merges, no later phase PR may reintroduce virality or confidence scores, creative solutions or unsolicited criticism of the creator's script, topic, claims or content choices.

This decision supersedes the component order previously summarized from D-018 through D-022 while preserving their still-valid technical, privacy, isolation and causality boundaries.

**Reason:** The smallest useful next step is to prove that REMI can identify and explain perceptual friction in finished Reels. Separating the contract, rubric, evidence pipelines, synthesis and real-Reel evaluation keeps each PR reviewable and prevents data-platform work from obscuring whether the core critic is useful.

## D-029 - Operational Rubric Before Research-Grounded Knowledge

**Status:** Accepted; operational rubric planned in phase 1 and evidence validation planned in phase 2

**Decision:** Build a versioned operational perceptual-friction rubric as part of the manual analyser. Treat it as a practical, testable product hypothesis grounded in visible or audible Reel evidence, not as established viewer science, a universal benchmark or a score.

After the complete manual analyser has been evaluated, run a separate research-grounded viewer-friction knowledge phase. Use reliable evidence with recorded provenance, applicability, conflicting findings and limitations to confirm, revise or remove rubric criteria. Do not turn general research into automatic truth about an individual creator or a live generic virality dataset.

**Reason:** The manual analyser needs an explicit working rubric to become consistent, but claiming scientific authority before reviewing evidence would create false confidence. Separating operationalization from later validation allows fast product learning without overstating what is known.

## D-030 - Connected Creator Data Is Gated Behind Both Earlier Phases

**Status:** Accepted sequencing constraint; exact implementation order remains undecided

**Decision:** Do not begin Meta API integration, creator-authorized old-Reel imports, Insights retrieval, a persistent creator-account/profile layer, databases, creator memory or historical comparison until the six manual-analyser PRs have been reviewed, merged and formally evaluated and the research-grounded knowledge phase has been reviewed and merged. No branch order for those capabilities is approved yet.

If connected-data work is later approved, REMI's backend must handle Meta credentials and retrieval, creator data must remain isolated, raw videos must not be retained permanently by default, and fresh critique must precede a separate historical comparison. Historical association must never be presented as proven causation.

**Reason:** Platform access and persistence add security, privacy, operational and interpretive risk. They should be justified only after the standalone manual critic and its knowledge basis have proven useful.
