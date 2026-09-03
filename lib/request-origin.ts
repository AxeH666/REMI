export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const addressedOrigin = getAddressedOrigin(request);
  if (!addressedOrigin) return false;

  try {
    return new URL(origin).origin === addressedOrigin;
  } catch {
    return false;
  }
}

function getAddressedOrigin(request: Request): string | null {
  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );
  const forwardedHost = firstForwardedValue(
    request.headers.get("x-forwarded-host"),
  );

  if (forwardedProtocol || forwardedHost) {
    if (!forwardedProtocol || !forwardedHost) return null;

    const normalizedProtocol = forwardedProtocol.toLowerCase();
    if (normalizedProtocol !== "http" && normalizedProtocol !== "https") {
      return null;
    }

    return parseOrigin(`${normalizedProtocol}://${forwardedHost}`);
  }

  const host = request.headers.get("host");
  if (!host) return null;

  try {
    return parseOrigin(`${new URL(request.url).protocol}//${host}`);
  } catch {
    return null;
  }
}

function firstForwardedValue(value: string | null): string | null {
  const firstValue = value?.split(",", 1)[0]?.trim();
  return firstValue || null;
}

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
