import { SentimentIntensityAnalyzer } from "vader-sentiment";
import type { Sentiment } from "./types";

export function vaderCompound(text: string): number {
  return SentimentIntensityAnalyzer.polarity_scores(text).compound;
}

/** Standard VADER thresholds: >= 0.05 positive, <= -0.05 negative, else neutral. */
export function classifyCompound(score: number): Sentiment {
  if (score >= 0.05) return "positive";
  if (score <= -0.05) return "negative";
  return "neutral";
}

/**
 * A tweet is ambiguous when its compound score sits near the
 * negative/neutral or positive/neutral borders; those are re-judged
 * by the OpenAI model.
 */
export function isAmbiguous(score: number): boolean {
  return (score >= -0.65 && score <= -0.35) || (score >= 0.35 && score <= 0.65);
}

export const SENTIMENT_ENCODING: Record<Sentiment, number> = {
  negative: -1,
  neutral: 0,
  positive: 1,
};
