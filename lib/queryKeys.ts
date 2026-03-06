/**
 * Typed query key factory.
 *
 * Using a factory prevents magic strings, enables prefix-based invalidation,
 * and makes it easy to search for all uses of a key across the codebase.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.resident.vehicles(userId, communityId) })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.resident.all })  // invalidates everything resident
 */

export const queryKeys = {
  // ── Resident ────────────────────────────────────────────────
  resident: {
    all: ["resident"] as const,
    dashboard: (userId: string, communityId: string) =>
      ["resident", "dashboard", userId, communityId] as const,
    profile: (userId: string) => ["resident", "profile", userId] as const,
    visitors: (userId: string, communityId: string, from: string, to: string) =>
      ["resident", "visitors", userId, communityId, from, to] as const,
    vehicles: (userId: string, communityId: string) =>
      ["resident", "vehicles", userId, communityId] as const,
    packages: (userId: string, communityId: string, from: string, to: string) =>
      ["resident", "packages", userId, communityId, from, to] as const,
    maintenance: (userId: string, communityId: string) =>
      ["resident", "maintenance", userId, communityId] as const,
    bookings: (userId: string, communityId: string) =>
      ["resident", "bookings", userId, communityId] as const,
    payments: (userId: string, communityId: string) =>
      ["resident", "payments", userId, communityId] as const,
    announcements: (userId: string, communityId: string) =>
      ["resident", "announcements", userId, communityId] as const,
    noticeBoard: (communityId: string) =>
      ["resident", "noticeBoard", communityId] as const,
    directory: (communityId: string) =>
      ["resident", "directory", communityId] as const,
    documents: (communityId: string) =>
      ["resident", "documents", communityId] as const,
    surveys: (userId: string, communityId: string) =>
      ["resident", "surveys", userId, communityId] as const,
    electionPolls: (communityId: string) =>
      ["resident", "electionPolls", communityId] as const,
    meetings: (communityId: string) =>
      ["resident", "meetings", communityId] as const,
    parking: (communityId: string) =>
      ["resident", "parking", communityId] as const,
    parkingAll: (communityId: string, userId: string) =>
      ["resident", "parkingAll", communityId, userId] as const,
    overstay: (communityId: string) =>
      ["resident", "overstay", communityId] as const,
    facilities: (communityId: string) =>
      ["resident", "facilities", communityId] as const,
    facilityBookings: (facilityId: string, date: string, userId: string) =>
      ["resident", "facilityBookings", facilityId, date, userId] as const,
    homePlanner: (userId: string, communityId: string) =>
      ["resident", "homePlanner", userId, communityId] as const,
  },

  // ── Admin ────────────────────────────────────────────────────
  admin: {
    all: ["admin"] as const,
    dashboard: (communityId: string) =>
      ["admin", "dashboard", communityId] as const,
    visitorLog: (communityId: string) =>
      ["admin", "visitorLog", communityId] as const,
    visitorLogByDate: (communityId: string, from: string, to: string) =>
      ["admin", "visitorLog", communityId, from, to] as const,
    maintenance: (communityId: string) =>
      ["admin", "maintenance", communityId] as const,
    bookings: (communityId: string) =>
      ["admin", "bookings", communityId] as const,
    residents: (communityId: string) =>
      ["admin", "residents", communityId] as const,
    vehicles: (communityId: string) =>
      ["admin", "vehicles", communityId] as const,
    announcements: (communityId: string) =>
      ["admin", "announcements", communityId] as const,
    noticeBoard: (communityId: string) =>
      ["admin", "noticeBoard", communityId] as const,
    parking: (communityId: string) =>
      ["admin", "parking", communityId] as const,
    surveys: (communityId: string) =>
      ["admin", "surveys", communityId] as const,
    electionPolls: (communityId: string) =>
      ["admin", "electionPolls", communityId] as const,
    meetings: (communityId: string) =>
      ["admin", "meetings", communityId] as const,
    staff: (communityId: string) => ["admin", "staff", communityId] as const,
    blocksAndUnits: (communityId: string) =>
      ["admin", "blocksAndUnits", communityId] as const,
    communityConfig: (communityId: string) =>
      ["admin", "communityConfig", communityId] as const,
    overstay: (communityId: string) =>
      ["admin", "overstay", communityId] as const,
    overstaySettings: (communityId: string) =>
      ["admin", "overstaySettings", communityId] as const,
    pollResults: (pollId: string) => ["admin", "pollResults", pollId] as const,
    surveyResults: (surveyId: string) =>
      ["admin", "surveyResults", surveyId] as const,
  },

  // ── Gatekeeper ───────────────────────────────────────────────
  gatekeeper: {
    all: ["gatekeeper"] as const,
    visitors: () => ["gatekeeper", "visitors"] as const,
    kidPasses: () => ["gatekeeper", "kidPasses"] as const,
    packages: (communityId: string) =>
      ["gatekeeper", "packages", communityId] as const,
    residents: (communityId: string) =>
      ["gatekeeper", "residents", communityId] as const,
    directory: (communityId: string) =>
      ["gatekeeper", "directory", communityId] as const,
    profile: (userId: string) => ["gatekeeper", "profile", userId] as const,
    stats: (userId: string) => ["gatekeeper", "stats", userId] as const,
  },
} as const;
