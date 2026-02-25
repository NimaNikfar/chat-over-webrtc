import WebRTCClient from "@/components/webrtc";

export default function WebRTCPage() {
  return (
    <main className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        WebRTC DataChannel Chat
      </h1>
      <WebRTCClient />
    </main>
  );
}