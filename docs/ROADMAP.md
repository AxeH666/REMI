# REMI Roadmap

## Status

This file is the authoritative order for future REMI work. `main` is the stable baseline. Each named component must be developed as one logical PR with its tests and documentation, and the next component must not begin until the current PR is reviewed and merged.

Private POC access is already merged. The stable application is limited to the owner and one friend and uses a manually uploaded MP4 plus one user question. It sends the complete Reel to Gemini, validates a structured response and does not permanently store the upload, prompt or result. It has no database, Meta integration, old-Reel import, Insights, creator history or historical comparison.

The current response still contains legacy edit/reshoot instructions and numeric confidence, and its prompt broadly asks about hook, clarity, progression and payoff. That is implemented behavior, not the approved manual-analyser contract. The first PR below removes the solution/score fields and enforces the no-unsolicited-script/content boundary before the remaining phase work proceeds.

## Phase 1 - Manual Friction Analyser

This is the immediate product phase. Throughout it, REMI remains a private two-user application based on manual MP4 uploads. It does not add a database, permanent storage, Meta access, old-Reel imports, Insights, creator memory, historical comparison, virality prediction or a general analytics product.

Once PR 1 is merged, every later PR in this phase must preserve the critique-only boundary: no creative fixes, confidence scores, forced findings or unsolicited criticism of the creator's script, topic, claims or content choices. REMI may refer to spoken or on-screen content only when it is necessary evidence for the perceptual friction being reported or the user directly asks about it.

### 1. `feat/critique-only-contract`

Replace the legacy creative-direction response with evidence-based criticism. Each finding contains an observed moment, what feels wrong, the likely viewer effect and supporting visible or audible evidence. Allow zero findings. Remove edit/reshoot instructions, solution fields, confidence values, scores and forced criticism from the prompt, schema, interface and tests. Prohibit unsolicited script or content criticism.

### 2. `feat/operational-friction-rubric`

Define a versioned operational perceptual-friction rubric for the manual analyser. It should turn observable delivery, pacing, framing, expression, voice, editing, visual-layout and audio cues into consistent questions about viewer comprehension, attention, trust and emotional reception.

This rubric is a practical, testable working framework, not established science, a universal benchmark or a score. It must stay grounded in evidence from the uploaded Reel and inside the critique-only contract.

### 3. `feat/visual-timing-analysis`

Add deterministic visual-change and duration evidence using FFmpeg or an equivalent tool while preserving Gemini's complete-video input. Cover inserted images, screenshots, text cards, captions, crops, unreadable text, clutter, rapid cuts, sub-second visuals, overlong holds and comprehension time. Select a frame or sampling strategy only after representative testing. Keep derived frames temporary.

### 4. `feat/audio-friction-analysis`

Add measurable audio facts such as loudness, peaks, clipping and timing where useful. Keep Gemini responsible for judging speech/music competition, distracting effects, sudden changes and emotional mismatch. This PR owns audio friction only; cross-modal synthesis belongs to the next PR.

### 5. `feat/combined-friction-reporting`

Combine the native Gemini review, operational rubric, deterministic visual evidence and audio-friction evidence into one coherent timestamped critique. Preserve the source and limits of each kind of evidence, reconcile overlapping findings and avoid double-counting one moment. Combined visual/audio overload is assessed here. Do not introduce an overall score or confidence percentage.

### 6. `test/real-reel-evaluation`

Evaluate the integrated manual analyser with representative, manually uploaded Reels from the two private users. Compare results with blind human observations and record timestamp accuracy, evidence quality, usefulness, forced criticism, hallucinations, domain-safety failures and repeat-run consistency. This PR validates the product; it does not add persistence, platform data or new product scope.

## Phase 2 - Research-Grounded Viewer-Friction Knowledge

This phase begins only after the six manual-analyser PRs are reviewed, merged and evaluated. It will test and improve the operational rubric using reliable evidence, with source provenance, applicability and limitations recorded. Research may confirm, revise or remove rubric criteria; it must not present the phase-1 working framework as already scientifically validated.

This is a knowledge-validation phase, not a live generic-content dataset, virality model or universal scoring system. Its exact PR breakdown will be decided after the real-Reel evaluation.

## Phase 3 - Connected Creator Data

Meta API integration, creator-authorized old-Reel imports, available Insights, a persistent creator-account/profile layer, databases, creator history and historical comparison are gated until both the manual-analyser and research-grounded knowledge phases are complete. They are not approved as immediate implementation work, and their exact PR order remains undecided.

If this phase is approved later, the existing requirements still apply: REMI's backend handles Meta credentials and retrieval, creators remain isolated, raw Reel videos are not permanently retained by default, and fresh critique remains separate from historical comparison. Historical associations must never be presented as proven causation.

## Deferred or Rejected

The roadmap does not approve:

- generic viral-content datasets as live-analysis inputs;
- Gemini fine-tuning;
- virality prediction;
- universal benchmarks across unrelated creators;
- unsolicited script, topic, claim or content criticism;
- automatic script, hook, edit or reshoot direction;
- permanent raw-video storage;
- confidence scores or percentages;
- a full analytics dashboard; or
- automatic Instagram posting.

Reliable public evidence may support the phase-2 research process, but it is not the source of truth for a creator's personal critique and is not automatically an input to live analysis.
