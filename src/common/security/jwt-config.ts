export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 16) {
        throw new Error('JWT_SECRET is missing or shorter than 16 characters. Set it in .env (openssl rand -hex 32).');
    }
    return secret;
}

export const accessTokenTtlSeconds = (): number => Number(process.env.JWT_ACCESS_TTL_SECONDS) || 15 * 60;
export const refreshTokenTtlDays = (): number => Number(process.env.JWT_REFRESH_TTL_DAYS) || 7;
