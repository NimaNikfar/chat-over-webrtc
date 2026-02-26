// components/webrtc/index.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSignaling } from "./hooks/useSignaling";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useMediaStream } from "./hooks/useMediaStream";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { ConnectionCard } from "./sections/ConnectionCard";
import { ChatCard } from "./sections/ChatCard";
import { AdvancedCard } from "./sections/AdvancedCard";
import { VideoCard } from "./sections/VideoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  autoJoinSessionId?: string | null;
}

export default function WebRTCClient({ autoJoinSessionId }: Props) {
  const sig = useSignaling();
  const pc = usePeerConnection();
  const media = useMediaStream();
  const settingsHook = useAdvancedSettings();

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [isInitiator, setIsInitiator] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Refs so callbacks always see fresh values
  const isInitiatorRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const autoJoinDone = useRef(false);

  useEffect(() => { iceServersRef.current = sig.iceServers; }, [sig.iceServers]);
  useEffect(() => { localStreamRef.current = media.localStream; }, [media.localStream]);

  // Wire up callbacks once on mount
  useEffect(() => {
    pc.onRemoteTrack((stream) => {
      console.log("[index] remote track received");
      setRemoteStream(new MediaStream(stream.getTracks()));
    });

    pc.onIceCandidate((candidate) => {
      sig.sendIceCandidate(candidate);
    });

    sig.setCallbacks({
      onPeerJoined: async () => {
        if (!isInitiatorRef.current) return;
        console.log("[index] peer joined — creating offer");
        const offer = await pc.createOffer(
          iceServersRef.current,
          localStreamRef.current
        );
        sig.sendOffer(offer);
      },
      onOffer: async (sdp: RTCSessionDescriptionInit, fromPeer: string) => {
        console.log("[index] received offer — creating answer");
        const answer = await pc.createAnswer(
          iceServersRef.current,
          sdp,
          localStreamRef.current  // use ref, never stale closure
        );
        sig.sendAnswer(answer, fromPeer);
      },
      onAnswer: (sdp: RTCSessionDescriptionInit) => {
        pc.applyRemoteAnswer(sdp);
      },
      onIceCandidate: (candidate: RTCIceCandidateInit) => {
        pc.addIceCandidate(candidate);
      },
      onPeerLeft: () => {
        console.log("[index] peer left");
        pc.hangUp();
        setRemoteStream(null);
        isInitiatorRef.current = false;
        setIsInitiator(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start camera if arriving via invite link
  useEffect(() => {
    if (autoJoinSessionId && !media.localStream) {
      media.startLocalMedia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinSessionId]);

  // Auto-join once camera is ready
  useEffect(() => {
    if (
      autoJoinSessionId &&
      !autoJoinDone.current &&
      media.localStream &&
      media.localStream.getTracks().length > 0
    ) {
      autoJoinDone.current = true;
      isInitiatorRef.current = false;
      setIsInitiator(false);
      sig.joinSession(autoJoinSessionId).catch(console.error);
    }
  }, [autoJoinSessionId, media.localStream, sig]);

  const handleCreate = async () => {
    if (!media.localStream) return;
    try {
      isInitiatorRef.current = true;
      setIsInitiator(true);
      const sid = await sig.createSession();
      await sig.joinSession(sid);
      const url = `${window.location.origin}${window.location.pathname}?session=${sid}`;
      setShareLink(url);
      console.log("[index] session created:", sid);
    } catch (e) {
      console.error("[handleCreate]", e);
    }
  };

  const handleJoin = async () => {
    if (!media.localStream || !joinInput.trim()) return;
    try {
      isInitiatorRef.current = false;
      setIsInitiator(false);
      await sig.joinSession(joinInput.trim());
    } catch (e) {
      console.error("[handleJoin]", e);
    }
  };

  const handleHangUp = () => {
    pc.hangUp();
    media.stopLocalMedia();
    sig.disconnect();
    setRemoteStream(null);
    setShareLink(null);
    setIsInitiator(false);
    isInitiatorRef.current = false;
  };

  const handleCopyLink = () => {
    if (shareLink) navigator.clipboard.writeText(shareLink);
  };

  const cameraReady = !!(media.localStream?.getTracks().length);
  const p2pActive = pc.iceStatus === "connected" || pc.iceStatus === "completed";
  const sessionActive = sig.connected || p2pActive;

  return (
    <div className="space-y-6">

      {/* Share link banner — host only */}
      {shareLink && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-semibold">Share this link</p>
            <div className="flex gap-2 items-center">
              <code className="text-xs font-mono break-all flex-1 bg-muted text-foreground rounded px-3 py-2">
                {shareLink}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The other person will join automatically after allowing camera access.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Auto-join status banner — guest only */}
      {autoJoinSessionId && !sessionActive && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {cameraReady
                ? "Camera ready — joining session…"
                : "Starting camera, then joining session…"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create / Join panel — hidden when session active */}
      {!sessionActive && !autoJoinSessionId && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Start your camera first, then create or join a session.
            </p>
            <Button className="w-full" onClick={handleCreate} disabled={!cameraReady}>
              Create Session (Host)
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Paste Session ID to join…"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <Button
                variant="outline"
                onClick={handleJoin}
                disabled={!joinInput.trim() || !cameraReady}
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active session status */}
      {sessionActive && (
        <Card>
          <CardContent className="pt-6 text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Session: </span>
              <code className="font-mono text-xs break-all">{sig.sessionId}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              {isInitiator ? "Host" : "Guest"}
            </div>
            <div>
              <span className="text-muted-foreground">Signaling: </span>
              <span className={sig.connected ? "text-green-500" : "text-muted-foreground"}>
                {sig.connected ? "Connected" : "Closed"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">ICE: </span>
              <span className={p2pActive ? "text-green-500" : "text-muted-foreground"}>
                {pc.iceStatus || "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <ConnectionCard
        loading={pc.loading}
        iceStatus={pc.iceStatus}
        cameraReady={cameraReady}
        signalingConnected={sig.connected}
        mediaHook={media}
        onHangUp={handleHangUp}
      />

      <VideoCard mediaHook={media} remoteStream={remoteStream} />

      <ChatCard
        chatLog={pc.chatLog}
        channelOpen={pc.channelOpen}
        onSend={pc.sendMessage}
      />

      <AdvancedCard settingsHook={settingsHook} />
    </div>
  );
}
