import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const OWNER_USERNAME = "owner";
export const FRIEND_USERNAME = "friend";
export const MIN_ACCESS_PASSWORD_LENGTH = 24;

const placeholderPasswords = new Set([
  "replace_with_a_unique_random_owner_password",
  "replace_with_a_unique_random_friend_password",
]);

const accessPasswordSchema = z
  .string()
  .min(MIN_ACCESS_PASSWORD_LENGTH)
  .max(128)
  .regex(/^[\x21-\x7e]+$/)
  .refine((password) => !placeholderPasswords.has(password));

const accessEnvironmentSchema = z
  .object({
    REMI_OWNER_PASSWORD: accessPasswordSchema,
    REMI_FRIEND_PASSWORD: accessPasswordSchema,
  })
  .superRefine((environment, context) => {
    if (environment.REMI_OWNER_PASSWORD === environment.REMI_FRIEND_PASSWORD) {
      context.addIssue({
        code: "custom",
        message: "Access passwords must be unique.",
        path: ["REMI_FRIEND_PASSWORD"],
      });
    }
  });

export type AccessEnvironment = z.infer<typeof accessEnvironmentSchema>;
export type AccessStatus = "authorized" | "unauthorized" | "misconfigured";

export function parseAccessEnvironment(
  source: Record<string, string | undefined>,
): AccessEnvironment {
  const result = accessEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const invalidVariables = [
      ...new Set(
        result.error.issues.map(
          (issue) => String(issue.path[0] ?? "access environment"),
        ),
      ),
    ];

    throw new Error(
      `Invalid private-access configuration: ${invalidVariables.join(", ")}`,
    );
  }

  return result.data;
}

export function getAccessEnvironment(): AccessEnvironment {
  return parseAccessEnvironment(process.env);
}

export function getRequestAccessStatus(
  request: Pick<Request, "headers">,
  source: Record<string, string | undefined> = process.env,
): AccessStatus {
  let environment: AccessEnvironment;

  try {
    environment = parseAccessEnvironment(source);
  } catch {
    return "misconfigured";
  }

  const credentials = parseBasicAuthorization(
    request.headers.get("authorization"),
  );
  if (!credentials) return "unauthorized";

  const ownerUsernameMatches = constantTimeEqual(
    credentials.username,
    OWNER_USERNAME,
  );
  const ownerPasswordMatches = constantTimeEqual(
    credentials.password,
    environment.REMI_OWNER_PASSWORD,
  );
  const friendUsernameMatches = constantTimeEqual(
    credentials.username,
    FRIEND_USERNAME,
  );
  const friendPasswordMatches = constantTimeEqual(
    credentials.password,
    environment.REMI_FRIEND_PASSWORD,
  );

  return (ownerUsernameMatches && ownerPasswordMatches) ||
    (friendUsernameMatches && friendPasswordMatches)
    ? "authorized"
    : "unauthorized";
}

type BasicCredentials = {
  username: string;
  password: string;
};

function parseBasicAuthorization(
  authorization: string | null,
): BasicCredentials | null {
  if (!authorization) return null;

  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 === 1) return null;

  let decoded: string;
  try {
    const bytes = Buffer.from(encoded, "base64");
    const canonical = bytes.toString("base64").replace(/=+$/, "");
    if (canonical !== encoded.replace(/=+$/, "")) return null;
    decoded = bytes.toString("utf8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 1) return null;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!/^[\x21-\x7e]+$/.test(username) || !/^[\x21-\x7e]+$/.test(password)) {
    return null;
  }

  return { username, password };
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();

  return timingSafeEqual(actualDigest, expectedDigest);
}
