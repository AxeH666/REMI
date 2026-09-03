# Product Requirements Document

## Product

**Name:** REMI  
**Expansion:** Reel Evaluation & Moment Inspector  
**Current stage:** Private POC access implemented and awaiting review, merge and owner deployment.

**Initial users:** The owner and one invited mental-health creator

## Product Purpose

A creator can finish a Reel that feels awkward, confusing, slow or emotionally wrong without being able to identify the moment that creates that impression. Most creator tools report metrics or repeat generic advice. REMI exists to inspect the actual finished execution and articulate what a viewer can see or hear.

REMI is a Reel critic, not a creative director. It protects the creator's ownership of the solution and personal style.

## Current Working Baseline

The implemented local POC currently:

- accepts one completed MP4 Reel and one user question;
- sends the complete video to Gemini for native visual and audio analysis;
- returns a structured, timestamped critique validated by the application;
- keeps the Gemini API key server-side;
- is ready for private Railway deployment with separate owner and friend credentials;
- has no Instagram integration, persistent storage, creator memory or historical comparison; and
- does not permanently store uploaded videos.

The current application schema includes edit or reshoot instructions and numeric confidence. That behavior remains implemented until the planned critique-only contract PR changes the prompt, schema, UI and tests together. Planned behavior below must not be read as already implemented.

## Finalized Product Role

For each meaningful problem, REMI should:

- identify the exact timestamp or interval where something feels wrong;
- describe the observable problem;
- explain its likely effect on the viewer; and
- cite supporting evidence visible or audible in the Reel.

REMI should inspect delivery, pacing, framing, facial expression, voice, editing, inserted images, screenshots, text, layout and audio. It must be allowed to return no findings when no meaningful problem is supported by the Reel.

REMI should not:

- rewrite scripts or invent hooks;
- provide creative edit or reshoot instructions;
- tell the creator how to express their personal creativity;
- produce viral scores;
- produce confidence scores or percentages;
- force criticism when the Reel is already effective; or
- claim that one issue definitely caused a Reel to fail.

## Current User Story

> As a creator, I upload a completed Reel and ask why it feels wrong so that I receive a specific, timestamped explanation before deciding what, if anything, to change.

## Current Workflow

1. The user opens the local application.
2. The user selects one MP4 Reel.
3. The user enters or edits the analysis question.
4. The application validates and uploads the video to Gemini.
5. Gemini analyses the complete video using the implemented contract.
6. The application validates the structured response.
7. The interface displays the critique.
8. The user decides what the evidence means for their own creative work.

## Current Functional Requirements

### Upload

- Select one MP4 file.
- Show filename, size and removable selection.
- Reject unsupported formats and files above the configured limit.
- Do not automatically upload before submission.

### Prompt

- Provide the default question `Why does this Reel feel wrong?`.
- Allow free-form editing.
- Require a non-empty prompt with a sensible maximum length.

### Analysis

- Send the complete video and prompt to Gemini.
- Use the contract in `AI_ANALYSIS_CONTRACT.md`.
- Request and validate structured JSON.
- Handle long-running upload and analysis states.
- Preserve the quality of the existing native Gemini video analysis as planned components are added.

### Error Handling

Provide useful states for a missing video or prompt, invalid type, oversized file, missing configuration, provider failure or timeout, and invalid model output.

## Approved Planned Components

Each component is planned as a separate future PR in the order recorded in `ROADMAP.md`.

### Implemented: Private POC Access

`feat/private-poc-access` prepares the existing POC for Railway with two high-entropy HTTP Basic accounts. Authentication protects the whole application and is repeated inside the API-backed analysis route. The Gemini API key and access passwords remain server-side. Deployment is still a post-merge owner action.

### Planned: Critique-Only Contract

Replace creative direction, scores and forced findings with four evidence-based elements: observed moment, what feels wrong, likely viewer effect, and supporting visible or audible evidence.

### Planned: Visual Timing and Layout Analysis

Inspect inserted images, screenshots, text cards, captions, cropping, unreadable text, clutter, rapid cuts, sub-second images, overlong images and whether viewers have enough time to understand an image.

Gemini's ordinary video inspection may miss sub-second visuals. A planned deterministic preprocessing step using FFmpeg or an equivalent tool will detect visual changes, measure exact display intervals and provide relevant frames and timing facts to Gemini. No exact sampling frame rate is approved until it has been tested.

### Planned: Audio and Sensory-Load Analysis

Inspect music competing with speech, distracting effects, sudden volume changes, clipping, excessive loudness, emotionally conflicting music and combined visual/audio overload. Gemini provides human-like judgment; deterministic tooling may provide measurable loudness, peak and timing facts.

### Planned: Instagram Connection

Allow a creator with an eligible professional Instagram account to authorize REMI through Instagram's official API. REMI's backend—not Gemini directly—will handle authentication and retrieval of that creator's own Reels and available Insights.

Exact Meta permissions, eligible account requirements, available metrics and app-review requirements remain implementation research. They are not guaranteed in this document.

### Planned: Creator Memory

Store creator-specific structured critiques, verified Instagram performance metrics, purpose and format, posting date and duration, repeated observation tags, and model, prompt and schema versions.

Raw Reel videos will not be retained permanently by default. Every creator's history must be isolated. The invited friend's mental-health content must never be compared with the owner's MMA, engineering or startup content. Deletion and privacy controls are required before broader availability.

### Planned: Historical Comparison

Analyse a new unpublished Reel in two stages:

1. Produce a fresh critique without historical performance data.
2. Run a separate comparison using only relevant Reels from that creator's isolated history.

History may add context but must not overwrite or bias the fresh critique. Report evidence with counts such as `Observed in 4 of 6 comparable Reels.` Do not use confidence scores. REMI may say that a problem appeared repeatedly in weaker-performing Reels or may have contributed to performance; it must not claim proven causation because Instagram distribution and other external factors also affect reach.

## Explicitly Deferred or Rejected

REMI is not currently adding:

- generic viral-content datasets to live analysis;
- fine-tuning Gemini;
- virality prediction;
- universal benchmarks that mix unrelated creators;
- automatic creative rewriting;
- permanent raw-video storage;
- confidence scores;
- a full analytics dashboard; or
- automatic posting to Instagram.

Public datasets may later support offline evaluation, but they will not be the source of truth for personal critique.

## Quality Requirements

- An ordinary short Reel should usually return within two minutes under normal conditions; this is a target, not a guaranteed SLA.
- Desktop Windows Chrome remains the required current environment.
- Model output is untrusted and must be validated before display.
- No raw model HTML or sensitive provider details reach the interface.
- Mental-health critique must not reward fearmongering, shame, diagnosis-by-video, disclosure pressure, manipulation or clinical overclaiming.
- Planned components must preserve or measurably improve the usefulness of the existing Gemini analysis.

## Product Validation

Evaluate approximately ten varied Reels, including effective Reels where zero findings is the correct result. Measure timestamp accuracy, evidence quality, usefulness of the explanation, false or forced criticism, hallucinations, domain safety and repeat-run directional consistency.

The thresholds remain learning tools rather than marketing claims. Historical performance can support comparison but cannot prove why a Reel succeeded or failed.
