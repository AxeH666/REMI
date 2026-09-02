import { z } from "zod";

const verdictSchema = z.string().trim().min(1).max(500);
const titleSchema = z.string().trim().min(1).max(160);
const detailSchema = z.string().trim().min(1).max(1_200);
const conciseListItemSchema = z.string().trim().min(1).max(300);

export const fixTypeSchema = z.enum(["edit", "reshoot", "either", "none"]);

export const analysisProblemSchema = z
  .object({
    title: titleSchema,
    startSeconds: z.number().finite().min(0),
    endSeconds: z.number().finite().min(0),
    observation: detailSchema,
    interpretation: detailSchema,
    fixType: fixTypeSchema,
    instruction: detailSchema,
    confidence: z.number().finite().min(0).max(1),
  })
  .strict()
  .superRefine((problem, context) => {
    if (problem.endSeconds < problem.startSeconds) {
      context.addIssue({
        code: "custom",
        message: "End time must be at or after the start time.",
        path: ["endSeconds"],
      });
    }
  });

export const analysisResultSchema = z
  .object({
    verdict: verdictSchema,
    problems: z.array(analysisProblemSchema).max(3),
    keep: z.array(conciseListItemSchema),
    limitations: z.array(conciseListItemSchema),
  })
  .strict();

/** JSON Schema subset accepted by Gemini structured output. Zod remains authoritative. */
export const analysisResultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "problems", "keep", "limitations"],
  propertyOrdering: ["verdict", "problems", "keep", "limitations"],
  properties: {
    verdict: {
      type: "string",
      description: "Concise overall judgment of the finished Reel execution.",
    },
    problems: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      description: "Zero to three highest-impact problems, highest impact first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "startSeconds",
          "endSeconds",
          "observation",
          "interpretation",
          "fixType",
          "instruction",
          "confidence",
        ],
        propertyOrdering: [
          "title",
          "startSeconds",
          "endSeconds",
          "observation",
          "interpretation",
          "fixType",
          "instruction",
          "confidence",
        ],
        properties: {
          title: { type: "string", description: "Concise problem title." },
          startSeconds: {
            type: "number",
            minimum: 0,
            description: "Approximate start timestamp in seconds.",
          },
          endSeconds: {
            type: "number",
            minimum: 0,
            description: "Approximate end timestamp in seconds.",
          },
          observation: {
            type: "string",
            description: "Only the visible or audible evidence in the video.",
          },
          interpretation: {
            type: "string",
            description: "Why the observed evidence harms the intended effect.",
          },
          fixType: {
            type: "string",
            enum: ["edit", "reshoot", "either", "none"],
          },
          instruction: {
            type: "string",
            description: "Smallest exact executable edit or reshoot instruction.",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Calibrated confidence from zero through one.",
          },
        },
      },
    },
    keep: {
      type: "array",
      description: "Effective elements that should remain unchanged.",
      items: { type: "string" },
    },
    limitations: {
      type: "array",
      description: "Uncertainty and judgments the video cannot support.",
      items: { type: "string" },
    },
  },
} as const;

export type AnalysisProblem = z.infer<typeof analysisProblemSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export function parseAnalysisResult(value: unknown): AnalysisResult {
  return analysisResultSchema.parse(value);
}

export function parseAnalysisResultJson(json: string): AnalysisResult {
  return parseAnalysisResult(JSON.parse(json));
}
