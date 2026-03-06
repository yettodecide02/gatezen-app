// @ts-nocheck
import supabase from "@/lib/supabase";

export type CallType = "R2R" | "R2G" | "G2R";

export type CallEventType =
  | "call:incoming"
  | "call:accepted"
  | "call:rejected"
  | "call:ended";

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
  payload: CallPayload,
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
