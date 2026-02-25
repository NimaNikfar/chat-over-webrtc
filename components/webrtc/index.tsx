"use client";

import { useState } from "react";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { ConnectionCard } from "./sections/ConnectionCard";
import { SdpCard } from "./sections/SdpCard";
import { ChatCard } from "./sections/ChatCard";
import { AdvancedCard } from "./sections/AdvancedCard";

export default function WebRTCClient() {
  const settingsHook = useAdvancedSettings();
  const pc = usePeerConnection();
  const [remoteSdp, setRemoteSdp] = useState("");

  return (
    <div className="space-y-6">
      <ConnectionCard
        loading={pc.loading}
        iceStatus={pc.iceStatus}
        onCreateOffer={() => pc.createOffer(settingsHook.settings)}
        onCreateAnswer={() => pc.createAnswer(settingsHook.settings, remoteSdp)}
        onApplyAnswer={() => pc.applyRemoteAnswer(remoteSdp)}
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
