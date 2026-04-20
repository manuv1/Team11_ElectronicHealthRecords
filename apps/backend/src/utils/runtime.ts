export const getEnv = (key: string, fallback: string): string => process.env[key] ?? fallback;
