import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Props {
  chatLog:     string[];
  channelOpen: boolean;
  onSend:      (message: string) => void;   // ← was "boolean", now "void"
}

export function ChatCard({ chatLog, channelOpen, onSend }: Props) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;   // guard replaces the old boolean check
    onSend(message);
    setMessage("");                // always clear after sending
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Chat {channelOpen ? "✅ Connected" : "⏳ Waiting"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded p-2 h-40 overflow-y-auto text-sm">
          {chatLog.length === 0 ? (
            <div className="text-muted-foreground">No messages yet</div>
          ) : (
            chatLog.map((msg, i) => <div key={i}>{msg}</div>)
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Type message..."
            value={message}
            disabled={!channelOpen}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button disabled={!channelOpen} onClick={handleSend}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
