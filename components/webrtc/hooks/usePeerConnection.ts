import { useRef, useState } from "react";
import { AdvancedSettings, buildIceServers } from "./useAdvancedSettings";

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(resolve, 6000);
  });
}

export function usePeerConnection() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const [localSdp, setLocalSdp]   = useState("");
  const [iceStatus, setIceStatus] = useState("");
  const [channelOpen, setChannelOpen] = useState(false);
  const [chatLog, setChatLog]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);

  const createPc = (settings: AdvancedSettings): RTCPeerConnection => {
    peerRef.current?.close();
    setChannelOpen(false);
    setIceStatus("");

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(settings),
      iceCandidatePoolSize: 10,
    });

    pc.addEventListener("iceconnectionstatechange", () => {
      setIceStatus(pc.iceConnectionState);
      if (pc.iceConnectionState === "failed")
        console.error("ICE failed — check TURN credentials or network.");
    });

    pc.addEventListener("icegatheringstatechange", () =>
      console.log("[Gathering]", pc.iceGatheringState)
    );

    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate)
        console.log("[Candidate]", e.candidate.type, e.candidate.candidate);
    });

    peerRef.current = pc;
    return pc;
  };

  const setupChannel = (dc: RTCDataChannel) => {
    dataChannelRef.current = dc;
    dc.onopen    = () => { setChannelOpen(true); setIceStatus("connected"); };
    dc.onclose   = () => setChannelOpen(false);
    dc.onmessage = (e) => setChatLog((log) => [...log, `Peer: ${e.data}`]);
  };

  const createOffer = async (settings: AdvancedSettings) => {
    setLoading(true);
    try {
      const pc = createPc(settings);
      setupChannel(pc.createDataChannel("chat"));
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIceGathering(pc);
      setLocalSdp(JSON.stringify(pc.localDescription, null, 2));
    } catch (err) {
      console.error("createOffer:", err);
      alert("Failed to create offer. See console.");
    } finally {
      setLoading(false);
    }
  };

  const createAnswer = async (settings: AdvancedSettings, remoteSdp: string) => {
    if (!remoteSdp.trim()) return alert("Paste remote SDP first");
    setLoading(true);
    try {
      const pc = createPc(settings);
      pc.ondatachannel = (e) => setupChannel(e.channel);
      await pc.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(remoteSdp))
      );
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIceGathering(pc);
      setLocalSdp(JSON.stringify(pc.localDescription, null, 2));
    } catch (err) {
      console.error("createAnswer:", err);
      alert("Failed to create answer. See console.");
    } finally {
      setLoading(false);
    }
  };

  const applyRemoteAnswer = async (remoteSdp: string) => {
    if (!peerRef.current) return alert("Create an offer first");
    if (!remoteSdp.trim()) return alert("Paste remote SDP first");
    try {
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(remoteSdp))
      );
    } catch (err) {
      console.error("applyRemoteAnswer:", err);
      alert("Invalid SDP. See console.");
    }
  };

  const sendMessage = (message: string) => {
    if (!dataChannelRef.current || !message.trim()) return false;
    dataChannelRef.current.send(message);
    setChatLog((log) => [...log, `You: ${message}`]);
    return true;
  };

  return {
    localSdp,
    iceStatus,
    channelOpen,
    chatLog,
    loading,
    createOffer,
    createAnswer,
    applyRemoteAnswer,
    sendMessage,
  };
}
