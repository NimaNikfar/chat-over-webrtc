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
  loading: boolean;
  iceStatus: string;
  onCreateOffer: () => void;
  onCreateAnswer: () => void;
  onApplyAnswer: () => void;
}

export function ConnectionCard({
  loading,
  iceStatus,
  onCreateOffer,
  onCreateAnswer,
  onApplyAnswer,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection</span>
          {iceStatus && (
            <span className={`text-sm font-mono ${ICE_COLORS[iceStatus] ?? "text-muted-foreground"}`}>
              ICE: {iceStatus}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 flex-wrap">
        <Button onClick={onCreateOffer} disabled={loading}>
          {loading ? "Gathering…" : "Create Offer"}
        </Button>
        <Button variant="outline" onClick={onCreateAnswer} disabled={loading}>
          {loading ? "Gathering…" : "Create Answer"}
        </Button>
        <Button variant="secondary" onClick={onApplyAnswer} disabled={loading}>
          Apply Remote Answer
        </Button>
      </CardContent>
    </Card>
  );
}
