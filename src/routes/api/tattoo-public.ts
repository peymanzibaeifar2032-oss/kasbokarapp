import { createFileRoute } from "@tanstack/react-router";
import { z, ZodError } from "zod";
import { getSql } from "@/lib/db";
import { isIranMobile, normalizeInstagramHandle, normalizeIranPhone } from "@/lib/format";
import { isOccupancyConflict } from "@/lib/server/admin-bootstrap";
import { allowRate, clientKey } from "@/lib/server/rate-limit";
import { TATTOO_SLOT_OVERLAP_SQL } from "@/lib/server/tattoo-holds";
import { makeTattooTrackingCode, normalizeTattooTrackingCode } from "@/lib/tattoo-flow";

const imageDataSchema = z.string().max(1_000_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت تصویر معتبر نیست.",
);

const receiptImageSchema = z.string().max(1_400_000).refine(
  (value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value),
  "فرمت رسید معتبر نیست.",
);
