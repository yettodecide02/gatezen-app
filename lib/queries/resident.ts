/**
 * Pure async fetch functions for resident endpoints.
 *
 * These functions accept a token + param object and return typed data.
 * They contain no React hooks or useState — they are called exclusively
 * as `queryFn` inside `useQuery` / `useMutation` hooks in screen components.
 *
 * Every function throws on HTTP error so React Query can handle retries
 * and error state automatically.
 */
import axios from "axios";
import { config } from "@/lib/config";

const BASE = config.backendUrl;

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Dashboard ──────────────────────────────────────────────────
export async function fetchResidentDashboard(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/dashboard`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Profile ────────────────────────────────────────────────────
export async function fetchResidentProfile(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/profile`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data;
}

export async function updateResidentProfile(
  token: string | null,
  payload: { name: string; phone?: string | null },
) {
  const res = await axios.patch(`${BASE}/resident/profile`, payload, {
    headers: authHeaders(token),
  });
  return res.data?.data ?? res.data;
}

// ── Visitors ───────────────────────────────────────────────────
export async function fetchResidentVisitors(
  token: string | null,
  userId: string,
  communityId: string,
  from: string,
  to: string,
) {
  const res = await axios.get(`${BASE}/resident/visitors`, {
    params: { userId, communityId, from, to },
    headers: authHeaders(token),
  });
  const raw = res.data?.visitors ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function createResidentVisitor(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/visitors`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Vehicles ───────────────────────────────────────────────────
export async function fetchResidentVehicles(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/vehicles`, {
    params: { communityId, userId },
    headers: authHeaders(token),
  });
  const raw = res.data?.vehicles ?? res.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export async function createResidentVehicle(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/vehicles`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteResidentVehicle(
  token: string | null,
  vehicleId: string,
) {
  const res = await axios.delete(`${BASE}/resident/vehicles/${vehicleId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Packages ───────────────────────────────────────────────────
export async function fetchResidentPackages(
  token: string | null,
  userId: string,
  communityId: string,
  from: string,
  to: string,
) {
  const res = await axios.get(`${BASE}/resident/packages`, {
    params: {
      userId,
      communityId,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    },
    headers: authHeaders(token),
  });
  const raw = res.data?.packages ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Maintenance ────────────────────────────────────────────────
export async function fetchResidentMaintenance(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/maintenance`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.tickets ?? res.data?.maintenance ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function createResidentMaintenanceTicket(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/maintenance`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Bookings ───────────────────────────────────────────────────
export async function fetchResidentBookings(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/bookings`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.bookings ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function createResidentBooking(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/bookings`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Payments ───────────────────────────────────────────────────
export async function fetchResidentPayments(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/payments`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.payments ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Announcements ──────────────────────────────────────────────
export async function fetchResidentAnnouncements(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/announcements`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.announcements ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Notice Board ───────────────────────────────────────────────
export async function fetchResidentNoticeBoard(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/notice-board`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.notices ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Directory ──────────────────────────────────────────────────
export async function fetchResidentDirectory(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/directory`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.residents ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Documents ──────────────────────────────────────────────────
export async function fetchResidentDocuments(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/pdfs`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.pdfs ?? res.data?.documents ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Surveys ────────────────────────────────────────────────────
export async function fetchResidentSurveys(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/surveys`, {
    params: { userId, communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.surveys ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Election Polls ─────────────────────────────────────────────
export async function fetchResidentElectionPolls(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/polls`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.data ?? res.data?.polls ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Meetings ───────────────────────────────────────────────────
export async function fetchResidentMeetings(
  token: string | null,
  communityId: string,
  userId?: string,
) {
  const res = await axios.get(`${BASE}/resident/meetings`, {
    params: { communityId, ...(userId ? { userId } : {}) },
    headers: authHeaders(token),
  });
  const raw = res.data?.meetings ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Parking ────────────────────────────────────────────────────
export async function fetchResidentParking(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/parking`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.spots ?? res.data?.parkingSpots ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Overstay ───────────────────────────────────────────────────
export async function fetchResidentOverstay(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/overstay`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const raw = res.data?.visitors ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

// ── Maintenance comment ────────────────────────────────────────
export async function addResidentMaintenanceComment(
  token: string | null,
  ticketId: string,
  payload: object,
) {
  const res = await axios.post(
    `${BASE}/resident/maintenance/${ticketId}/comments`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Notice board mutations ─────────────────────────────────────
export async function createResidentNotice(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/notice-board`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function deleteResidentNotice(
  token: string | null,
  noticeId: string,
) {
  const res = await axios.delete(`${BASE}/resident/notice-board/${noticeId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Survey mutations ───────────────────────────────────────────
export async function createResidentSurvey(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/surveys`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function respondToResidentSurvey(
  token: string | null,
  surveyId: string,
  payload: object,
) {
  const res = await axios.post(
    `${BASE}/resident/surveys/${surveyId}/respond`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function deleteResidentSurvey(
  token: string | null,
  surveyId: string,
) {
  const res = await axios.delete(`${BASE}/resident/surveys/${surveyId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Election poll mutations ────────────────────────────────────
export async function createResidentElectionPoll(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/polls`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function voteOnResidentElectionPoll(
  token: string | null,
  pollId: string,
  payload: object,
) {
  const res = await axios.post(
    `${BASE}/resident/polls/${pollId}/vote`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function deleteResidentElectionPoll(
  token: string | null,
  pollId: string,
) {
  const res = await axios.delete(`${BASE}/resident/polls/${pollId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}

// ── Meeting RSVP ───────────────────────────────────────────────
export async function rsvpResidentMeeting(
  token: string | null,
  meetingId: string,
  payload: object,
) {
  const res = await axios.post(
    `${BASE}/resident/meetings/${meetingId}/rsvp`,
    payload,
    {
      headers: authHeaders(token),
    },
  );
  return res.data;
}

// ── Parking ────────────────────────────────────────────────────
export async function fetchResidentParkingAll(
  token: string | null,
  communityId: string,
  userId: string,
) {
  const headers = authHeaders(token);
  try {
    const [spotsRes, bookingsRes] = await Promise.all([
      axios.get(`${BASE}/resident/parking/spots`, {
        params: { communityId },
        headers,
      }),
      axios.get(`${BASE}/resident/parking/bookings`, {
        params: { communityId, userId },
        headers,
      }),
    ]);
    const spots = spotsRes.data?.spots ?? spotsRes.data ?? [];
    const bookings = bookingsRes.data?.bookings ?? bookingsRes.data ?? [];
    return {
      spots: Array.isArray(spots) ? spots : [],
      bookings: Array.isArray(bookings) ? bookings : [],
    };
  } catch {
    return { spots: [], bookings: [] };
  }
}

export async function bookResidentParkingSpot(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/parking/bookings`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function cancelResidentParkingBooking(
  token: string | null,
  bookingId: string,
) {
  const res = await axios.patch(
    `${BASE}/resident/parking/bookings/${bookingId}/cancel`,
    {},
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Facilities + bookings (amenities) ─────────────────────────
export async function fetchResidentFacilities(
  token: string | null,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/facilities`, {
    params: { communityId },
    headers: authHeaders(token),
  });
  const f = Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : [];
  return f.map((a: any) => ({
    ...a,
    facilityType: a.facilityType?.replace(/_/g, " ") ?? a.facilityType,
  }));
}

export async function fetchResidentFacilityBookings(
  token: string | null,
  facilityId: string,
  date: string,
  userId: string | undefined,
) {
  const headers = authHeaders(token);
  const [bRes, uRes] = await Promise.all([
    axios.get(`${BASE}/resident/bookings`, {
      params: { facilityId, date },
      headers,
    }),
    userId
      ? axios.get(`${BASE}/resident/user-bookings`, {
          params: { userId, date },
          headers,
        })
      : Promise.resolve({ data: [] }),
  ]);
  const list = Array.isArray(bRes.data) ? bRes.data : [];
  return {
    bookings: list.sort(
      (a: any, b: any) => +new Date(a.startsAt) - +new Date(b.startsAt),
    ),
    userBookings: Array.isArray(uRes.data) ? uRes.data : [],
  };
}

export async function createResidentFacilityBooking(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/bookings`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function cancelResidentFacilityBooking(
  token: string | null,
  bookingId: string,
) {
  const res = await axios.patch(
    `${BASE}/resident/bookings/${bookingId}/cancel`,
    {},
    { headers: authHeaders(token) },
  );
  return res.data;
}

// ── Home Planner ───────────────────────────────────────────────
export async function fetchResidentHomePlanner(
  token: string | null,
  userId: string,
  communityId: string,
) {
  const res = await axios.get(`${BASE}/resident/home-planner`, {
    params: { communityId, userId },
    headers: authHeaders(token),
  });
  const raw = res.data?.tasks ?? res.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export async function createResidentHomePlannerTask(
  token: string | null,
  payload: object,
) {
  const res = await axios.post(`${BASE}/resident/home-planner`, payload, {
    headers: authHeaders(token),
  });
  return res.data;
}

export async function updateResidentHomePlannerTask(
  token: string | null,
  taskId: string,
  payload: object,
) {
  const res = await axios.patch(
    `${BASE}/resident/home-planner/${taskId}`,
    payload,
    { headers: authHeaders(token) },
  );
  return res.data;
}

export async function deleteResidentHomePlannerTask(
  token: string | null,
  taskId: string,
) {
  const res = await axios.delete(`${BASE}/resident/home-planner/${taskId}`, {
    headers: authHeaders(token),
  });
  return res.data;
}
