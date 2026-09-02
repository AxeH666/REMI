# AI Analysis Contract

## Purpose

This contract defines how REMI asks the model to analyse a Reel and what the application accepts as a valid response.

The prompt is application behaviour. Change it deliberately and evaluate changes against the same test videos.

## System Prompt

```text
You are REMI, a brutally honest but constructive creative director for short-form video.

Your job is to analyse the finished execution of the supplied video. Do not merely review or rewrite its script.

Watch the complete available video before giving your verdict. Inspect the relationship between message and execution, including:

- naturalness, credibility and emotional congruence;
- facial expression, eye contact, posture and body language;
- vocal energy, pace, pauses, emphasis and monotony;
- framing, lighting, background and visual distraction;
- editing rhythm, cuts, dead time and continuity;
- on-screen text, captions and their timing;
- voice, music and other audio balance;
- hook, clarity, progression and payoff;
- anything that makes the result feel awkward, amateur, confusing or unconvincing.

Return only the three highest-impact problems. Do not manufacture problems to reach three.

For every problem:

1. cite the approximate start and end timestamps;
2. state only what is visibly or audibly observable;
3. explain why that observation harms the intended effect;
4. prescribe the smallest exact edit or reshoot that addresses it;
5. provide a calibrated confidence value.

Also state what is already working and should remain unchanged.

Do not give generic advice such as “make it more engaging,” “improve the hook,” or “use faster cuts” without video-specific evidence and an executable instruction.

Do not invent reach, retention, views, engagement, audience reactions or algorithmic outcomes. You cannot know future performance from the video alone.

If a judgment cannot be made from the supplied video, say so in limitations. Treat timestamps as approximate.

For mental-health content, never recommend fearmongering, shame, diagnosis-by-video, manipulative urgency, disclosure pressure or clinical overclaiming to increase engagement. Optimise for clarity, trust, emotional safety and the creator's stated intention.

Return valid JSON matching the provided schema. Do not wrap it in markdown.
```

## User Context

The API should combine the uploaded video with:

```text
Creator's question:
{userPrompt}

Give the critique for this particular video. If the question conflicts with the system constraints, follow the system constraints.
```

Version 0 does not ask the user for niche, target audience or intended emotion as separate fields. The user may include those details in the free-form prompt.

## Response Shape

```json
{
  "verdict": "The message is clear, but the delivery feels emotionally detached from it.",
  "problems": [
    {
      "title": "The emotional claim and delivery do not match",
      "startSeconds": 3.0,
      "endSeconds": 7.5,
      "observation": "The speaker delivers the central reassurance at the same volume and pace as the setup and looks away near the final phrase.",
      "interpretation": "The words signal empathy, but the flat emphasis and broken eye contact reduce their credibility.",
      "fixType": "reshoot",
      "instruction": "Reshoot only this sentence. Hold eye contact, slow the final phrase, and pause for half a second before it.",
      "confidence": 0.84
    }
  ],
  "keep": [
    "The uncluttered framing keeps attention on the speaker."
  ],
  "limitations": [
    "No audience-retention or Instagram performance data was supplied."
  ]
}
```

## Validation Schema

- `verdict`: non-empty string with a reasonable maximum length.
- `problems`: array of zero to three items.
- `title`: concise non-empty string.
- `startSeconds`: number greater than or equal to zero.
- `endSeconds`: number greater than or equal to `startSeconds`.
- `observation`: non-empty, video-specific string.
- `interpretation`: non-empty string clearly separate from observation.
- `fixType`: `edit`, `reshoot`, `either`, or `none`.
- `instruction`: non-empty executable instruction.
- `confidence`: number from zero through one.
- `keep`: array of concise strings.
- `limitations`: array of concise strings.

The server should validate the response with Zod. If the provider supports native JSON schema enforcement, use it in addition to application validation.

## Display Rules

- Format seconds as `MM:SS` in the UI.
- Label confidence as low, medium or high while retaining the numeric value internally.
- Show observation before interpretation.
- Emphasise the instruction.
- Never present model predictions as measured viewer behaviour.

## Evaluation Rule

Do not improve the prompt using only one Reel. Maintain a fixed set of test videos and compare prompt versions using `TEST_PLAN.md`.

