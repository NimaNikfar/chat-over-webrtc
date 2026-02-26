// components/webrtc/sections/ConnectionCard.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaStreamHook } from "../hooks/useMediaStream";

const ICE_COLORS: Record<string, string> = {
  connected:    "text-green-500",
  completed:    "text-green-500",
  failed:       "text-red-500",
  disconnected: "text-yellow-500",
  checking:     "text-blue-500",
  new:          "text-zinc-400",
};

interface Props {
  loading:            boolean;
  iceStatus:          string;
  cameraReady:        boolean;
  signalingConnected: boolean;
  mediaHook:          MediaStreamHook;
  onHangUp:           () => void;
}

export function ConnectionCard({
  loading,
  iceStatus,
  cameraReady,
  signalingConnected,
  mediaHook,
  onHangUp,
}: Props) {
  const isConnected = iceStatus === "connected" || iceStatus === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            {signalingConnected && (
              <span className="text-blue-400">WS 🟢</span>
            )}
            {iceStatus && (
              <span className={ICE_COLORS[iceStatus] ?? "text-muted-foreground"}>
                ICE: {iceStatus}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex gap-2 flex-wrap">
        {!cameraReady ? (
          <Button onClick={mediaHook.startLocalMedia}>
            📷 Start Camera
          </Button>
        ) : (
          <Button variant="outline" onClick={mediaHook.stopLocalMedia}>
            ✕ Stop Camera
          </Button>
        )}

        {isConnected && (
          <Button variant="destructive" onClick={onHangUp} disabled={loading}>
            📵 Hang Up
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
