// lib/overstayLimits.ts
// Shared utility used by admin-overstay.tsx, overstay.tsx, visitors.tsx
// Admin saves limits to backend; all screens fetch from backend on load.

import { getCommunityId, getToken } from "@/lib/auth";
import { config } from "@/lib/config";
import axios from "axios";

// ── Default limits (minutes) — used as fallback if backend has none ──
export const DEFAULT_OVERSTAY_LIMITS: Record<string, number> = {
  DELIVERY: 10,
  GUEST:    240,
  STAFF:    600,
  CAB_AUTO: 15,
  OTHER:    120,
};

export type OvstayLimits = typeof DEFAULT_OVERSTAY_LIMITS;

// ── Fetch limits from backend ──────────────────────────────────
// GET /admin/community → res.data.data.overstayLimits (object)
// Falls back to DEFAULT_OVERSTAY_LIMITS if not set
export async function fetchOvstayLimits(): Promise<OvstayLimits> {
  try {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    const res = await axios.get(`${config.backendUrl}/admin/community`, {
      headers: { Authorization: `Bearer ${token}` },
      params:  { communityId },
    });
    const limits = res.data?.data?.overstayLimits;
    if (limits && typeof limits === "object") {
      // Merge with defaults so new types are never undefined
      return { ...DEFAULT_OVERSTAY_LIMITS, ...limits };
    }
  } catch { /* fallback below */ }
  return { ...DEFAULT_OVERSTAY_LIMITS };
}

// ── Save limits to backend ─────────────────────────────────────
// POST /admin/community with { communityId, overstayLimits }
export async function saveOvstayLimits(limits: OvstayLimits): Promise<boolean> {
  try {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    const res = await axios.post(
      `${config.backendUrl}/admin/community`,
      { communityId, overstayLimits: limits },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data?.success === true;
  } catch { return false; }
}

// ── Helpers ────────────────────────────────────────────────────
export function getLimit(limits: OvstayLimits, type?: string): number {
  return limits[type?.toUpperCase() ?? ""] ?? limits.OTHER ?? DEFAULT_OVERSTAY_LIMITS.OTHER;
}

export function isOverstay(visitor: any, limits: OvstayLimits): boolean {
  const checkedIn  = visitor.checkInAt  || visitor.status?.toLowerCase() === "checked_in";
  const checkedOut = visitor.checkOutAt || visitor.status?.toLowerCase() === "checked_out";
  if (!checkedIn || checkedOut) return false;
  const mins  = Math.floor((Date.now() - new Date(visitor.checkInAt || visitor.expectedAt).getTime()) / 60000);
  const limit = getLimit(limits, visitor.visitorType);
  return mins > limit;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hr${h !== 1 ? "s" : ""}`;
}