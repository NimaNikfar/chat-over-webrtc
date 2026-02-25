import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  useDefaultStun: boolean;
  customStunList: string[];
  onToggleDefault: (val: boolean) => void;
  onAdd: (url: string) => string | null;
  onRemove: (url: string) => void;
}

export function StunSection({
  useDefaultStun,
  customStunList,
  onToggleDefault,
  onAdd,
  onRemove,
}: Props) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const error = onAdd(input.trim());
    if (error) return alert(error);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground">STUN Servers</p>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={useDefaultStun}
          onChange={(e) => onToggleDefault(e.target.checked)}
          className="w-4 h-4"
        />
        Use default Google STUN servers
      </label>

      <div className="flex gap-2">
        <Input
          placeholder="stun:yourserver.com:3478"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="outline" onClick={handleAdd}>
          Add
        </Button>
      </div>

      {customStunList.length > 0 && (
        <div className="space-y-1">
          {customStunList.map((url) => (
            <div
              key={url}
              className="flex items-center justify-between bg-muted rounded px-3 py-1 text-sm font-mono"
            >
              <span>{url}</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 h-6 px-2"
                onClick={() => onRemove(url)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}

      {!useDefaultStun && customStunList.length === 0 && (
        <p className="text-xs text-red-500">
          ⚠️ No STUN servers active. Add a custom one or enable default.
        </p>
      )}
    </div>
  );
}
