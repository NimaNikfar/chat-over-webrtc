import { useState, useEffect } from "react";

export interface AdvancedSettings {
  useDefaultStun: boolean;
  customStunList: string[];
  turnUrl: string;
  turnUser: string;
  turnCred: string;
}

const STORAGE_KEY = "webrtc_advanced_settings";

export const DEFAULT_SETTINGS: AdvancedSettings = {
  useDefaultStun: true,
  customStunList: [],
  turnUrl: "",
  turnUser: "",
  turnCred: "",
};

function loadSettings(): AdvancedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AdvancedSettings>;
    return {
      useDefaultStun: parsed.useDefaultStun ?? DEFAULT_SETTINGS.useDefaultStun,
      customStunList: Array.isArray(parsed.customStunList)
        ? parsed.customStunList
        : DEFAULT_SETTINGS.customStunList,
      turnUrl:  parsed.turnUrl  ?? DEFAULT_SETTINGS.turnUrl,
      turnUser: parsed.turnUser ?? DEFAULT_SETTINGS.turnUser,
      turnCred: parsed.turnCred ?? DEFAULT_SETTINGS.turnCred,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function buildIceServers(s: AdvancedSettings): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  if (s.useDefaultStun) {
    servers.push(
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    );
  }

  s.customStunList.forEach((url) => {
    if (url.trim()) servers.push({ urls: url.trim() });
  });

  if (s.turnUrl.trim()) {
    servers.push({
      urls: s.turnUrl.trim(),
      ...(s.turnUser.trim() && { username: s.turnUser.trim() }),
      ...(s.turnCred.trim() && { credential: s.turnCred.trim() }),
    });
  }

  return servers;
}

export function useAdvancedSettings() {
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const addStun = (url: string): string | null => {
    if (!url.trim()) return "Enter a STUN URL first";
    if (!url.startsWith("stun:"))
      return 'STUN URL must start with "stun:" — e.g. stun:myserver.com:3478';
    if (settings.customStunList.includes(url)) return "Already added";
    update("customStunList", [...settings.customStunList, url.trim()]);
    return null;
  };

  const removeStun = (url: string) => {
    update(
      "customStunList",
      settings.customStunList.filter((s) => s !== url)
    );
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    } catch {
      console.warn("Failed to save settings");
    }
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  };

  const savedSettings = loadSettings();
  const hasUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

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
