import { NextResponse } from "next/server";
import { searchRecentTweets } from "@/lib/x";
import {
  classifyCompound,
  isAmbiguous,
  vaderCompound,
  SENTIMENT_ENCODING,
} from "@/lib/sentiment";
import { classifyAmbiguous, DEFAULT_MODEL } from "@/lib/openai";
import type { AnalyzedTweet, AnalyzeResult, Sentiment } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = String(payload.query ?? "").trim();
  const openaiKey = process.env.OPENAI_API_KEY;
  const bearerToken = process.env.X_BEARER_TOKEN;
  const model = String(payload.model ?? "") || DEFAULT_MODEL;

  if (!query) {
    return NextResponse.json(
      { error: "Enter a search term (e.g. AAPL)." },
      { status: 400 }
    );
  }
  if (!bearerToken || !openaiKey) {
    return NextResponse.json(
      {
        error:
          "Server is not configured: set the OPENAI_API_KEY and X_BEARER_TOKEN environment variables.",
      },
      { status: 500 }
    );
  }

  let tweets;
  try {
    tweets = await searchRecentTweets(query, bearerToken);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch tweets." },
      { status: 502 }
    );
  }

  if (tweets.length === 0) {
    return NextResponse.json(
      { error: `No recent tweets found for "${query}".` },
      { status: 404 }
    );
  }

  // Pass 1: VADER on everything.
  const analyzed: AnalyzedTweet[] = tweets.map((t) => {
    const score = vaderCompound(t.text);
    const label = classifyCompound(score);
    return {
      ...t,
      vaderScore: score,
      vaderLabel: label,
      refined: false,
      finalLabel: label,
    };
  });

  // Pass 2: OpenAI re-judges the tweets VADER was uncertain about.
  const ambiguousIdx = analyzed
    .map((t, i) => (isAmbiguous(t.vaderScore) ? i : -1))
    .filter((i) => i >= 0);

  if (ambiguousIdx.length > 0) {
    try {
      const labels = await classifyAmbiguous(
        openaiKey,
        model,
        ambiguousIdx.map((i) => analyzed[i])
      );
      labels.forEach((label, j) => {
        if (label) {
          const t = analyzed[ambiguousIdx[j]];
          t.finalLabel = label;
          t.refined = true;
        }
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "OpenAI classification failed." },
        { status: 502 }
      );
    }
  }

  const counts: Record<Sentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  let sum = 0;
  for (const t of analyzed) {
    counts[t.finalLabel]++;
    sum += SENTIMENT_ENCODING[t.finalLabel];
  }

  const result: AnalyzeResult = {
    query,
    tweets: analyzed,
    counts,
    refinedCount: analyzed.filter((t) => t.refined).length,
    overallScore: sum / analyzed.length,
  };

  return NextResponse.json(result);
}
