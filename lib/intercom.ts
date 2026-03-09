// @ts-nocheck
import axios from "axios";
import supabase from "@/lib/supabase";
import { config } from "@/lib/config";

export type CallType = "R2R" | "R2G" | "G2R";

export type CallEventType =
  | "call:incoming"
  | "call:accepted"
  | "call:rejected"
  | "call:ended"
  | "call:sdp_offer"
  | "call:sdp_answer";

/**
 * Payload for WebRTC SDP exchange events (call:sdp_offer / call:sdp_answer).
 * The sdp field contains the complete SDP including all ICE candidates so
 * no separate trickle-ICE signalling is needed.
 */
export interface WebRTCPayload {
  callId: string;
  sdp: { type: string; sdp: string };
}

export interface CallPayload {
  callId: string;
  callType: CallType;
  callerId: string;
  callerName: string;
  callerUnit?: string;
  callerBlock?: string;
  receiverId: string;
  receiverName?: string;
}

export function generateCallId(): string {
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Subscribe only to new incoming calls addressed to a user.
 * Uses a dedicated channel (no callId) so the listener can be established
 * before any call exists — used by the global layout-level listener.
 * Returns a cleanup function that unsubscribes.
 */
export function subscribeToIncomingCalls(
  userId: string,
  onIncoming: (payload: CallPayload) => void,
): () => void {
  const ch = supabase
    .channel(`intercom:incoming:${userId}`)
    .on("broadcast", { event: "call:incoming" }, ({ payload }) => {
      onIncoming(payload as CallPayload);
    })
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/**
 * Subscribe to call events addressed to a user.
 * Each call uses an isolated channel keyed on callId so stale events
 * from a previous call on the same userId never bleed into the new one.
 * Returns a cleanup function that unsubscribes.
 */
export function subscribeToUserChannel(
  userId: string,
  callId: string,
  onEvent: (type: CallEventType, payload: CallPayload) => void,
): () => void {
  const ch = supabase
    .channel(`intercom:${userId}:${callId}`)
    .on("broadcast", { event: "*" }, ({ event, payload }) => {
      onEvent(event as CallEventType, payload as CallPayload);
    })
    .subscribe();

  return () => supabase.removeChannel(ch);
}

/**
 * Send a call event to another user's channel.
 * The channel is keyed on callId so each call has an isolated signalling lane.
 */
async function sendToUser(
  userId: string,
  callId: string,
  type: CallEventType,
  payload: CallPayload | WebRTCPayload,
): Promise<void> {
  const ch = supabase.channel(`intercom:${userId}:${callId}`);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), 8000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  });

  await ch.send({ type: "broadcast", event: type, payload });
  // Brief wait to ensure the message is flushed before unsubscribing
  await new Promise((r) => setTimeout(r, 300));
  supabase.removeChannel(ch);
}

/** Send call:incoming to the receiver's dedicated incoming-call channel. */
export const initiateCall = (p: CallPayload) => {
  const ch = supabase.channel(`intercom:incoming:${p.receiverId}`);
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), 8000);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  }).then(async () => {
    await ch.send({ type: "broadcast", event: "call:incoming", payload: p });
    await new Promise((r) => setTimeout(r, 300));
    supabase.removeChannel(ch);
  });
};

/** Send call:accepted to the caller. */
export const acceptCall = (p: CallPayload) =>
  sendToUser(p.callerId, p.callId, "call:accepted", p);

/** Send call:rejected to the caller. */
export const rejectCall = (p: CallPayload) =>
  sendToUser(p.callerId, p.callId, "call:rejected", p);

/** Send call:ended to the other party. */
export const endCall = (otherUserId: string, p: CallPayload) =>
  sendToUser(otherUserId, p.callId, "call:ended", p);

/** Send SDP offer (all ICE candidates included) from caller to receiver. */
export const sendSdpOffer = (targetUserId: string, p: WebRTCPayload) =>
  sendToUser(targetUserId, p.callId, "call:sdp_offer", p);

/** Send SDP answer (all ICE candidates included) from receiver to caller. */
export const sendSdpAnswer = (targetUserId: string, p: WebRTCPayload) =>
  sendToUser(targetUserId, p.callId, "call:sdp_answer", p);

/**
 * Send a push notification to the call receiver so they get an alert
 * even when their app is running in the background or closed.
 * This is best-effort — failures are silently ignored since the
 * Supabase Realtime broadcast is the primary call-delivery mechanism.
 */
export async function notifyCallReceiver(
  payload: CallPayload,
  token: string | null,
): Promise<void> {
  if (!token || !payload.receiverId) return;
  try {
    await axios.post(
      `${config.backendUrl}/intercom/notify`,
      {
        receiverId: payload.receiverId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callId: payload.callId,
        callType: payload.callType,
        callerUnit: payload.callerUnit ?? "",
        callerBlock: payload.callerBlock ?? "",
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    // Non-critical — do not block the call, but log so we can diagnose push issues
    console.warn(
      "[Intercom] notifyCallReceiver failed (push not delivered):",
      err,
    );
  }
}

/**
 * Tell the receiver (via push) that the caller cancelled before they answered.
 * Best-effort — allows the receiver to clear the incoming-call notification
 * even when their app is backgrounded/killed.
 */
export async function notifyCallCancelled(
  payload: CallPayload,
  token: string | null,
): Promise<void> {
  if (!token || !payload.receiverId) return;
  try {
    await axios.post(
      `${config.backendUrl}/intercom/notify-cancel`,
      {
        receiverId: payload.receiverId,
        callId: payload.callId,
        callerName: payload.callerName,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // Non-critical
  }
}
