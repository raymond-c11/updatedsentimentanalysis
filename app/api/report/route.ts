import { NextResponse } from "next/server";
import { generateReport, DEFAULT_MODEL } from "@/lib/openai";
import type { AnalyzedTweet } from "@/lib/types";

export const maxDuration = 60;

const SAMPLE_SIZE = 20;

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = String(payload.query ?? "").trim();
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = String(payload.model ?? "") || DEFAULT_MODEL;
  const overallScore = Number(payload.overallScore);
  const tweets: AnalyzedTweet[] = Array.isArray(payload.tweets)
    ? payload.tweets
    : [];

  if (!query || !Number.isFinite(overallScore) || tweets.length === 0) {
    return NextResponse.json(
      { error: "Missing query, overallScore, or tweets." },
      { status: 400 }
    );
  }
  if (!openaiKey) {
    return NextResponse.json(
      {
        error:
          "Server is not configured: set the OPENAI_API_KEY environment variable.",
      },
      { status: 500 }
    );
  }

  // Random sample of up to SAMPLE_SIZE tweets, without replacement.
  const sample = [...tweets]
    .sort(() => Math.random() - 0.5)
    .slice(0, SAMPLE_SIZE);

  try {
    const report = await generateReport(
      openaiKey,
      model,
      query,
      overallScore,
      sample
    );
    return NextResponse.json({ report });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Report generation failed." },
      { status: 502 }
    );
  }
}
