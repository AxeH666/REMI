# AI Analysis Contract

## Status

This document separates the contract implemented today from the approved critique-only contract planned for `feat/critique-only-contract`.

The code currently uses the implemented baseline below. The planned contract is a finalized product decision, but it is not implemented by this documentation PR. Its future implementation must update the prompt, Zod schema, rendered result and tests together without reducing the quality of Gemini's existing full-video analysis.

## Current Implemented Baseline

The current application:

- asks Gemini to watch the complete available video;
- analyses visual and audio execution rather than only the script;
- returns zero to three timestamped problems plus a verdict, strengths and limitations;
- asks for visible or audible observations and an interpretation;
- also returns `fixType`, an edit or reshoot `instruction`, and numeric `confidence`; and
- validates the result with Zod before rendering it.

Those solution and confidence fields describe current software behavior only. They are scheduled for removal in the critique-only contract PR.

## Approved Planned Contract

### Purpose

REMI is a Reel critic, not a creative director. It should help a creator understand the finished Reel while leaving all creative decisions to the creator.

The model must watch the whole available Reel before judging it. It must analyse delivery, pacing, framing, facial expression, voice, editing, inserted images, screenshots, text, layout and audio.

For each of no more than three highest-impact findings, return:

1. **Observed moment:** the exact timestamp or interval being discussed.
2. **What feels wrong:** a concise description of the observable problem.
3. **Likely viewer effect:** a cautious explanation of how the problem may affect comprehension, attention, trust or emotional reception.
4. **Supporting evidence:** the specific visible or audible evidence in the Reel.

The model may return zero findings. It must not manufacture a problem to fill the response.

### Planned Behaviour Rules

The critique-only model must:

- assess the finished execution rather than merely reviewing the script;
- distinguish observation from likely viewer effect;
- ground every finding in visible or audible evidence;
- state uncertainty qualitatively in limitations when the Reel cannot support a judgment;
- identify effective elements without directing the creator to preserve or change them;
- avoid generic advice; and
- treat timestamps as approximate unless deterministic timing data is supplied.

The critique-only model must not:

- rewrite scripts or invent hooks;
- provide edits, reshoot instructions or any other creative solution;
- tell the creator how to perform or express their personal creativity;
- produce virality, reach, retention, engagement or confidence scores;
- produce confidence percentages;
- force criticism;
- invent audience or platform statistics; or
- claim that an observation definitely caused past failure or will cause future performance.

For mental-health content, the critique must not reward fearmongering, shame, diagnosis-by-video, manipulative urgency, disclosure pressure or clinical overclaiming.

### Planned Conceptual Response Shape

The exact application JSON schema will be finalized and tested in the critique-only contract PR. It must express this information without solution or score fields:

```json
{
  "verdict": "The central point is understandable, but one section becomes hard to follow.",
  "findings": [
    {
      "observedMoment": {
        "startSeconds": 3.0,
        "endSeconds": 7.5
      },
      "whatFeelsWrong": "The spoken explanation and dense text card compete for attention.",
      "likelyViewerEffect": "A viewer may miss part of the explanation while trying to read the card.",
      "supportingEvidence": "The card contains six lines of text and is visible only while the speaker introduces a new point."
    }
  ],
  "effectiveElements": [
    "The uncluttered opening keeps attention on the speaker."
  ],
  "limitations": [
    "Viewer comprehension cannot be measured from the video alone."
  ]
}
```

### Planned Validation Rules

- Accept zero to three findings, ordered by likely impact.
- Require a valid non-negative timestamp or interval for every finding.
- Require all four finding elements to be non-empty and video-specific.
- Reject solution fields, confidence values, scores and unsupported performance claims.
- Keep the response application-owned, strictly validated and safe to render as text.

## Planned Deterministic Evidence

Gemini remains responsible for human-like judgment. Planned visual and audio preprocessing may later supply exact scene-change timing, selected frames, loudness, peaks and other measurable facts. It complements the complete-video Gemini input; it does not replace it.

No exact frame-sampling rate is approved until representative Reels have been tested. Any deterministic measurement must remain distinguishable from Gemini's interpretation.

## Evaluation Rule

Do not change the prompt using only one Reel. Compare contract versions with the fixed evaluation set in `TEST_PLAN.md`. A contract change is acceptable only if it preserves evidence quality, timestamp usefulness, restraint and mental-health safety.
