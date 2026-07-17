export type Sentiment = "positive" | "neutral" | "negative";

export interface Tweet {
  id: string;
  text: string;
  createdAt?: string;
  likes?: number;
  retweets?: number;
  authorName?: string;
  authorUsername?: string;
}

export interface AnalyzedTweet extends Tweet {
  vaderScore: number;
  vaderLabel: Sentiment;
  /** true when the tweet was ambiguous for VADER and re-judged by OpenAI */
  refined: boolean;
  finalLabel: Sentiment;
}

export interface AnalyzeResult {
  query: string;
  tweets: AnalyzedTweet[];
  counts: Record<Sentiment, number>;
  refinedCount: number;
  /** mean of encoded sentiments (-1 negative, 0 neutral, +1 positive) */
  overallScore: number;
}
