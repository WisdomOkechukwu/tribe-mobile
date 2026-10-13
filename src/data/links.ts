/**
 * Public web pages the app opens in its in-app browser.
 * TODO(content): point at the real legal page once it's live on the landing site (its footer's
 * Terms / Privacy links are still "#"); `EXPO_PUBLIC_LEGAL_URL` overrides this per build.
 */
export const LEGAL_URL = process.env.EXPO_PUBLIC_LEGAL_URL ?? "https://tribe.africa/legal";
