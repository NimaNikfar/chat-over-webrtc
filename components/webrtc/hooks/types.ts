// components/webrtc/hooks/types.ts

export interface AdvancedSettings {
  stunEnabled:    boolean;
  stunUrl:        string;
  turnEnabled:    boolean;
  turnUrl:        string;
  turnUsername:   string;
  turnCredential: string;
}
