// components/webrtc/hooks/usePeerConnection.ts
"use client";

import { useRef, useState, useCallback } from "react";

export function usePeerConnection() {
  const pcRef  = useRef<RTCPeerConnection | null>(null);
  const dcRef  = useRef<RTCDataChannel | null>(null);

  const onRemoteTrackCb  = useRef<((s: MediaStream) => void) | null>(null);
  const onIceCandidateCb = useRef<((c: RTCIceCandidateInit) => void) | null>(null);

  const [localSdp,    setLocalSdp]    = useState("");
  const [iceStatus,   setIceStatus]   = useState("new");
  const [loading,     setLoading]     = useState(false);
  const [chatLog,     setChatLog]     = useState<string[]>([]);
  const [channelOpen, setChannelOpen] = useState(false);

  const buildPC = useCallback((iceServers: RTCIceServer[]) => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log("[pc] ICE state:", pc.iceConnectionState);
      setIceStatus(pc.iceConnectionState);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) onIceCandidateCb.current?.(candidate.toJSON());
    };

    pc.ontrack = (e) => {
      console.log("[pc] ontrack fired, streams:", e.streams.length, "track:", e.track.kind);
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      onRemoteTrackCb.current?.(stream);
    };

    pc.ondatachannel = (e) => {
      dcRef.current = e.channel;
      e.channel.onopen    = () => setChannelOpen(true);
      e.channel.onclose   = () => setChannelOpen(false);
      e.channel.onmessage = (ev) => setChatLog((l) => [...l, `Remote: ${ev.data}`]);
    };

    return pc;
  }, []);

  const setupDataChannel = (pc: RTCPeerConnection) => {
    const dc = pc.createDataChannel("chat");
    dcRef.current = dc;
    dc.onopen    = () => setChannelOpen(true);
    dc.onclose   = () => setChannelOpen(false);
    dc.onmessage = (e) => setChatLog((l) => [...l, `Remote: ${e.data}`]);
  };

  const createOffer = useCallback(async (
    iceServers: RTCIceServer[],
    localStream: MediaStream | null
  ) => {
    setLoading(true);
    const pc = buildPC(iceServers);
    setupDataChannel(pc);
    // Add tracks BEFORE creating offer
    if (localStream) {
      localStream.getTracks().forEach((t) => {
        console.log("[pc] adding local track to offer:", t.kind);
        pc.addTrack(t, localStream);
      });
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    setLocalSdp(JSON.stringify({ type: offer.type, sdp: offer.sdp }));
    setLoading(false);
    return { type: offer.type, sdp: offer.sdp } as RTCSessionDescriptionInit;
  }, [buildPC]);

  const createAnswer = useCallback(async (
    iceServers: RTCIceServer[],
    offerSdp: RTCSessionDescriptionInit,
    localStream: MediaStream | null
  ) => {
    setLoading(true);
    const pc = buildPC(iceServers);
    // Add tracks BEFORE setRemoteDescription for reliable ontrack firing
    if (localStream) {
      localStream.getTracks().forEach((t) => {
        console.log("[pc] adding local track to answer:", t.kind);
        pc.addTrack(t, localStream);
      });
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setLocalSdp(JSON.stringify({ type: answer.type, sdp: answer.sdp }));
    setLoading(false);
    return { type: answer.type, sdp: answer.sdp } as RTCSessionDescriptionInit;
  }, [buildPC]);

  const applyRemoteAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const hangUp = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setIceStatus("closed");
    setChannelOpen(false);
    setLocalSdp("");
  }, []);

  const sendMessage = useCallback((msg: string) => {
    dcRef.current?.send(msg);
    setChatLog((l) => [...l, `Me: ${msg}`]);
  }, []);

  const onRemoteTrack = useCallback((cb: (s: MediaStream) => void) => {
    onRemoteTrackCb.current = cb;
  }, []);

  const onIceCandidate = useCallback((cb: (c: RTCIceCandidateInit) => void) => {
    onIceCandidateCb.current = cb;
  }, []);

  return {
    localSdp, iceStatus, loading, chatLog, channelOpen,
    createOffer, createAnswer, applyRemoteAnswer, addIceCandidate,
    hangUp, sendMessage, onRemoteTrack, onIceCandidate,
  };
}
