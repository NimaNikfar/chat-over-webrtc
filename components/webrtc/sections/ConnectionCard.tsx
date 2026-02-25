// components/webrtc/sections/ConnectionCard.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ICE_COLORS: Record<string, string> = {
  connected:    "text-green-500",
  completed:    "text-green-500",
  failed:       "text-red-500",
  disconnected: "text-yellow-500",
  checking:     "text-blue-500",
};

interface Props {
  loading:        boolean;
  iceStatus:      string;
  cameraReady:    boolean;          // ← added
  onCreateOffer:  () => void;
  onCreateAnswer: () => void;
  onApplyAnswer:  () => void;
  onHangUp:       () => void;
}

export function ConnectionCard({
  loading,
  iceStatus,
  cameraReady,
  onCreateOffer,
  onCreateAnswer,
  onApplyAnswer,
  onHangUp,
}: Props) {
  const isConnected = iceStatus === "connected" || iceStatus === "completed";
  const needsCamera = !cameraReady && !isConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection</span>
          {iceStatus && (
            <span
              className={`text-sm font-mono ${
                ICE_COLORS[iceStatus] ?? "text-muted-foreground"
              }`}
            >
              ICE: {iceStatus}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      {needsCamera && (
        <div className="mx-6 mb-3 rounded-md bg-yellow-50 border border-yellow-300 px-3 py-2 text-sm text-yellow-800">
          ⚠️ Start your camera first, then create an offer or answer.
        </div>
      )}

      <CardContent className="flex gap-2 flex-wrap">
        <Button
          onClick={onCreateOffer}
          disabled={loading || !cameraReady}
          title={!cameraReady ? "Start camera first" : undefined}
        >
          {loading ? "Gathering…" : "Create Offer"}
        </Button>

        <Button
          variant="outline"
          onClick={onCreateAnswer}
          disabled={loading || !cameraReady}
          title={!cameraReady ? "Start camera first" : undefined}
        >
          {loading ? "Gathering…" : "Create Answer"}
        </Button>

        <Button
          variant="secondary"
          onClick={onApplyAnswer}
          disabled={loading}
        >
          Apply Remote Answer
        </Button>

        {isConnected && (
          <Button variant="destructive" onClick={onHangUp}>
            📵 Hang Up
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
