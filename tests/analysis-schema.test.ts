import fixture from "@/fixtures/analysis-result.json";
import {
  formatTimestamp,
  getConfidenceLabel,
} from "@/lib/analysis-display";
import {
  analysisResultSchema,
  parseAnalysisResultJson,
} from "@/lib/analysis-schema";
import { describe, expect, it } from "vitest";

describe("analysisResultSchema", () => {
  it("accepts the complete documented response shape", () => {
    expect(analysisResultSchema.parse(fixture)).toEqual(fixture);
  });

  it.each([0, 1, 2])("accepts a result with %i problems", (problemCount) => {
    expect(
      analysisResultSchema.safeParse({
        ...fixture,
        problems: fixture.problems.slice(0, problemCount),
      }).success,
    ).toBe(true);
  });

  it("rejects more than three problems", () => {
    const result = analysisResultSchema.safeParse({
      ...fixture,
      problems: [...fixture.problems, fixture.problems[0]],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a timestamp range that ends before it starts", () => {
    const result = analysisResultSchema.safeParse({
      ...fixture,
      problems: [
        {
          ...fixture.problems[0],
          startSeconds: 8,
          endSeconds: 7.9,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["problems", 0, "endSeconds"]);
    }
  });

  it.each([-0.01, 1.01])("rejects confidence outside zero to one (%s)", (confidence) => {
    const result = analysisResultSchema.safeParse({
      ...fixture,
      problems: [{ ...fixture.problems[0], confidence }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown fix type", () => {
    const result = analysisResultSchema.safeParse({
      ...fixture,
      problems: [{ ...fixture.problems[0], fixType: "rewrite" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an incomplete result", () => {
    const incompleteFixture = {
      verdict: fixture.verdict,
      problems: fixture.problems,
      keep: fixture.keep,
    };

    expect(analysisResultSchema.safeParse(incompleteFixture).success).toBe(
      false,
    );
  });

  it("rejects malformed JSON before validating the response", () => {
    expect(() => parseAnalysisResultJson('{"verdict":')).toThrow(SyntaxError);
  });
});

describe("formatTimestamp", () => {
  it.each([
    [0, "00:00"],
    [7.9, "00:07"],
    [65, "01:05"],
    [3_605, "60:05"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatTimestamp(seconds)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid timestamp (%s)",
    (seconds) => {
      expect(() => formatTimestamp(seconds)).toThrow(RangeError);
    },
  );
});

describe("getConfidenceLabel", () => {
  it.each([
    [0, "low"],
    [0.49, "low"],
    [0.5, "medium"],
    [0.79, "medium"],
    [0.8, "high"],
    [1, "high"],
  ] as const)("labels %s confidence as %s", (confidence, expected) => {
    expect(getConfidenceLabel(confidence)).toBe(expected);
  });

  it.each([-0.01, 1.01, Number.NaN])(
    "rejects invalid confidence (%s)",
    (confidence) => {
      expect(() => getConfidenceLabel(confidence)).toThrow(RangeError);
    },
  );
});
