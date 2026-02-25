import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StunSection } from "../advanced/StunSection";
import { TurnSection } from "../advanced/TurnSection";
import { buildIceServers, useAdvancedSettings } from "../hooks/useAdvancedSettings";

export function AdvancedCard({
  settingsHook,
}: {
  settingsHook: ReturnType<typeof useAdvancedSettings>;
}) {
  const [open, setOpen] = useState(false);
  const { settings, update, addStun, removeStun, save, reset, savedIndicator, hasUnsavedChanges } =
    settingsHook;

  const testIceServers = async () => {
    const iceServers = buildIceServers(settings);
    if (iceServers.length === 0) return alert("No ICE servers configured");

    const testPc = new RTCPeerConnection({ iceServers });
    const candidates: string[] = [];
    testPc.createDataChannel("test");
    await testPc.setLocalDescription(await testPc.createOffer());

    await new Promise<void>((resolve) => {
      testPc.onicecandidate = (e) => {
        if (e.candidate) candidates.push(`${e.candidate.type}: ${e.candidate.candidate}`);
      };
      testPc.onicegatheringstatechange = () => {
        if (testPc.iceGatheringState === "complete") resolve();
      };
      setTimeout(resolve, 6000);
    });

    testPc.close();

    const has = (type: string) => candidates.some((c) => c.startsWith(type));
    alert(
      [
        has("host")  ? "✅ host candidates found"            : "❌ No host candidates",
        has("srflx") ? "✅ srflx (STUN) candidates found"   : "⚠️ No srflx — STUN may not be reachable",
        has("relay") ? "✅ relay (TURN) candidates found"    : settings.turnUrl ? "❌ No relay — TURN credentials may be wrong" : "ℹ️ No TURN configured",
        "",
        "--- Full candidate list ---",
        ...candidates,
      ].join("\n")
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Advanced Options</span>
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-500 font-normal">● unsaved</span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide ▲" : "Show ▼"}
          </Button>
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5">
          <StunSection
            useDefaultStun={settings.useDefaultStun}
            customStunList={settings.customStunList}
            onToggleDefault={(val) => update("useDefaultStun", val)}
            onAdd={addStun}
            onRemove={removeStun}
          />

          <hr />

          <TurnSection
            turnUrl={settings.turnUrl}
            turnUser={settings.turnUser}
            turnCred={settings.turnCred}
            onChange={(field, value) => update(field, value)}
          />

          <hr />

          <Button variant="outline" className="w-full" onClick={testIceServers}>
            🧪 Test ICE Servers
          </Button>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={!hasUnsavedChanges}>
              {savedIndicator ? "Saved ✅" : "💾 Save Settings"}
            </Button>
            <Button
              variant="outline"
              className="text-red-500 hover:text-red-600"
              onClick={() => { if (confirm("Reset all advanced settings to defaults?")) reset(); }}
            >
              Reset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Settings saved to browser local storage. Click{" "}
            <span className="font-semibold">Create Offer</span> or{" "}
            <span className="font-semibold">Create Answer</span> to apply after changes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
