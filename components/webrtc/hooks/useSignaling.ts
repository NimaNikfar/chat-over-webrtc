// components/webrtc/hooks/useSignaling.ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://webrtc-signaling.liara.run";
const WS_BASE  = process.env.NEXT_PUBLIC_WS_BASE  ?? "https://webrtc-signaling.liara.run";

export interface SignalingCallbacks {
  onPeerJoined:   () => void;
  onOffer:        (sdp: RTCSessionDescriptionInit, fromPeer: string) => void;
  onAnswer:       (sdp: RTCSessionDescriptionInit) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onPeerLeft:     () => void;
}

export function useSignaling() {
  const wsRef      = useRef<WebSocket | null>(null);
  const sessionRef = useRef<string>("");
  const cbRef      = useRef<Partial<SignalingCallbacks>>({});

  const [sessionId,  setSessionId]  = useState("");
  const [peerId,     setPeerId]     = useState("");
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [connected,  setConnected]  = useState(false);

  const setCallbacks = useCallback((cbs: Partial<SignalingCallbacks>) => {
    cbRef.current = cbs;
  }, []);

  const createSession = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/v1/sessions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "WebRTC Chat" }),
    });
    if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
    const data = await res.json();
    return data.session_id as string;
  }, []);

  const joinSession = useCallback(async (sid: string) => {
    const myPeerId = uuidv4(); // generate locally before request

    const res = await fetch(`${API_BASE}/api/v1/sessions/${sid}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peer_id: myPeerId }), // send explicitly
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    const data = await res.json();

    // Set refs immediately (before state, to avoid async race)
    sessionRef.current = sid;

    setSessionId(sid);
    setPeerId(myPeerId);
    setIceServers(data.ice_servers ?? []);

    // Open WebSocket using local variable — not state
    const ws = new WebSocket(`${WS_BASE}/ws/${sid}/${myPeerId}`);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const cb  = cbRef.current;
      switch (msg.type) {
        case "peer_joined":   cb.onPeerJoined?.();                          break;
        case "sdp_offer":     cb.onOffer?.(msg.payload, msg.from_peer);     break;
        case "sdp_answer":    cb.onAnswer?.(msg.payload);                   break;
        case "ice_candidate": cb.onIceCandidate?.(msg.payload);             break;
        case "peer_left":
        case "session_ended": cb.onPeerLeft?.();                            break;
      }
    };

    return {
      peerId:      myPeerId,
      iceServers:  data.ice_servers as RTCIceServer[],
      isInitiator: data.is_initiator as boolean,
    };
  }, []);

  const sendOffer = useCallback((sdp: RTCSessionDescriptionInit) => {
    wsRef.current?.send(JSON.stringify({
      type:       "sdp_offer",
      payload:    sdp,
      session_id: sessionRef.current,
    }));
  }, []);

  const sendAnswer = useCallback((sdp: RTCSessionDescriptionInit, toPeer: string) => {
    wsRef.current?.send(JSON.stringify({
      type:       "sdp_answer",
      payload:    sdp,
      session_id: sessionRef.current,
      to_peer:    toPeer,
    }));
  }, []);

  const sendIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    wsRef.current?.send(JSON.stringify({
      type:       "ice_candidate",
      payload:    candidate,
      session_id: sessionRef.current,
    }));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);

  return {
    sessionId, peerId, iceServers, connected,
    createSession, joinSession, setCallbacks,
    sendOffer, sendAnswer, sendIceCandidate, disconnect,
  };
}
