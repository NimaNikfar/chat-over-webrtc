// components/webrtc/index.tsx
"use client";

import { useEffect, useState } from "react";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { usePeerConnection }    from "./hooks/usePeerConnection";
import { useMediaStream }       from "./hooks/useMediaStream";
import { ConnectionCard }       from "./sections/ConnectionCard";
import { SdpCard }              from "./sections/SdpCard";
import { ChatCard }             from "./sections/ChatCard";
import { AdvancedCard }         from "./sections/AdvancedCard";
import { VideoCard }            from "./sections/VideoCard";

export default function WebRTCClient() {
  const settingsHook = useAdvancedSettings();
  const pc           = usePeerConnection();
  const media        = useMediaStream();

  const [remoteSdp,    setRemoteSdp]    = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // cameraReady is true only when we have an active local stream with tracks
  const cameraReady = !!(
    media.localStream && media.localStream.getTracks().length > 0
  );

  // Register remote-track callback once on mount
  useEffect(() => {
    pc.onRemoteTrack((stream) => {
      console.log("[index] remote stream received, tracks:", stream.getTracks().length);
      setRemoteStream(stream);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateOffer = () => {
    if (!cameraReady) {
      console.warn("[index] ❌ Cannot create offer — camera not started!");
      return;
    }
    console.log("[index] creating offer with stream tracks:",
      media.localStream?.getTracks().map((t) => t.kind));
    pc.createOffer(settingsHook.settings, media.localStream);
  };

  const handleCreateAnswer = () => {
    if (!cameraReady) {
      console.warn("[index] ❌ Cannot create answer — camera not started!");
      return;
    }
    console.log("[index] creating answer with stream tracks:",
      media.localStream?.getTracks().map((t) => t.kind));
    pc.createAnswer(settingsHook.settings, remoteSdp, media.localStream);
  };

  const handleApplyAnswer = () => {
    pc.applyRemoteAnswer(remoteSdp);
  };

  const handleHangUp = () => {
    pc.hangUp();
    media.stopLocalMedia();
    setRemoteStream(null);
  };

  return (
    <div className="space-y-6">
      <ConnectionCard
        loading={pc.loading}
        iceStatus={pc.iceStatus}
        cameraReady={cameraReady}
        onCreateOffer={handleCreateOffer}
        onCreateAnswer={handleCreateAnswer}
        onApplyAnswer={handleApplyAnswer}
        onHangUp={handleHangUp}
      />

      <VideoCard
        mediaHook={media}
        remoteStream={remoteStream}
      />

      <SdpCard
        localSdp={pc.localSdp}
        remoteSdp={remoteSdp}
        onRemoteSdpChange={setRemoteSdp}
      />

      <ChatCard
        chatLog={pc.chatLog}
        channelOpen={pc.channelOpen}
        onSend={pc.sendMessage}
      />

      <AdvancedCard settingsHook={settingsHook} />
    </div>
  );
}
