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
 * Subscribe to call events addressed to a user.
 * Returns a cleanup function that unsubscribes.
 */
export function subscribeToUserChannel(
  userId: string,
  onEvent: (type: CallEventType, payload: CallPayload) => void,
): () => void {
  const ch = supabase
    .channel(`intercom:${userId}`)
    .on("broadcast", { event: "*" }, ({ event, payload }) => {
      onEvent(event as CallEventType, payload as CallPayload);
    })
    .subscribe();

  return () => supabase.removeChannel(ch);
}

/**
 * Send a call event to another user's channel.
 * Creates a temporary subscription on the receiver's channel to broadcast.
 */
async function sendToUser(
  userId: string,
  type: CallEventType,
  payload: CallPayload | WebRTCPayload,
): Promise<void> {
  const ch = supabase.channel(`intercom:${userId}`);

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

/** Send call:incoming to the receiver. */
export const initiateCall = (p: CallPayload) =>
  sendToUser(p.receiverId, "call:incoming", p);

/** Send call:accepted to the caller. */
export const acceptCall = (p: CallPayload) =>
  sendToUser(p.callerId, "call:accepted", p);

/** Send call:rejected to the caller. */
export const rejectCall = (p: CallPayload) =>
  sendToUser(p.callerId, "call:rejected", p);

/** Send call:ended to the other party. */
export const endCall = (otherUserId: string, p: CallPayload) =>
  sendToUser(otherUserId, "call:ended", p);

/** Send SDP offer (all ICE candidates included) from caller to receiver. */
export const sendSdpOffer = (targetUserId: string, p: WebRTCPayload) =>
  sendToUser(targetUserId, "call:sdp_offer", p);

/** Send SDP answer (all ICE candidates included) from receiver to caller. */
export const sendSdpAnswer = (targetUserId: string, p: WebRTCPayload) =>
  sendToUser(targetUserId, "call:sdp_answer", p);

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
  } catch {
    // Non-critical — do not block the call
  }
}
