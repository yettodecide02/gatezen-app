// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  Vibration,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
let mediaDevices: any = null;
let RTCPeerConnection: any = null;
let RTCSessionDescription: any = null;
try {
  const WebRTC = require("react-native-webrtc");
  mediaDevices = WebRTC.mediaDevices;
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
} catch {
  // Native module not available – calling features will be disabled
}

import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getToken, getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  acceptCall,
  endCall,
  generateCallId,
  initiateCall,
  notifyCallReceiver,
  rejectCall,
  sendSdpAnswer,
  sendSdpOffer,
  subscribeToUserChannel,
} from "@/lib/intercom";
import type { CallPayload, CallType, WebRTCPayload } from "@/lib/intercom";

type CallMode = "outgoing" | "incoming" | "active" | "declined" | "ended";

const AVATAR_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const CALL_TYPE_LABEL: Record<string, string> = {
  R2G: "RESIDENT  →  GATEKEEPER",
  G2R: "GATEKEEPER  →  RESIDENT",
  R2R: "RESIDENT  →  RESIDENT",
};

/** Ring timeout for outgoing calls (ms). */
const RING_TIMEOUT_MS = 30_000;

function buildIceConfig() {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUser = config.turnUsername;
  const turnCred = config.turnCredential;
  if (turnUser && turnCred) {
    // Add all TURN variants (UDP, TCP, TLS) for maximum NAT traversal coverage.
    // Without TCP/TLS fallbacks, calls fail on firewalls that block UDP.
    const urls: string[] = [];
    if (config.turnUrl) urls.push(config.turnUrl);
    if (config.turnUrlTcp) urls.push(config.turnUrlTcp);
    if (config.turnUrlTls) urls.push(config.turnUrlTls);
    if (urls.length > 0) {
      servers.push({ urls, username: turnUser, credential: turnCred });
    }
  }
  return { iceServers: servers };
}
const STUN_CONFIG = buildIceConfig();

/**
 * Wait until all ICE candidates have been gathered (iceGatheringState ===
 * "complete"). The null sentinel from onicecandidate signals completion.
 * Falls back after 5 seconds so a stalled gather never blocks the call.
 */
async function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return;
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5000);
    pc.addEventListener("icecandidate", function onIce({ candidate }) {
      if (candidate === null) {
        clearTimeout(timer);
        pc.removeEventListener("icecandidate", onIce);
        resolve();
      }
    });
  });
}

export default function CallScreen() {
  const params = useLocalSearchParams<{
    mode: "outgoing" | "incoming";
    callId: string;
    callType: string;
    peerId: string;
    peerName: string;
    peerUnit?: string;
    peerBlock?: string;
  }>();

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const tint = useThemeColor({}, "tint");

  const [callMode, setCallMode] = useState<CallMode>(
    (params.mode as CallMode) ?? "outgoing",
  );
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initiatedRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildPayload = useCallback((): CallPayload => {
    const isOutgoing = params.mode === "outgoing";
    return {
      callId: params.callId,
      callType: params.callType as CallType,
      callerId: isOutgoing ? (currentUser?.id ?? "") : params.peerId,
      callerName: isOutgoing ? (currentUser?.name ?? "") : params.peerName,
      callerUnit: isOutgoing
        ? (currentUser?.unitNumber ?? currentUser?.unit?.number ?? "")
        : (params.peerUnit ?? ""),
      callerBlock: isOutgoing
        ? (currentUser?.blockName ?? currentUser?.block?.name ?? "")
        : (params.peerBlock ?? ""),
      receiverId: isOutgoing ? params.peerId : (currentUser?.id ?? ""),
      receiverName: isOutgoing ? params.peerName : (currentUser?.name ?? ""),
    };
  }, [currentUser, params]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── WebRTC helpers ────────────────────────────────────────────────────────
  const setupPeerConnection = useCallback(() => {
    if (!RTCPeerConnection) return null;
    const pc = new RTCPeerConnection(STUN_CONFIG);
    pcRef.current = pc;

    // Handle remote audio tracks — without this the other party's audio is
    // received by the peer connection but never routed to the device speaker.
    pc.ontrack = (event: any) => {
      console.log("[Intercom] Remote track received:", event.track?.kind);
    };

    // Monitor ICE connection state — end the call gracefully on failure.
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[Intercom] ICE connection state:", state);
      if (state === "failed") {
        console.warn(
          "[Intercom] ICE failed — check TURN credentials or network. Ending call.",
        );
        // Inline cleanup avoids stale-closure issues with cleanupWebRTC.
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t: any) => t.stop());
          localStreamRef.current = null;
        }
        pcRef.current?.close();
        pcRef.current = null;
        setCallMode("ended");
        setTimeout(() => router.back(), 2500);
      }
    };

    return pc;
  }, []);

  const startAudio = useCallback(async () => {
    if (!mediaDevices) return;
    try {
      // iOS: needs explicit audio session for mic + silent-mode playback.
      // Android: react-native-webrtc owns AudioManager (MODE_IN_COMMUNICATION
      // + audio focus). Calling setAudioModeAsync on Android BEFORE WebRTC
      // initializes overrides that setup and silently breaks both mic recording
      // and remote audio playback. So we skip it entirely on Android.
      if (Platform.OS === "ios") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      const pc = pcRef.current;
      if (pc) {
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
      }
    } catch (err) {
      console.error(
        "[Intercom] startAudio failed (mic denied or hw error):",
        err,
      );
    }
  }, []);

  const cleanupWebRTC = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // ── Load current user ─────────────────────────────────────────────────────
  useEffect(() => {
    getUser().then(setCurrentUser);
  }, []);

  // ── Subscribe to own channel for call state changes ───────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToUserChannel(currentUser.id, (type, p) => {
      if ((p as any).callId !== params.callId) return; // different call — ignore
      if (type === "call:accepted") {
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }
        setCallMode("active");
        startTimer();
        Vibration.vibrate(50);
      } else if (type === "call:rejected") {
        setCallMode("declined");
        stopTimer();
        setTimeout(() => router.back(), 2500);
      } else if (type === "call:ended") {
        cleanupWebRTC();
        setCallMode("ended");
        stopTimer();
        setTimeout(() => router.back(), 2500);
      } else if (type === "call:sdp_offer") {
        // Receiver: apply the caller's SDP offer and respond with an answer
        const wp = p as any as WebRTCPayload;
        if (!pcRef.current || !wp.sdp || !RTCSessionDescription) return;
        const pc = pcRef.current;
        (async () => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(wp.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await waitForIceGathering(pc);
            await sendSdpAnswer(params.peerId, {
              callId: params.callId,
              sdp: {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              },
            });
          } catch (err) {
            console.error("[Intercom] SDP answer failed:", err);
          }
        })();
      } else if (type === "call:sdp_answer") {
        // Caller: complete the WebRTC handshake with the receiver's SDP answer
        const wp = p as any as WebRTCPayload;
        if (!pcRef.current || !wp.sdp || !RTCSessionDescription) return;
        pcRef.current
          .setRemoteDescription(new RTCSessionDescription(wp.sdp))
          .catch((err) =>
            console.error("[Intercom] setRemoteDescription failed:", err),
          );
      }
    });
    return () => {
      unsub();
      stopTimer();
      cleanupWebRTC();
    };
  }, [currentUser?.id]);

  // ── Initiate outgoing call once user is loaded ────────────────────────────
  useEffect(() => {
    if (!currentUser?.id || params.mode !== "outgoing" || initiatedRef.current)
      return;
    initiatedRef.current = true;
    const payload = buildPayload();
    // Initiate Supabase realtime broadcast (primary delivery) and push
    // notification (background/killed fallback) concurrently.
    // Only navigate back if the realtime broadcast itself fails — the push
    // notification is best-effort and failures are non-fatal.
    initiateCall(payload).catch((err) => {
      console.error("[Intercom] initiateCall failed:", err);
      router.back();
    });
    getToken().then((token) => notifyCallReceiver(payload, token));

    // Auto-cancel if no answer within RING_TIMEOUT_MS
    ringTimeoutRef.current = setTimeout(async () => {
      try {
        await endCall(params.peerId, payload);
      } catch {}
      router.back();
    }, RING_TIMEOUT_MS);

    return () => {
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [currentUser?.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Setup WebRTC peer connection and acquire mic BEFORE signalling
      // acceptance, so pcRef is ready when the caller's SDP offer arrives.
      setupPeerConnection();
      await startAudio();
      await acceptCall(buildPayload());
      setCallMode("active");
      startTimer();
      Vibration.vibrate(50);
    } catch (err) {
      console.error("[Intercom] handleAccept failed:", err);
      cleanupWebRTC();
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    cleanupWebRTC();
    try {
      await rejectCall(buildPayload());
    } catch {}
    router.back();
  };

  const handleEnd = async () => {
    stopTimer();
    cleanupWebRTC();
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    try {
      await endCall(params.peerId, buildPayload());
    } catch {}
    router.back();
  };

  // ── Caller: initiate WebRTC once the call becomes active ─────────────────
  useEffect(() => {
    if (callMode !== "active" || params.mode !== "outgoing") return;
    (async () => {
      try {
        setupPeerConnection();
        await startAudio();
        const pc = pcRef.current;
        if (!pc) return;
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);
        await sendSdpOffer(params.peerId, {
          callId: params.callId,
          sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
        });
      } catch (err) {
        console.error("[Intercom] SDP offer failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callMode]);

  // ── Mute: toggle local audio track enabled state ──────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted]);

  // ── Speaker: route audio output between earpiece and loudspeaker ──────────
  useEffect(() => {
    if (callMode !== "active") return;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: !isSpeaker,
    }).catch(() => {});
  }, [isSpeaker, callMode]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const aColor = avatarColor(params.peerName ?? "");
  const initials = getInitials(params.peerName ?? "");
  const peerSub = [
    params.peerBlock ? `Block ${params.peerBlock}` : null,
    params.peerUnit ? `Unit ${params.peerUnit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ── Terminal state overlay (declined / ended) ─────────────────────────────
  if (callMode === "declined" || callMode === "ended") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0D0D0D",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#EF444420",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="phone-missed" size={34} color="#EF4444" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff" }}>
          {callMode === "declined" ? "Call Declined" : "Call Ended"}
        </Text>
        {callMode === "ended" && duration > 0 && (
          <Text style={{ fontSize: 14, color: "#94A3B8" }}>
            Duration {fmtDuration(duration)}
          </Text>
        )}
      </View>
    );
  }

  // ── Main call UI ──────────────────────────────────────────────────────────
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0D0D0D",
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: 28,
      }}
    >
      {/* Call type badge */}
      <View style={{ alignItems: "center", marginBottom: 4 }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.07)",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: "#64748B",
              letterSpacing: 1.2,
            }}
          >
            {CALL_TYPE_LABEL[params.callType] ?? "INTERCOM"}
          </Text>
        </View>
      </View>

      {/* Center — avatar, name, status */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Avatar ring */}
        <View
          style={{
            width: 116,
            height: 116,
            borderRadius: 58,
            backgroundColor: aColor + "25",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: callMode === "active" ? "#10B981" : aColor + "55",
          }}
        >
          <Text style={{ fontSize: 38, fontWeight: "800", color: aColor }}>
            {initials}
          </Text>
        </View>

        {/* Name + unit */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#fff",
              textAlign: "center",
            }}
          >
            {params.peerName ?? "Unknown"}
          </Text>
          {!!peerSub && (
            <Text style={{ fontSize: 13, color: "#64748B" }}>{peerSub}</Text>
          )}

          {/* Status / timer */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: callMode === "active" ? "700" : "400",
              color: callMode === "active" ? "#10B981" : "#94A3B8",
              marginTop: 6,
            }}
          >
            {callMode === "outgoing"
              ? "Calling…"
              : callMode === "incoming"
                ? "Incoming Call"
                : fmtDuration(duration)}
          </Text>
        </View>
      </View>

      {/* Mute / Speaker row — only when active */}
      {callMode === "active" && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 28,
            marginBottom: 32,
          }}
        >
          <Pressable
            onPress={() => setIsMuted((v) => !v)}
            style={{
              alignItems: "center",
              gap: 6,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isMuted
                  ? "#EF444425"
                  : "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather
                name={isMuted ? "mic-off" : "mic"}
                size={22}
                color={isMuted ? "#EF4444" : "#fff"}
              />
            </View>
            <Text style={{ fontSize: 11, color: "#64748B" }}>
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsSpeaker((v) => !v)}
            style={{ alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isSpeaker
                  ? tint + "25"
                  : "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather
                name="volume-2"
                size={22}
                color={isSpeaker ? tint : "#fff"}
              />
            </View>
            <Text style={{ fontSize: 11, color: "#64748B" }}>
              {isSpeaker ? "Speaker" : "Earpiece"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Primary action buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 40,
          alignItems: "center",
        }}
      >
        {callMode === "incoming" ? (
          <>
            {/* Decline */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={handleDecline}
                style={({ pressed }) => ({
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Feather name="phone-off" size={28} color="#fff" />
              </Pressable>
              <Text style={{ fontSize: 13, color: "#94A3B8" }}>Decline</Text>
            </View>

            {/* Accept */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={handleAccept}
                disabled={accepting}
                style={({ pressed }) => ({
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#10B981",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed || accepting ? 0.75 : 1,
                })}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Feather name="phone" size={28} color="#fff" />
                )}
              </Pressable>
              <Text style={{ fontSize: 13, color: "#94A3B8" }}>Accept</Text>
            </View>
          </>
        ) : (
          /* End / Cancel — outgoing or active */
          <View style={{ alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={handleEnd}
              style={({ pressed }) => ({
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#EF4444",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Feather name="phone-off" size={28} color="#fff" />
            </Pressable>
            <Text style={{ fontSize: 13, color: "#94A3B8" }}>
              {callMode === "outgoing" ? "Cancel" : "End Call"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
