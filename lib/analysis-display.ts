export type ConfidenceLabel = "low" | "medium" | "high";

export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError("Timestamp must be a finite, non-negative number.");
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError("Confidence must be between 0 and 1.");
  }

  if (confidence < 0.5) {
    return "low";
  }

  if (confidence < 0.8) {
    return "medium";
  }

  return "high";
}
