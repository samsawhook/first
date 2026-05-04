import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  return NextResponse.json({
    RESEND_API_KEY: key
      ? `set — length ${key.length}, starts with "${key.slice(0, 6)}…"`
      : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION,
    allEnvKeys: Object.keys(process.env).filter(k =>
      k.startsWith("RESEND") || k.startsWith("VERCEL") || k === "NODE_ENV"
    ),
  });
}
