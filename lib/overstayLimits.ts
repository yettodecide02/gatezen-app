// @ts-nocheck
// lib/overstayLimits.ts
// Shared utility: fetch + save overstay limits.
//
// ROOT CAUSE FIX:
//   The backend POST /admin/community requires the FULL community object
//   (name, description, address, facilities, etc.) just like communityConfig.tsx does.
//   Sending only { communityId, overstayLimits } causes a validation error → "Failed to save".
//
// SAVE STRATEGY:
//   1. GET /admin/community to fetch existing community data
//   2. Merge overstayLimits into it
//   3. POST the merged payload (same shape communityConfig uses)
//
// FETCH STRATEGY:
//   GET /admin/community → res.data.data.overstayLimits
//   Falls back to DEFAULT_OVERSTAY_LIMITS silently if not set yet

import { getCommunityId, getToken } from "@/lib/auth";
import { config } from "@/lib/config";
import axios from "axios";

// ── Default limits (minutes) ───────────────────────────────────
export const DEFAULT_OVERSTAY_LIMITS = {
  DELIVERY: 10,
  GUEST:    240,
  STAFF:    600,
  CAB_AUTO: 15,
  OTHER:    120,
};

export type OvstayLimits = typeof DEFAULT_OVERSTAY_LIMITS;

// ── In-memory session cache ───────────────────────────────────
// Updated immediately on save so screens always use latest values
// even if backend hasn't propagated yet.
let _memCache: OvstayLimits | null = null;

export function clearOvstayCache() {
  _memCache = null;
}

// ── Fetch limits ──────────────────────────────────────────────
export async function fetchOvstayLimits(): Promise<OvstayLimits> {
  if (_memCache) return { ..._memCache };

  try {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    const res = await axios.get(`${config.backendUrl}/admin/community`, {
      headers: { Authorization: `Bearer ${token}` },
      params:  { communityId },
    });

    // Handle both response shapes
    const data   = res.data?.data || res.data || {};
    const limits = data.overstayLimits ?? null;

    if (limits && typeof limits === "object" && Object.keys(limits).length > 0) {
      const merged = { ...DEFAULT_OVERSTAY_LIMITS, ...limits };
      _memCache = merged;
      return { ...merged };
    }
  } catch { /* silent fallback */ }

  return { ...DEFAULT_OVERSTAY_LIMITS };
}

// ── Save limits ───────────────────────────────────────────────
// Mirrors communityConfig.tsx handleSave exactly:
//   1. Fetch current community data (GET /admin/community)
//   2. Rebuild the facilities array from the response
//   3. POST { ...communityFields, facilities, overstayLimits, communityId }
export async function saveOvstayLimits(limits: OvstayLimits): Promise<{ ok: boolean; error?: string }> {
  try {
    const [token, communityId] = await Promise.all([getToken(), getCommunityId()]);
    const headers = { Authorization: `Bearer ${token}` };

    // ── Step 1: fetch existing community data ──────────────────
    let communityName        = "";
    let communityDescription = "";
    let communityAddress     = "";
    let facilitiesArray: any[] = [];

    try {
      const getRes = await axios.get(`${config.backendUrl}/admin/community`, {
        headers,
        params: { communityId },
      });

      if (getRes.data?.success && getRes.data?.data) {
        const c = getRes.data.data;
        communityName        = c.name        || "";
        communityDescription = c.description || "";
        communityAddress     = c.address     || "";

        // Re-shape facilities the same way communityConfig does
        if (Array.isArray(c.facilities) && c.facilities.length > 0) {
          facilitiesArray = c.facilities.map((f: any) => ({
            facilityType:   f.facilityType,
            enabled:        f.enabled,
            quantity:       f.quantity,
            maxCapacity:    f.maxCapacity,
            isPaid:         f.isPaid,
            price:          f.price         || 0,
            priceType:      f.priceType     || "per_hour",
            operatingHours: f.operatingHours|| "09:00-21:00",
            rules:          f.rules         || "",
          }));
        }
      }
    } catch (fetchErr) {
      // If GET fails we still try to save with minimal payload
      console.warn("overstayLimits: could not fetch existing community data", fetchErr?.message);
    }

    // ── Step 2: POST merged payload ───────────────────────────
    const payload = {
      name:          communityName,
      description:   communityDescription,
      address:       communityAddress,
      facilities:    facilitiesArray,
      overstayLimits: limits,
      communityId,
    };

    const res = await axios.post(
      `${config.backendUrl}/admin/community`,
      payload,
      { headers }
    );

    if (res.data?.success) {
      // Update session cache immediately
      _memCache = { ...limits };
      return { ok: true };
    }

    return {
      ok:    false,
      error: res.data?.message || "Server returned an unexpected response.",
    };

  } catch (e) {
    return {
      ok:    false,
      error: e?.response?.data?.message || e?.message || "Network error. Please try again.",
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────
export function getLimit(limits: OvstayLimits, type?: string): number {
  const key = type?.toUpperCase() ?? "";
  return limits[key] ?? limits.OTHER ?? DEFAULT_OVERSTAY_LIMITS.OTHER;
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