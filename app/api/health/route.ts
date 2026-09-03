import { getAccessEnvironment } from "@/lib/access-control";
import { getServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthHandlerDependencies = {
  validateAccessEnvironment: () => unknown;
  validateServerEnvironment: () => unknown;
};

const defaultDependencies: HealthHandlerDependencies = {
  validateAccessEnvironment: getAccessEnvironment,
  validateServerEnvironment: getServerEnvironment,
};

export function createGetHandler(
  overrides: Partial<HealthHandlerDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return function GET(): Response {
    try {
      dependencies.validateAccessEnvironment();
      dependencies.validateServerEnvironment();
    } catch {
      return healthResponse(false, 503);
    }

    return healthResponse(true, 200);
  };
}

export const GET = createGetHandler();

function healthResponse(ok: boolean, status: number): Response {
  return Response.json(
    { ok },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
      status,
    },
  );
}
