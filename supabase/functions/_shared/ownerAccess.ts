/** Dependency-injected authorization keeps the policy testable without a runtime. */
export async function ownerAccessStatus(
  authorization: string | null,
  validateOwner: (token: string) => Promise<boolean>,
  internalTokens: Array<string | undefined> = [],
): Promise<number> {
  const token = /^Bearer ([^\s,]+)$/.exec(authorization ?? "")?.[1];
  if (!token) return 401;
  if (internalTokens.some((secret) => secret && token === secret)) return 200;
  try {
    return await validateOwner(token) ? 200 : 403;
  } catch {
    return 401;
  }
}