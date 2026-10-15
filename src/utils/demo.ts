/**
 * Stand-ins for network time in this backend-less prototype, in one place. Kept short: the app
 * should feel instant; these only give a beat for the loader / "Processing" to read.
 */
export const DEMO_MS = {
  /** withLoader default (sign-in, statements, wallet adds…) */
  loader: 350,
  /** the result card's "Processing" beat before it settles */
  processing: 400,
  /** after the 4th PIN digit, so the last dot is seen before approval */
  pinBeat: 60,
  /** Home opening the world you picked at onboarding */
  worldLanding: 200,
} as const;
