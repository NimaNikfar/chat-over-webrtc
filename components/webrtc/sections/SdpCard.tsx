import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  localSdp: string;
  remoteSdp: string;
  onRemoteSdpChange: (val: string) => void;
}

export function SdpCard({ localSdp, remoteSdp, onRemoteSdpChange }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(localSdp);
      } else {
        const t = document.createElement("textarea");
        t.value = localSdp;
        t.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Copy failed. Please copy manually.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SDP JSON</CardTitle>
        <Button size="sm" variant="outline" onClick={copy} disabled={!localSdp}>
          {copied ? "Copied ✅" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          readOnly
          value={localSdp}
          rows={6}
          className="font-mono text-xs"
          placeholder="Your SDP will appear here after gathering completes…"
        />
        <Textarea
          value={remoteSdp}
          onChange={(e) => onRemoteSdpChange(e.target.value)}
          rows={6}
          className="font-mono text-xs"
          placeholder="Paste remote SDP here"
        />
      </CardContent>
    </Card>
  );
}
