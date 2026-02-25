// components/webrtc/hooks/useMediaStream.ts
"use client";

import { useCallback, useRef, useState } from "react";

export type VideoState = "idle" | "requesting" | "active" | "error";

export interface MediaStreamHook {
  localStream:   MediaStream | null;
  videoState:    VideoState;
  audioEnabled:  boolean;
  videoEnabled:  boolean;
  startLocalMedia: () => Promise<void>;
  stopLocalMedia:  () => void;
  toggleAudio:   () => void;
  toggleVideo:   () => void;
}

export function useMediaStream(): MediaStreamHook {
  const streamRef                       = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [videoState,  setVideoState]    = useState<VideoState>("idle");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const startLocalMedia = useCallback(async () => {
    console.log("[useMediaStream] startLocalMedia called");
    setVideoState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log(
        "[useMediaStream] ✅ got stream id=", stream.id,
        "tracks=", stream.getTracks().map(t =>
          `${t.kind}(id=${t.id},enabled=${t.enabled},readyState=${t.readyState})`
        )
      );
      streamRef.current = stream;
      setLocalStream(stream);
      setVideoState("active");
      setAudioEnabled(true);
      setVideoEnabled(true);
    } catch (err) {
      console.error("[useMediaStream] ❌ getUserMedia failed:", err);
      setVideoState("error");
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    console.log("[useMediaStream] stopLocalMedia called");
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
      console.log("[useMediaStream] stopped track:", t.kind, t.id);
    });
    streamRef.current = null;
    setLocalStream(null);
    setVideoState("idle");
  }, []);

  const toggleAudio = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      console.log("[useMediaStream] audio track enabled=", t.enabled);
    });
    setAudioEnabled((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      console.log("[useMediaStream] video track enabled=", t.enabled);
    });
    setVideoEnabled((prev) => !prev);
  }, []);

  return {
    localStream,
    videoState,
    audioEnabled,
    videoEnabled,
    startLocalMedia,
    stopLocalMedia,
    toggleAudio,
    toggleVideo,
  };
}
