import { NextResponse } from "next/server";
import { getMusicProvider, getProviderMode } from "@/lib/providers";

export async function GET() {
  const provider = getMusicProvider();
  return NextResponse.json({
    mode: getProviderMode(),
    providerId: provider.id,
    capabilities: provider.capabilities,
    keys: {
      stability: Boolean(process.env.STABILITY_API_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    },
  });
}
