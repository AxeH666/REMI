# REMI Roadmap

## Status

This roadmap records the ordered REMI components. Private POC access is implemented by `feat/private-poc-access` and becomes part of the stable baseline when that PR is merged. Later components remain planned and are not implemented.

`main` is the stable baseline. Each component below must be developed on its named branch as one logical PR, with its tests and documentation included. Do not begin the next component until the current PR has been reviewed and merged. A deployed stable POC may remain usable while a planned component is developed separately.

## Current Baseline to Preserve

Today REMI accepts one completed MP4 and one question, sends the full video to Gemini for native video-and-audio analysis, validates a structured timestamped critique and does not permanently store the uploaded video. The private-access PR adds deployment readiness and two-user access without changing that analysis behavior.

Deployment remains an explicit post-merge owner action. REMI still has no Instagram integration, persistent creator data, creator memory or historical comparison. The current response still contains edit/reshoot instructions and numeric confidence; those remain until the second roadmap PR changes the prompt, schema, UI and tests together.

## Planned PR Order

### 1. `feat/private-poc-access`

**Status:** Implemented; awaiting review and merge before deployment.

Prepare the existing POC for Railway so the owner and one invited friend can use it. Server-enforced access prevents anonymous public use from consuming the Gemini API. The Gemini key remains server-side and the current analysis quality and workflow are unchanged.

### 2. `feat/critique-only-contract`

Change REMI from creative-direction output to evidence-based criticism. Each finding contains an observed moment, what feels wrong, likely viewer effect and supporting visible or audible evidence. Allow zero findings. Remove creative solutions, edit/reshoot instructions, scores, confidence values and forced criticism from prompt, schema, UI and tests.

### 3. `feat/visual-timing-analysis`

Add deterministic visual-change and duration evidence using FFmpeg or an equivalent tool while preserving Gemini's full-video input. Cover inserted images, screenshots, cards, captions, crops, unreadable text, clutter, rapid cuts, sub-second visuals, overlong holds and comprehension time. Select a frame or sampling strategy only after testing.

### 4. `feat/audio-sensory-analysis`

Add measurable loudness, peak, clipping and timing facts where useful. Keep Gemini responsible for judging speech/music competition, distracting effects, sudden changes, emotional mismatch and combined visual/audio overload.

### 5. `feat/instagram-connection`

Allow eligible professional-account creators to authorize REMI through Instagram's official API. REMI's backend handles credentials and retrieves only the authorized creator's own available Reels and Insights. Verify exact Meta permissions, account eligibility, metric availability and review requirements during implementation; none is guaranteed here.

### 6. `feat/creator-memory`

Store creator-scoped structured critiques, verified metrics, Reel purpose and format, dates, durations, observation tags, and model/prompt/schema versions. Do not permanently retain raw Reel videos by default. Enforce cross-creator isolation and provide deletion and privacy controls before broader use.

### 7. `feat/historical-comparison`

Keep fresh critique and history comparison separate. First analyse the unpublished Reel without performance history; then compare the unchanged critique with only relevant Reels from the same creator. Use observed counts instead of confidence scores and describe associations without claiming that history proves causation.

## Deferred or Rejected

The roadmap does not approve:

- generic viral-content datasets as live-analysis inputs;
- Gemini fine-tuning;
- virality prediction;
- universal benchmarks across unrelated creators;
- automatic script, hook, edit or reshoot direction;
- permanent raw-video storage;
- confidence scores or percentages;
- a full analytics dashboard; or
- automatic Instagram posting.

Public datasets may later be considered for offline evaluation, not as the source of truth for personal critique.
