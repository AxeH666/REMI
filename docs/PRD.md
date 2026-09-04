# Product Requirements Document

## Product

**Name:** REMI  
**Expansion:** Reel Evaluation & Moment Inspector  
**Current stage:** Private two-user POC; manual friction analyser phase planned.

**Initial users:** The owner and one invited mental-health creator

## Product Purpose

A creator can finish a Reel that feels awkward, confusing, slow or emotionally wrong without being able to identify the moment that creates that impression. Most creator tools report metrics or repeat generic advice. REMI exists to inspect the actual finished execution and articulate what a viewer can see or hear.

REMI is a Reel critic, not a creative director. It protects the creator's ownership of the solution and personal style.

## Current Working Baseline

The implemented private POC currently:

- accepts one completed MP4 Reel and one user question;
- sends the complete video to Gemini for native visual and audio analysis;
- returns a structured, timestamped critique validated by the application;
- keeps the Gemini API key server-side;
- supports private Railway access with separate owner and friend credentials;
- has no Instagram integration, persistent storage, creator memory or historical comparison; and
- does not permanently store uploaded videos.

The current application schema includes edit or reshoot instructions and numeric confidence, and its prompt broadly asks about hook, clarity, progression and payoff. Those legacy choices conflict with the approved manual-analyser boundary and remain implemented only until the first planned PR changes the prompt, schema, UI and tests together. Planned behavior below must not be read as already implemented.

## Finalized Product Role

For each meaningful problem, REMI should:

- identify the exact timestamp or interval where something feels wrong;
- describe the observable problem;
- explain its likely effect on the viewer; and
- cite supporting evidence visible or audible in the Reel.

REMI should inspect delivery, pacing, framing, facial expression, voice, editing, inserted images, screenshots, text, layout and audio. It must be allowed to return no findings when no meaningful problem is supported by the Reel.

REMI should not:

- rewrite scripts or invent hooks;
- volunteer criticism of the script, topic, claims or content choices when the user asked about perceptual execution;
- provide creative edit or reshoot instructions;
- tell the creator how to express their personal creativity;
- produce viral scores;
- produce confidence scores or percentages;
- force criticism when the Reel is already effective; or
- claim that one issue definitely caused a Reel to fail.

## Current User Story

> As a creator, I upload a completed Reel and ask why it feels wrong so that I receive a specific, timestamped explanation before deciding what, if anything, to change.

## Current Workflow

1. The owner or invited friend opens the private application.
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

## Product Phases

The ordered PRs and gates are authoritative in `ROADMAP.md`.

### Current: Private Manual-Upload Foundation

Private access is merged into the stable baseline. The owner and one invited friend manually upload one MP4 and ask one question. Authentication protects both the application and analysis route, and all secrets remain server-side. There is no database or permanent application storage.

### Immediate: Manual Friction Analyser

The immediate phase contains six focused PRs, in order:

1. critique-only contract;
2. operational perceptual-friction rubric;
3. visual timing analysis;
4. audio-friction analysis;
5. combined friction reporting; and
6. real-Reel evaluation.

The first PR removes the current creative instructions and confidence values. The operational rubric then gives the manual analyser a versioned, testable way to identify observable execution friction and explain likely viewer effects. It is a working product framework, not established science or a score.

Visual and audio PRs may add deterministic facts while preserving Gemini's complete-video judgment. Combined reporting will reconcile those inputs into one timestamped critique without confidence or virality scores. The final PR evaluates the complete analyser using manually uploaded Reels; it adds no platform integration or storage.

Throughout this phase, REMI stays private to two users and retains the one-MP4-plus-one-question workflow. It has no Meta API, old-Reel import, Insights, database, creator memory or historical comparison. It does not volunteer criticism of the creator's script, subject, claims or content choices.

### Later: Research-Grounded Viewer-Friction Knowledge

After the manual analyser is complete and evaluated, a separate research phase will validate and improve the operational rubric using reliable evidence. Evidence provenance, applicability and limitations must be recorded. Research may confirm, revise or remove rubric criteria; the phase-1 rubric must not be presented as already research-validated.

This phase does not turn generic datasets into live-analysis truth, produce universal benchmarks or predict virality. Its PR breakdown will be decided after real-Reel evaluation.

### Post-Research: Connected Creator Data

Meta authorization, old-Reel imports, available Insights, a persistent creator-account/profile layer, databases, creator history and historical comparison may be considered only after both earlier phases. Their exact order and API details are not approved yet.

If later approved, REMI's backend—not Gemini—must handle Meta authentication and retrieval. Creator data must remain isolated, raw videos must not be permanently retained by default, and fresh critique must remain separate from history. Historical association cannot prove causation.

## Explicitly Deferred or Rejected

The approved roadmap does not add or reintroduce:

- generic viral-content datasets to live analysis;
- fine-tuning Gemini;
- virality prediction;
- universal benchmarks that mix unrelated creators;
- automatic creative rewriting;
- permanent raw-video storage;
- confidence scores; the first manual-analyser PR removes the current legacy field;
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

## Planned Product Validation

The sixth manual-analyser PR will evaluate approximately ten varied, manually uploaded Reels, including effective Reels where zero findings is the correct result. It will measure timestamp accuracy, evidence quality, usefulness of the explanation, false or forced criticism, hallucinations, domain safety and repeat-run directional consistency.

The thresholds remain learning tools rather than marketing claims. No Meta Insights or creator history are inputs to this evaluation. Any later historical performance evidence may support comparison but cannot prove why a Reel succeeded or failed.
