import { Input } from "@/components/ui/input";

interface Props {
  turnUrl: string;
  turnUser: string;
  turnCred: string;
  onChange: (field: "turnUrl" | "turnUser" | "turnCred", value: string) => void;
}

export function TurnSection({ turnUrl, turnUser, turnCred, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground">
        TURN Server (optional)
      </p>
      <p className="text-xs text-muted-foreground">
        Required when both peers are behind strict NAT/firewalls.
      </p>
      <div className="flex flex-col gap-2">
        <Input
          placeholder="turn:yourturnserver.com:3478"
          value={turnUrl}
          onChange={(e) => onChange("turnUrl", e.target.value)}
        />
        <Input
          placeholder="Username (if required)"
          value={turnUser}
          onChange={(e) => onChange("turnUser", e.target.value)}
        />
        <Input
          placeholder="Credential / Password (if required)"
          type="password"
          value={turnCred}
          onChange={(e) => onChange("turnCred", e.target.value)}
        />
      </div>
    </div>
  );
}
