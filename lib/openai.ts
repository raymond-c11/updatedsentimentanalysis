import type { AnalyzedTweet, Sentiment, Tweet } from "./types";

export const DEFAULT_MODEL = "gpt-5.4-nano";
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 5000;
export const BATCH_SIZE = 25;

const VALID_LABELS = new Set<string>(["positive", "neutral", "negative"]);

function classifyPrompt(n: number): string {
  return `### PROMPT
You are an expert financial sentiment analyst and judge for tweets about markets, stocks, macro, and companies.

## TASK
Given a tweet, classify its overall sentiment as **Positive**, **Neutral**, or **Negative**.

## LABEL DEFINITIONS
- **Positive** (bullish/favourable): The tweet expresses optimism or expectation of gains or improvement.
  - Examples: "$AAPL beats earnings and guidance is strong," "rates will fall," "buying opportunity," "bullish on oil," "upgrade incoming," "revenue growth strong."
- **Negative** (bearish/unfavourable): The tweet expresses pessimism or expectation of losses/deterioration.
  - Examples: "$TSLA misses earnings badly," "downgraded," "guidance cut," "rates will rise," "bear case," "sell/off," "weak demand," "bank stress concerns."
- **Neutral** (mixed/unclear/mostly informational): The tweet is descriptive without clear positive/negative tilt, or sentiment is ambiguous/mixed, or it asks a question without asserting a view.
  - Examples: "Earnings date is tomorrow," "Here are the numbers," "What do you think about $MSFT?" "Up 1% on the day but volatile," "Management said X (no clear bullish/bearish stance)."

## JUDGMENT RULES
- If the tweet contains both positive and negative cues, choose **Neutral** unless one side clearly dominates.
- If it's mostly factual/announcements or a question, choose **Neutral**.
- Ignore emojis/formatting unless they clearly indicate sentiment.

## OUTPUT FORMAT
Respond with **exactly one lowercase label** per tweet:
- \`positive\`
- \`neutral\`
- \`negative\`

Your answer should be formatted like so:
"[positive, neutral, negative, ...]"
Each entry corresponds to one tweet given to you, in order.
You will be given ${n} tweets. Your response must also have ${n} labels.
Your input will be formatted like so:
"### TWEET_START ###\\nTweet ID: (tweet ID)\\nTweet Text: (tweet text)\\n### TWEET_END ###"

Importantly, do NOT provide any explanation, preamble, or extra text besides the format examples that was explicitly given to you. DO NOT include any text other than the list.`;
}

function reportPrompt(topic: string, overallScore: number): string {
  return `### PROMPT
You are an expert financial sentiment analyst and judge for tweets about markets, stocks, macro, and companies.

## TASK
Given a sample of recent tweets used for sentiment analysis and the overall sentiment score, analyze the sentiment, opinions, and stock.

The overall sentiment score is an average of the sentiments of every tweet, on a scale from -1 to 1. Anything below -0.5 is considered negative, and anything above 0.5 is considered positive. Anything between those two values is considered neutral.
Make sure to take into account how much the overall sentiment leans positive or negative.

## OUTPUT FORMAT
Respond with a detailed, nuanced, complex, and concise report. You should have 5 sections: Background Information, Overview of Sentiment, Public Opinions, Analysis, and Recommendation.

As an expert financial analyst, your report is client-facing, and should be digestible and formal. You should not include any behind-the-scenes information or discuss the sentiment classification definitions or methodology. You are writing a formal, approachable, standard report. The report must start with a formal title, include an introduction, and conclude with a summary statement. Do not include any of your thought process or any meta-commentary about the task.

Your report should be mainly written in paragraphs, not bullet-points, as this is a formal, respectable, client-facing report. You should not mention that the report is client-facing as you are completely an expert financial analyst.

## INFORMATION
The topic the user wants to know about is: ${topic}
The overall sentiment analysis is: ${overallScore}
Here is a sample of the tweets pulled for sentiment analysis:
`;
}

/**
 * Call the OpenAI Responses API and return the concatenated output text
 * (equivalent of the SDK's response.output_text convenience property).
 */
async function callResponses(
  apiKey: string,
  model: string,
  input: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_LIMIT; attempt++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input }),
    });

    if (res.ok) {
      const json = await res.json();
      const parts: string[] = [];
      for (const item of json.output ?? []) {
        if (item.type !== "message") continue;
        for (const c of item.content ?? []) {
          if (c.type === "output_text") parts.push(c.text);
        }
      }
      return parts.join("");
    }

    const body = await res.text();
    lastError = new Error(`OpenAI API error ${res.status}: ${body.slice(0, 500)}`);
    // Retry rate limits and transient server errors; fail fast on the rest.
    if (res.status !== 429 && res.status < 500) throw lastError;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
  }

  throw lastError ?? new Error("OpenAI API call failed");
}

/**
 * Judge one batch of tweets. Returns one label per tweet; falls back to
 * null (keep the VADER label) when the response can't be parsed.
 */
async function classifyBatch(
  apiKey: string,
  model: string,
  tweets: Tweet[]
): Promise<(Sentiment | null)[]> {
  const body = tweets
    .map(
      (t, i) =>
        `### TWEET_START ###\nTweet ID: ${i + 1}\nTweet Text: ${t.text}\n### TWEET_END ###`
    )
    .join("\n");

  try {
    const raw = await callResponses(
      apiKey,
      model,
      classifyPrompt(tweets.length) + "\n" + body
    );
    const words = (raw.match(/[a-zA-Z]+/g) ?? []).map((w) => w.toLowerCase());
    const labels = words.filter((w) => VALID_LABELS.has(w));
    if (labels.length === tweets.length) return labels as Sentiment[];
    console.warn(
      `Batch label count mismatch: expected ${tweets.length}, got ${labels.length}`
    );
  } catch (e) {
    console.warn("Batch classification failed:", e);
  }
  return tweets.map(() => null);
}

/** Judge all ambiguous tweets in batches of BATCH_SIZE. */
export async function classifyAmbiguous(
  apiKey: string,
  model: string,
  tweets: Tweet[]
): Promise<(Sentiment | null)[]> {
  const results: (Sentiment | null)[] = [];
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    const batch = tweets.slice(i, i + BATCH_SIZE);
    results.push(...(await classifyBatch(apiKey, model, batch)));
  }
  return results;
}

/** Generate the client-facing markdown report from a sample of analyzed tweets. */
export async function generateReport(
  apiKey: string,
  model: string,
  topic: string,
  overallScore: number,
  sample: AnalyzedTweet[]
): Promise<string> {
  const table = sample
    .map((t) => `- [${t.finalLabel}] (vader ${t.vaderScore.toFixed(3)}) ${t.text}`)
    .join("\n");
  return callResponses(apiKey, model, reportPrompt(topic, overallScore) + table);
}
