/** Edge-safe, explicit product origins. Never derive an authentication origin from forwarded headers. */
export type PaxProduct = "main" | "accounts" | "talent" | "practice";
export function productRoutingEnabled() {
  return process.env.PAX_PRODUCT_ROUTING_ENABLED === "true";
}
export function talentEnabled() {
  return process.env.TALENT_ENABLED === "true";
}
export function productOrigins(): Record<PaxProduct, string> {
  const root = process.env.PAX_ROOT_DOMAIN || "domanname.com";
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(root))
    throw new Error("Invalid PAX_ROOT_DOMAIN");
  return {
    main: `https://${root}`,
    accounts: `https://accounts.${root}`,
    talent: `https://talent.${root}`,
    practice: `https://${root}`,
  };
}
/** Accept the former host only for compatibility redirects and old sign-in returns. */
export function legacyPracticeOrigin() {
  return productOrigins().main.replace('https://', 'https://practitioners.');
}
export function productUrl(product: PaxProduct, path = "/") {
  return productRoutingEnabled() ? `${productOrigins()[product]}${path}` : path;
}
export function safeReturnUrl(
  value: string | null | undefined,
  baseUrl: string,
  fallback = "/hub",
  allowSignIn = false,
): string {
  const fallbackUrl = new URL(
    fallback,
    productRoutingEnabled() ? productOrigins().accounts : baseUrl,
  ).href;
  try {
    const url = new URL(value || fallback, baseUrl);
    if (url.username || url.password) return fallbackUrl;
    if (productRoutingEnabled() && url.origin === legacyPracticeOrigin()) {
      const canonical = new URL(url.pathname === '/' ? '/practice' : url.pathname, productOrigins().practice);
      canonical.search = url.search;
      canonical.hash = url.hash;
      return safeReturnUrl(canonical.href, baseUrl, fallback, allowSignIn);
    }
    const origins = productRoutingEnabled()
      ? Object.values(productOrigins())
      : [new URL(baseUrl).origin];
    if (url.username || url.password || !origins.includes(url.origin))
      return fallbackUrl;
    if (
      ["/register", "/logout"].includes(url.pathname) ||
      (!allowSignIn && url.pathname === "/login") ||
      url.pathname.startsWith("/api/auth/")
    )
      return fallbackUrl;
    return url.href;
  } catch {
    return fallbackUrl;
  }
}
export function sessionCookieName() {
  return productRoutingEnabled() ? "__Secure-pax.session-token" : undefined;
}
/** Reverse proxies may use HTTP internally; compare browser origins against configured HTTPS hosts. */
export function isSameProductOrigin(request: Request) {
  // Next's development server may expose localhost internally when opened through 127.0.0.1.
  // Accept only the exact incoming loopback host/port; production origin checks stay unchanged.
  if (!productRoutingEnabled() && process.env.NODE_ENV === 'development') {
    try {
      const actual = new URL(request.headers.get('origin') || '');
      const internal = new URL(request.url);
      const loopback = ['localhost', '127.0.0.1', '[::1]'];
      if (loopback.includes(actual.hostname) && loopback.includes(internal.hostname) && actual.protocol === internal.protocol && actual.host === request.headers.get('host')) return true;
    } catch { return false; }
  }
  const expected = productRoutingEnabled()
    ? Object.values(productOrigins()).find(
        (origin) => new URL(origin).host === request.headers.get("host"),
      )
    : new URL(request.url).origin;
  return Boolean(expected && request.headers.get("origin") === expected);
}
export function sharedSessionCookie() {
  if (!productRoutingEnabled()) return {};
  const domain = new URL(productOrigins().main).hostname;
  return {
    sessionToken: {
      name: sessionCookieName()!,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: true,
        path: "/",
        domain,
      },
    },
  };
}

/** Absolute links for queued notifications; NEXTAUTH_URL remains environment-injected. */
export const dynamic = "force-dynamic";
export function productNotificationUrl(product: PaxProduct, path: string) {
  return new URL(
    path,
    productRoutingEnabled()
      ? productOrigins()[product]
      : process.env.NEXTAUTH_URL || productOrigins().main,
  ).href;
}
