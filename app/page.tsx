import WebRTCClient from "@/components/webrtc";

interface PageProps {
  searchParams: Promise<{ session?: string }>;
}

export default async function WebRTCPage({ searchParams }: PageProps) {
  const { session } = await searchParams;
  return (
    <main className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WebRTC Chat</h1>
      <WebRTCClient autoJoinSessionId={session ?? null} />
    </main>
  );
}
