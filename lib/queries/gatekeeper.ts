/**
 * Pure async fetch functions for gatekeeper endpoints.
 */
import axios from "axios";
import { config } from "@/lib/config";

const BASE = config.backendUrl;

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Visitors + Kid Passes ──────────────────────────────────────
export async function fetchGatekeeperVisitors(token: string | null) {
  const res = await axios.get(`${BASE}/gatekeeper`, {
    headers: authHeaders(token),
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateGatekeeperVisitor(
  token: string | null,
  id: string,
  status: string,
) {
  const res = await axios.post(
    `${BASE}/gatekeeper`,
    { id, status },
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function fetchGatekeeperKidPasses(token: string | null) {
  const res = await axios.get(`${BASE}/gatekeeper/kid-passes`, {
    headers: authHeaders(token),
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateGatekeeperKidPass(
  token: string | null,
  id: string,
  status: string,
) {
  const res = await axios.post(
    `${BASE}/gatekeeper/kid-passes/${id}`,
    { status },
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Packages ───────────────────────────────────────────────────
export async function fetchGatekeeperPackages(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/gatekeeper/packages`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.packages ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function updateGatekeeperPackage(
  token: string | null,
  packageId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/gatekeeper/packages/${packageId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Profile ────────────────────────────────────────────────────
export async function fetchGatekeeperProfile(
  token: string | null,
  userId: string,
) {
  const res = await axios.get(`${BASE}/gatekeeper/profile`, {
    params: { userId },
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data;
}

// ── Directory (Intercom) ──────────────────────────────────────
export async function fetchGatekeeperDirectory(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/gatekeeper/directory`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.residents ?? res.data?.data ?? res.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

// ── Residents list (for Packages) ────────────────────────────
export async function fetchGatekeeperResidents(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/gatekeeper/residents`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  return Array.isArray(res.data) ? res.data : [];
}

// ── Stats ─────────────────────────────────────────────────────
export async function fetchGatekeeperStats(
  token: string | null,
  userId: string,
) {
  const res = await axios.get(`${BASE}/gatekeeper/stats`, {
    params: { userId },
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Create Package ────────────────────────────────────────────
export async function createGatekeeperPackage(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/gatekeeper/packages`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}
