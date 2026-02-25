// components/webrtc/hooks/usePeerConnection.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { buildIceServers }               from "./useAdvancedSettings";
import type { AdvancedSettings }         from "./useAdvancedSettings";

export type { AdvancedSettings };

export type IceStatus =
  | "new" | "checking" | "connected"
  | "completed" | "failed" | "disconnected" | "closed";

export function usePeerConnection() {
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const channelRef       = useRef<RTCDataChannel | null>(null);
  const remoteTrackCbRef = useRef<((s: MediaStream) => void) | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  const [localSdp,    setLocalSdp]    = useState("");
  const [iceStatus,   setIceStatus]   = useState<IceStatus>("new");
  const [chatLog,     setChatLog]     = useState<string[]>([]);
  const [channelOpen, setChannelOpen] = useState(false);
  const [loading,     setLoading]     = useState(false);

  // ─── Data channel wiring ──────────────────────────────────────────────────

  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    console.log("[pc] setupDataChannel:", dc.label);
    channelRef.current = dc;
    dc.onopen    = () => { console.log("[pc] dc OPEN");  setChannelOpen(true);  };
    dc.onclose   = () => { console.log("[pc] dc CLOSE"); setChannelOpen(false); };
    dc.onmessage = (e) => {
      console.log("[pc] dc message:", e.data);
      setChatLog((prev) => [...prev, `Remote: ${e.data}`]);
    };
  }, []);

  // ─── Add local tracks ─────────────────────────────────────────────────────

  const addLocalTracks = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream | null) => {
      if (!stream) {
        console.warn("[pc] ⚠️ addLocalTracks: stream is null — no video will be sent");
        return;
      }
      const existingIds = pc.getSenders().map((s) => s.track?.id);
      let added = 0;
      stream.getTracks().forEach((track) => {
        if (existingIds.includes(track.id)) {
          console.log("[pc] track already present, skipping:", track.kind);
          return;
        }
        pc.addTrack(track, stream);
        added++;
        console.log("[pc] addTrack →", track.kind, "id=", track.id);
      });
      console.log("[pc] addLocalTracks: added", added, "track(s)");
    },
    []
  );

  // ─── Wait for ICE gathering ───────────────────────────────────────────────

  const waitForIce = (pc: RTCPeerConnection): Promise<void> =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        console.log("[pc] ICE already complete");
        return resolve();
      }
      const handler = () => {
        console.log("[pc] ICE gathering →", pc.iceGatheringState);
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      pc.addEventListener("icegatheringstatechange", handler);
      setTimeout(() => {
        console.warn("[pc] ⚠️ ICE timeout 10s — proceeding anyway");
        resolve();
      }, 10_000);
    });

  // ─── Build RTCPeerConnection ──────────────────────────────────────────────

  const buildPC = useCallback((settings: AdvancedSettings) => {
    console.log("[pc] building RTCPeerConnection...");
    const iceServers = buildIceServers(settings);   // ← shared helper
    console.log("[pc] ICE servers:", iceServers.length ? iceServers : "none (LAN only)");
    const pc = new RTCPeerConnection({ iceServers });

    pc.oniceconnectionstatechange = () => {
      console.log("[pc] ICE connection →", pc.iceConnectionState);
      setIceStatus(pc.iceConnectionState as IceStatus);
    };
    pc.onicegatheringstatechange = () =>
      console.log("[pc] ICE gathering →", pc.iceGatheringState);
    pc.onsignalingstatechange    = () =>
      console.log("[pc] signaling →", pc.signalingState);
    pc.onconnectionstatechange   = () =>
      console.log("[pc] connection →", pc.connectionState);
    pc.onicecandidate = (e) =>
      e.candidate
        ? console.log("[pc] candidate:", e.candidate.type, e.candidate.protocol)
        : console.log("[pc] ICE gathering complete (null candidate)");

    pc.ontrack = (event) => {
      console.log("[pc] ✅ ontrack fired! kind=", event.track.kind,
                  "streams=", event.streams.length);
      const stream = event.streams[0];
      if (!stream) { console.error("[pc] ❌ event.streams[0] undefined!"); return; }
      if (remoteTrackCbRef.current) {
        remoteTrackCbRef.current(stream);
      } else {
        console.warn("[pc] no callback yet — storing pending stream");
        pendingStreamRef.current = stream;
      }
    };

    console.log("[pc] ✅ RTCPeerConnection ready");
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── createOffer ─────────────────────────────────────────────────────────

  const createOffer = useCallback(
    async (settings: AdvancedSettings, localStream: MediaStream | null) => {
      console.log("══════════════ createOffer START ══════════════");
      console.log("[pc] localStream:", localStream
        ? `✅ ${localStream.getTracks().length} track(s)` : "❌ NULL");
      if (!localStream) {
        console.error("[pc] ❌ Start camera before creating offer!");
        return;
      }
      try {
        setLoading(true);
        const pc = buildPC(settings);
        pcRef.current = pc;
        addLocalTracks(pc, localStream);

        const dc = pc.createDataChannel("chat");
        setupDataChannel(dc);

        const offer = await pc.createOffer();
        console.log("[pc] offer m= lines:",
          offer.sdp?.split("\n").filter((l) => l.startsWith("m="))
        );
        await pc.setLocalDescription(offer);
        await waitForIce(pc);

        const sdp = JSON.stringify(pc.localDescription);
        console.log("[pc] ✅ offer ready, size:", sdp.length, "bytes");
        setLocalSdp(sdp);
      } catch (err) {
        console.error("[pc] ❌ createOffer error:", err);
      } finally {
        setLoading(false);
        console.log("══════════════ createOffer END ════════════════");
      }
    },
    [buildPC, setupDataChannel, addLocalTracks]
  );

  // ─── createAnswer ─────────────────────────────────────────────────────────

  const createAnswer = useCallback(
    async (
      settings:    AdvancedSettings,
      remoteSdp:   string,
      localStream: MediaStream | null
    ) => {
      console.log("══════════════ createAnswer START ═════════════");
      console.log("[pc] localStream:", localStream
        ? `✅ ${localStream.getTracks().length} track(s)` : "❌ NULL");
      if (!localStream) {
        console.error("[pc] ❌ Start camera before creating answer!");
        return;
      }
      try {
        setLoading(true);
        const pc = buildPC(settings);
        pcRef.current = pc;

        pc.ondatachannel = (e) => {
          console.log("[pc] ondatachannel:", e.channel.label);
          setupDataChannel(e.channel);
        };

        addLocalTracks(pc, localStream);

        const remote = JSON.parse(remoteSdp);
        console.log("[pc] remote m= lines:",
          (remote.sdp as string).split("\n").filter((l: string) => l.startsWith("m="))
        );
        await pc.setRemoteDescription(new RTCSessionDescription(remote));

        const answer = await pc.createAnswer();
        console.log("[pc] answer m= lines:",
          answer.sdp?.split("\n").filter((l) => l.startsWith("m="))
        );
        await pc.setLocalDescription(answer);
        await waitForIce(pc);

        const sdp = JSON.stringify(pc.localDescription);
        console.log("[pc] ✅ answer ready, size:", sdp.length, "bytes");
        setLocalSdp(sdp);
      } catch (err) {
        console.error("[pc] ❌ createAnswer error:", err);
      } finally {
        setLoading(false);
        console.log("══════════════ createAnswer END ═══════════════");
      }
    },
    [buildPC, setupDataChannel, addLocalTracks]
  );

  // ─── applyRemoteAnswer ────────────────────────────────────────────────────

  const applyRemoteAnswer = useCallback(async (remoteSdp: string) => {
    const pc = pcRef.current;
    if (!pc) { console.error("[pc] ❌ applyRemoteAnswer: no pc"); return; }
    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(remoteSdp))
      );
      console.log("[pc] ✅ remote answer applied");
    } catch (err) {
      console.error("[pc] ❌ applyRemoteAnswer:", err);
    }
  }, []);

  // ─── hangUp ───────────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    console.log("[pc] hangUp");
    channelRef.current?.close();
    pcRef.current?.close();
    pcRef.current            = null;
    channelRef.current       = null;
    pendingStreamRef.current = null;
    setLocalSdp("");
    setIceStatus("closed" as IceStatus);
    setChannelOpen(false);
    setChatLog([]);
  }, []);

  // ─── sendMessage ──────────────────────────────────────────────────────────

  const sendMessage = useCallback((msg: string) => {
    const dc = channelRef.current;
    if (!dc || dc.readyState !== "open") {
      console.error("[pc] sendMessage: channel not open, state=", dc?.readyState);
      return;
    }
    dc.send(msg);
    setChatLog((prev) => [...prev, `You: ${msg}`]);
  }, []);

  // ─── onRemoteTrack ────────────────────────────────────────────────────────

  const onRemoteTrack = useCallback((cb: (s: MediaStream) => void) => {
    console.log("[pc] onRemoteTrack callback registered");
    remoteTrackCbRef.current = cb;
    if (pendingStreamRef.current) {
      console.log("[pc] flushing pending stream");
      cb(pendingStreamRef.current);
      pendingStreamRef.current = null;
    }
  }, []);

  return {
    loading,
    localSdp,
    iceStatus,
    chatLog,
    channelOpen,
    createOffer,
    createAnswer,
    applyRemoteAnswer,
    hangUp,
    sendMessage,
    onRemoteTrack,
  };
}
