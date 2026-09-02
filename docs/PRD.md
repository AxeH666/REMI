# Product Requirements Document

## Product

**Name:** REMI  
**Expansion:** Reel Evaluation & Moment Inspector  
**Stage:** Local proof of concept  
**Primary users:** The developer and one mental-health creator

## Problem

A creator can write a reasonable script yet produce a finished Reel that feels awkward, unconvincing, slow or amateur. A human viewer may sense the problem without being able to identify its cause or prescribe an edit.

Most creator tools report metrics or repeat generic rules such as “improve the hook.” They do not reliably explain what is wrong with the actual filmed execution.

## Goal

Determine whether multimodal video AI can:

1. articulate why a finished Reel feels wrong;
2. cite the exact moments that support the diagnosis;
3. give corrections the creator can execute;
4. preserve effective parts of the Reel instead of rewriting everything.

## Non-Goal

Version 0 is not intended to prove that AI can predict reach or virality. Reach depends on factors that are unavailable before posting and cannot be inferred reliably from the video alone.

## Core User Story

> As a creator, I upload a Reel and ask why it feels wrong so that I receive specific, timestamped edit or reshoot instructions before posting it.

## Primary Workflow

1. User opens the local application.
2. User selects an MP4 Reel.
3. User enters or edits the analysis question.
4. User submits the form.
5. The application validates and uploads the video to Gemini.
6. Gemini analyses the video using the REMI analysis contract.
7. The application validates the structured response.
8. The results page displays the critique.
9. The user manually decides which recommendations are correct and useful.

## Functional Requirements

### Upload

- Select one MP4 file.
- Show filename, size and removable selection.
- Reject unsupported formats and files above the configured limit.
- Do not automatically upload before submission.

### Prompt

- Provide a useful default prompt: `Why does this Reel feel wrong?`
- Allow free-form editing.
- Require a non-empty prompt with a sensible maximum length.

### Analysis

- Send the complete video and prompt to Gemini.
- Apply the system instructions in `AI_ANALYSIS_CONTRACT.md`.
- Request the documented JSON structure.
- Handle long-running upload and analysis states.

### Results

Display:

- overall verdict;
- up to three highest-impact problems;
- timestamp range for every problem;
- observed evidence;
- interpretation;
- exact edit or reshoot instruction;
- confidence and uncertainty;
- what should remain unchanged;
- analysis limitations.

### Error Handling

Provide useful states for:

- no video;
- empty prompt;
- invalid type;
- oversized file;
- provider upload failure;
- provider analysis failure or timeout;
- invalid or incomplete model JSON;
- missing environment configuration.

## Quality Requirements

- The response should take less than two minutes for an ordinary short Reel under normal conditions; this is a target, not a guaranteed SLA.
- Mobile usability is helpful but desktop Windows Chrome is the required environment.
- No permanent application storage.
- No raw model HTML.
- Accessible labels, focus states and error messages.

## AI Quality Bar

A critique fails if it:

- gives advice applicable to almost any Reel;
- rewrites the script without analysing execution;
- references a moment not present in the video;
- invents retention or performance statistics;
- recommends constant faster cuts without explaining why;
- provides a vague fix such as “be more engaging”;
- pushes unsafe or manipulative mental-health messaging.

## Success Criteria

Test approximately ten Reels. The POC is promising if:

- at least 70% of returned timestamp references are materially correct;
- at least 60% of the top-three recommendations are accepted as useful by the creator;
- at least half of the analysed Reels contain one insight the reviewer felt but could not previously articulate;
- hallucinated video events or statistics are rare and immediately visible;
- repeat analysis with the same inputs is directionally consistent.

These thresholds are provisional. Record the raw evaluations; do not tune results to claim success.

## Future Scope, Only After Validation

- recommendation feedback and accepted-edit tracking;
- compare two versions of a Reel;
- creator-specific memory;
- historical Reels and Insights screenshots;
- objective frame, audio and transcript extraction;
- authentication and private deployment;
- Instagram integration.

