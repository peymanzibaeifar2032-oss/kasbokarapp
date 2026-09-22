import { ADMIN_CHUNKS } from "./admin.ts";
import { AUTH_CHUNKS } from "./auth.ts";
import { BOOKING_CHUNKS } from "./booking.ts";
import { BUSINESS_CHUNKS } from "./business.ts";
import { ERROR_CHUNKS } from "./errors.ts";
import { INSTALL_CHUNKS } from "./install.ts";
import { INTRO_CHUNKS } from "./intro.ts";
import { ROLE_CHUNKS } from "./roles.ts";
import { SEARCH_CHUNKS } from "./search.ts";
import { TRIAL_CHUNKS } from "./trial.ts";
import { TATTOO_CHUNKS } from "./tattoo.ts";
import type { GuideChunk } from "./types.ts";

export type { GuideAudience, GuideChunk } from "./types.ts";

export const GUIDE_CHUNKS: GuideChunk[] = [
  ...INTRO_CHUNKS,
  ...ROLE_CHUNKS,
  ...AUTH_CHUNKS,
  ...TATTOO_CHUNKS,
  ...SEARCH_CHUNKS,
  ...BOOKING_CHUNKS,
  ...BUSINESS_CHUNKS,
  ...TRIAL_CHUNKS,
  ...ADMIN_CHUNKS,
  ...INSTALL_CHUNKS,
  ...ERROR_CHUNKS,
];
