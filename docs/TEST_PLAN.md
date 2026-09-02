# Test and Evaluation Plan

## Two Kinds of Testing

REMI needs conventional software tests and a separate creative-quality evaluation. Passing unit tests does not mean the critique is useful.

## Software Tests

### Validation

- accepts a valid MP4 under the configured limit;
- rejects missing video;
- rejects unsupported MIME types;
- rejects oversized files;
- rejects empty and excessive prompts;
- rejects missing required environment variables.

### Model Response

- accepts a complete valid response;
- accepts fewer than three problems;
- rejects more than three problems;
- rejects invalid timestamp ordering;
- rejects confidence outside zero to one;
- rejects unknown `fixType` values;
- handles malformed JSON and incomplete results.

### API Route

- never returns secrets;
- maps provider errors to safe statuses/messages;
- repeats MIME type, file size, prompt and environment validation before provider work;
- rejects cross-origin browser submissions before configuration or provider work;
- best-effort deletes every named provider upload after success and failure;
- schedules deletion when a provider upload resolves only after request timeout;
- cleans any local temporary resource if a future SDK path creates one;
- returns the application-owned schema.

All normal automated tests must replace the Gemini boundary with a fake or mock. They must fail if a real provider or network call is attempted.

## Creative Evaluation Set

Use approximately ten Reels containing a range of known issues:

- strong script with unnatural delivery;
- weak eye contact or distracting movement;
- flat voice or incorrect emotional tone;
- slow introduction;
- confusing edit or continuity break;
- bad music/voice balance;
- excessive on-screen text;
- strong Reel with few meaningful problems;
- calm mental-health Reel that should not be made artificially aggressive;
- energetic MMA or technical Reel where faster pacing is appropriate.

Do not include only failed Reels. The model must prove it can preserve strengths and avoid manufacturing criticism.

## Blind Evaluation Process

1. Reviewer watches the Reel without REMI.
2. Reviewer writes what feels wrong and the important timestamps.
3. REMI analyses the Reel with the fixed prompt.
4. Reviewer scores REMI without changing the human notes.
5. Creator independently marks recommendations accepted/rejected.

## Scorecard

Score each dimension from 0 to 2:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Human truth | Misses or contradicts the felt issue | Partially identifies it | Clearly articulates it |
| Timestamp | Wrong/nonexistent | Approximate but relevant | Accurate and material |
| Evidence | Generic assertion | Some video-specific detail | Clear visible/audible evidence |
| Instruction | Vague or harmful | Directionally useful | Immediately executable |
| Prioritisation | Focuses on trivia | Mixed importance | Selects highest-impact issues |
| Strength preservation | Manufactures changes | Mentions a strength | Clearly protects what works |
| Domain safety | Manipulative/unsafe | Neutral | Appropriate to topic and intent |

## Product Metrics

- accepted-edit rate;
- correct timestamp rate;
- percentage of videos with at least one newly articulated insight;
- generic-advice rate;
- hallucination rate;
- repeat-run directional consistency;
- median analysis time;
- failure rate.

## Initial Decision Thresholds

Proceed if the evaluation approximately achieves:

- at least 60% accepted-edit rate;
- at least 70% materially correct timestamps;
- one newly articulated useful insight on at least half the Reels;
- no repeated unsafe mental-health recommendations;
- low hallucination frequency.

These are learning thresholds, not marketing claims.
