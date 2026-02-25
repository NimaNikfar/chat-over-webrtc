// components/webrtc/hooks/useAdvancedSettings.ts
"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Settings shape ────────────────────────────────────────────────────────────

export interface AdvancedSettings {
  useDefaultStun: boolean;
  customStunList: string[];
  turnUrl:        string;
  turnUser:       string;
  turnCred:       string;
}

const DEFAULTS: AdvancedSettings = {
  useDefaultStun: true,
  customStunList: [],
  turnUrl:        "",
  turnUser:       "",
  turnCred:       "",
};

const STORAGE_KEY = "webrtc-advanced-settings";

// ─── Standalone helper — also used by AdvancedCard for ICE test ───────────────

export function buildIceServers(s: AdvancedSettings): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  if (s.useDefaultStun) {
    servers.push({ urls: "stun:stun.l.google.com:19302" });
  }

  s.customStunList.forEach((url) => {
    if (url.trim()) servers.push({ urls: url.trim() });
  });

  if (s.turnUrl.trim()) {
    servers.push({
      urls:       s.turnUrl.trim(),
      username:   s.turnUser,
      credential: s.turnCred,
    });
  }

  return servers;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdvancedSettings() {
  const [settings,          setSettings]          = useState<AdvancedSettings>(DEFAULTS);
  const [savedIndicator,    setSavedIndicator]    = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AdvancedSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      console.warn("[useAdvancedSettings] failed to load from storage");
    }
  }, []);

  // Generic field updater
  const update = useCallback(
    <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // ── STUN list helpers ──────────────────────────────────────────────────────

  const addStun = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSettings((prev) => ({
      ...prev,
      customStunList: [...prev.customStunList, trimmed],
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Accepts the URL string — matches StunSection's onRemove(url) call
  const removeStun = useCallback((url: string) => {
    setSettings((prev) => ({
      ...prev,
      customStunList: prev.customStunList.filter((u) => u !== url),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // ── Persistence ───────────────────────────────────────────────────────────

  const save = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setHasUnsavedChanges(false);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
      console.log("[useAdvancedSettings] saved:", settings);
    } catch {
      console.warn("[useAdvancedSettings] failed to save");
    }
  }, [settings]);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
    setHasUnsavedChanges(false);
  }, []);

  return {
    settings,
    update,
    addStun,
    removeStun,
    save,
    reset,
    savedIndicator,
    hasUnsavedChanges,
  };
}
