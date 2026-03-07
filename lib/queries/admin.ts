/**
 * Pure async fetch functions for admin endpoints.
 */
import axios from "axios";
import { config } from "@/lib/config";

const BASE = config.backendUrl;

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Dashboard ──────────────────────────────────────────────────
export async function fetchAdminDashboard(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/dashboard`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  return res.data;
}

export async function createAdminAnnouncement(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/admin/create-announcement`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Visitor Log ────────────────────────────────────────────────
export async function fetchAdminVisitorLog(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/visitors`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.visitors ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Maintenance ────────────────────────────────────────────────
export async function fetchAdminMaintenance(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/maintenance`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.maintenance ?? res.data?.tickets ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function updateAdminMaintenanceTicket(
  token: string | null,
  ticketId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/maintenance/${ticketId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Bookings ───────────────────────────────────────────────────
export async function fetchAdminBookings(
  token: string | null,
  communityId: string,
) {
  try {
    const res = await axios.get(`${BASE}/admin/parking/spots`, {
      params: { communityId },
      headers: authHeaders(token),
    });
    const raw = res.data?.spots ?? res.data;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function updateAdminBooking(
  token: string | null,
  bookingId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/bookings/${bookingId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Residents ──────────────────────────────────────────────────
export async function fetchAdminResidents(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/residents`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.residents ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function updateAdminResident(
  token: string | null,
  residentId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/residents/${residentId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Vehicles ───────────────────────────────────────────────────
export async function fetchAdminVehicles(
  token: string | null,
  communityId: string,
  status?: string,
) {
  const res = await axios.get(`${BASE}/admin/vehicles`, {
    params: { communityId, ...(status ? { status } : {}) },
    headers: authHeaders(token),
  });
  const raw = res.data?.vehicles ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function updateAdminVehicle(
  token: string | null,
  vehicleId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/vehicles/${vehicleId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Announcements ──────────────────────────────────────────────
export async function fetchAdminAnnouncements(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/announcements`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.announcements ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function deleteAdminAnnouncement(
  token: string | null,
  announcementId: string,
) {
  const res = await axios.delete(
    `${BASE}/admin/announcements/${announcementId}`,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Notice Board ───────────────────────────────────────────────
export async function fetchAdminNoticeBoard(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/notice-board`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.notices ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function createAdminNotice(token: string | null, payload: object) {
  const res = await axios.post(`${BASE}/admin/notice-board`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminNotice(
  token: string | null,
  noticeId: string,
) {
  const res = await axios.delete(`${BASE}/admin/notice-board/${noticeId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Parking ────────────────────────────────────────────────────
export async function fetchAdminParking(
  token: string | null,
  communityId: string,
) {
  try {
    const res = await axios.get(`${BASE}/admin/parking/spots`, {
      params: { communityId },
      headers: authHeaders(token),
    });
    const raw = res.data?.spots ?? res.data;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// ── Surveys ────────────────────────────────────────────────────
export async function fetchAdminSurveys(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/surveys`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.surveys ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function fetchAdminSurveyResults(
  token: string | null,
  surveyId: string,
) {
  const res = await axios.get(`${BASE}/admin/surveys/${surveyId}`, {
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data;
}

// ── Election Polls ─────────────────────────────────────────────
export async function fetchAdminElectionPolls(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/polls`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.polls ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function fetchAdminPollResults(
  token: string | null,
  pollId: string,
) {
  const res = await axios.get(`${BASE}/admin/polls/${pollId}`, {
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data;
}

// ── Meetings ───────────────────────────────────────────────────
export async function fetchAdminMeetings(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/meetings`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.meetings ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Staff Management ───────────────────────────────────────────
export async function fetchAdminStaff(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/gatekeepers`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Blocks & Units ─────────────────────────────────────────────
export async function fetchAdminBlocksAndUnits(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/blocks`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Community Config ───────────────────────────────────────────
export async function fetchAdminCommunityConfig(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/community`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data?.community ?? res.data;
}

// ── Overstay ───────────────────────────────────────────────────
export async function fetchAdminOverstay(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/overstay`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.visitors ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function fetchAdminOverstaySettings(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/admin/overstay-settings`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  return res.data?.settings ?? res.data;
}

export async function updateAdminOverstaySettings(
  token: string | null,
  communityId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/overstay-settings`,
    { communityId, ...payload },
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Admin Resident Actions ─────────────────────────────────────
export async function adminResidentAction(
  token: string | null,
  userId: string,
  action: string,
  communityId: string,
) {
  const res = await axios.post(
    `${BASE}/admin/residents/${userId}/action`,
    { action, communityId },
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Admin Meetings CRUD ────────────────────────────────────────
export async function createAdminMeeting(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/admin/meetings`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function updateAdminMeeting(
  token: string | null,
  meetingId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/admin/meetings/${meetingId}`,
    payload,
    {
      headers: authHeaders(token),
    },
  );
  return res.data;
}

export async function deleteAdminMeeting(
  token: string | null,
  meetingId: string,
) {
  const res = await axios.delete(`${BASE}/admin/meetings/${meetingId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Maintenance - comment + status
export async function addAdminMaintenanceComment(
  token: string | null,
  ticketId: string,
  payload: object,
) {
  const res = await axios.post(
    `${BASE}/admin/maintenance/${ticketId}/comments`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function updateAdminMaintenanceStatus(
  token: string | null,
  ticketId: string,
  status: string,
) {
  const res = await axios.post(
    `${BASE}/admin/maintenance/update`,
    { ticketId, status },
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Parking spot CRUD
export async function createAdminParkingSpot(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/admin/parking/spots`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function toggleAdminParkingSpot(
  token: string | null,
  spotId: string,
  isAvailable: boolean,
) {
  const res = await axios.patch(
    `${BASE}/admin/parking/spots/${spotId}`,
    { isAvailable },
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function deleteAdminParkingSpot(
  token: string | null,
  spotId: string,
) {
  const res = await axios.delete(`${BASE}/admin/parking/spots/${spotId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Survey CRUD
export async function createAdminSurvey(token: string | null, payload: object) {
  const res = await axios.post(`${BASE}/admin/surveys`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminSurvey(
  token: string | null,
  surveyId: string,
) {
  const res = await axios.delete(`${BASE}/admin/surveys/${surveyId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Election Poll CRUD
export async function createAdminElectionPoll(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/admin/polls`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminElectionPoll(
  token: string | null,
  pollId: string,
) {
  const res = await axios.delete(`${BASE}/admin/polls/${pollId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Staff Management
export async function createAdminStaff(token: string | null, payload: object) {
  const res = await axios.post(`${BASE}/admin/gatekeeper-signup`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminStaff(token: string | null, staffId: string) {
  const res = await axios.delete(`${BASE}/admin/gatekeepers/${staffId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Blocks
export async function createAdminBlock(token: string | null, payload: object) {
  const res = await axios.post(`${BASE}/admin/blocks`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function updateAdminBlock(
  token: string | null,
  blockId: string,
  payload: object,
) {
  const res = await axios.put(`${BASE}/admin/blocks/${blockId}`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminBlock(token: string | null, blockId: string) {
  const res = await axios.delete(`${BASE}/admin/blocks/${blockId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Units
export async function createAdminUnit(token: string | null, payload: object) {
  const res = await axios.post(`${BASE}/admin/units`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteAdminUnit(token: string | null, unitId: string) {
  const res = await axios.delete(`${BASE}/admin/units/${unitId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Community Config update
export async function updateAdminCommunityConfig(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/admin/community`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Dismiss Overstay Alert
export async function dismissAdminOverstay(
  token: string | null,
  visitorId: string,
) {
  const res = await axios.post(
    `${BASE}/admin/overstay/${visitorId}/dismiss`,
    {},
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Visitor Log with date filter
export async function fetchAdminVisitorLogByDate(
  token: string | null,
  communityId: string,
  from: string,
  to: string,
) {
  const res = await axios.get(`${BASE}/admin/visitor`, {
    params: { communityId, from, to },
    headers: authHeaders(token),
  });
  const raw = res.data?.visitors ?? res.data;
  return Array.isArray(raw) ? raw : [];
}
