// components/webrtc/sections/VideoCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaStreamHook, VideoState } from "../hooks/useMediaStream";

// ── Single video box ────────────────────────────────────────────────────
function VideoBox({
  stream,
  muted = false,
  label,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;

    console.log(`[VideoBox][${label}] stream changed →`, stream
      ? `id=${stream.id} tracks=${stream.getTracks().map(t =>
          `${t.kind}(enabled=${t.enabled},muted=${t.muted},readyState=${t.readyState})`
        ).join(", ")}`
      : "null"
    );

    if (!el) {
      console.warn(`[VideoBox][${label}] video element ref is null`);
      return;
    }

    if (el.srcObject !== stream) {
      console.log(`[VideoBox][${label}] assigning srcObject`);
      el.srcObject = stream;

      if (stream) {
        el.onloadedmetadata = () => {
          console.log(`[VideoBox][${label}] ✅ loadedmetadata fired — playing`);
          el.play().catch((err) =>
            console.error(`[VideoBox][${label}] play() failed:`, err)
          );
        };
        el.oncanplay = () =>
          console.log(`[VideoBox][${label}] canplay fired`);
        el.onerror = (e) =>
          console.error(`[VideoBox][${label}] video error:`, e);
      }
    } else {
      console.log(`[VideoBox][${label}] srcObject unchanged, skipping`);
    }
  }, [stream, label]);

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-zinc-500 text-sm">No stream</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
        {label}
      </span>
    </div>
  );
}

// ── Badge color helper ──────────────────────────────────────────────────
const badgeVariant = (
  s: VideoState
): "default" | "secondary" | "destructive" => {
  if (s === "active")   return "default";
  if (s === "error")    return "destructive";
  return "secondary";
};

// ── VideoCard ───────────────────────────────────────────────────────────
interface Props {
  mediaHook:    MediaStreamHook;
  remoteStream: MediaStream | null;
}

export function VideoCard({ mediaHook, remoteStream }: Props) {
  const {
    localStream,
    videoState,
    audioEnabled,
    videoEnabled,
    startLocalMedia,
    stopLocalMedia,
    toggleAudio,
    toggleVideo,
  } = mediaHook;

  // Log every time remoteStream prop changes
  useEffect(() => {
    console.log("[VideoCard] remoteStream prop changed →",
      remoteStream
        ? `id=${remoteStream.id} tracks=${remoteStream.getTracks().length}`
        : "null"
    );
  }, [remoteStream]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Video Call</CardTitle>
        <Badge variant={badgeVariant(videoState)}>
          {videoState === "requesting" ? "Requesting…" : videoState}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <VideoBox stream={localStream}  muted label="You"    />
          <VideoBox stream={remoteStream}       label="Remote" />
        </div>

        <div className="flex flex-wrap gap-2">
          {videoState === "idle" || videoState === "error" ? (
            <Button onClick={startLocalMedia}>
              📷 Start Camera
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopLocalMedia}>
              ✕ Stop Camera
            </Button>
          )}

          <Button
            variant="outline"
            onClick={toggleAudio}
            disabled={!localStream}
            className={audioEnabled ? "" : "opacity-50 line-through"}
          >
            {audioEnabled ? "🎙 Mute" : "🔇 Unmute"}
          </Button>

          <Button
            variant="outline"
            onClick={toggleVideo}
            disabled={!localStream}
            className={videoEnabled ? "" : "opacity-50"}
          >
            {videoEnabled ? "📹 Hide Video" : "🚫 Show Video"}
          </Button>
        </div>

        {videoState === "error" && (
          <p className="text-sm text-red-500">
            Camera/mic access denied — check browser permissions and reload.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
