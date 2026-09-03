import { z } from "zod";

import { DEFAULT_MAX_VIDEO_MB } from "./project-config";

export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";
export { DEFAULT_MAX_VIDEO_MB };

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const geminiKeyPlaceholders = new Set([
  "replace_with_your_key",
  "replace_with_a_new_key",
]);

const maxVideoMbSchema = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().positive().default(DEFAULT_MAX_VIDEO_MB),
);

const publicEnvironmentSchema = z.object({
  MAX_VIDEO_MB: maxVideoMbSchema,
});

const serverEnvironmentSchema = publicEnvironmentSchema.extend({
  GEMINI_API_KEY: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !geminiKeyPlaceholders.has(value)),
  GEMINI_MODEL: z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).default(DEFAULT_GEMINI_MODEL),
  ),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parsePublicEnvironment(
  source: Record<string, string | undefined>,
): PublicEnvironment {
  return parseEnvironment(publicEnvironmentSchema, source);
}

export function parseServerEnvironment(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  return parseEnvironment(serverEnvironmentSchema, source);
}

function parseEnvironment<T>(
  schema: z.ZodType<T>,
  source: Record<string, string | undefined>,
): T {
  const result = schema.safeParse(source);

  if (!result.success) {
    const invalidVariables = [
      ...new Set(
        result.error.issues.map(
          (issue) => String(issue.path[0] ?? "environment"),
        ),
      ),
    ];

    throw new Error(
      `Invalid server environment configuration: ${invalidVariables.join(", ")}`,
    );
  }

  return result.data;
}
