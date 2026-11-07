/**
 * Pinned license trust anchors (public keys only). Updated from the production server's
 * GET /api/pocket-license at release time and verified by fingerprint in docs/pocket/1.15.0.md.
 * Rotation: add the new kid here (keep the old one) in a release BEFORE the server switches keys.
 */
export type PinnedKey = { kid: string; spki: string };

declare const __POCKET_LICENSE_TEST_KEYS__: PinnedKey[] | undefined;

// Fetched from https://kasbokarapp.com/api/pocket-license on 2026-11-07 (server sha 518b515); kid = sha256(spki)[0..16].
const PRODUCTION_KEYS: PinnedKey[] = [
  { kid: "k5a4a2fcea4e503b7", spki: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEhLCqfMRmCcubpIowGdhDFzH0BKCL1HcVRW0O4wCeODQ30sIxMB/l/bEyRmC04XcPYZrS7nL5I40i0y9xZEXU6A==" },
];

export const PINNED_LICENSE_KEYS: readonly PinnedKey[] = Object.freeze([
  ...PRODUCTION_KEYS,
  // Test builds only (never the APK build): injected by the browser-test build of the bundle.
  ...(typeof __POCKET_LICENSE_TEST_KEYS__ !== "undefined" && Array.isArray(__POCKET_LICENSE_TEST_KEYS__) ? __POCKET_LICENSE_TEST_KEYS__ : []),
]);
