import "server-only";

import {
  parseServerEnvironment,
  type ServerEnvironment,
} from "./env-validation";

export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment(process.env);
}
