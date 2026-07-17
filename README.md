# MarketMood

By Raymond, Bryce, Gregory, Bennett & Andrew.

A Next.js app that reads the mood of X (Twitter) for any stock, ticker, or
topic — with an X-style interface and an AI analyst report. Refactored from
the original Colab notebook (kept in [`colab/`](colab/)).

## How it works

1. **Fetch** — pulls up to 100 recent tweets matching the search term via the
   X API v2 (`/2/tweets/search/recent`).
2. **VADER pass** — every tweet gets a VADER compound score and an initial
   label (`>= 0.05` positive, `<= -0.05` negative, else neutral).
3. **OpenAI pass** — tweets whose scores fall in the ambiguous bands
   (`[-0.65, -0.35]` or `[0.35, 0.65]`) are re-judged by an OpenAI model
   (default `gpt-5.4-nano`) in batches of 25.
4. **Score** — labels are encoded (-1 / 0 / +1) and averaged into an overall
   sentiment score.
5. **Report** — a random sample of 20 tweets plus the overall score is sent to
   the model to generate a client-facing analyst report.

## API keys

The server reads its keys from environment variables — visitors are never
asked for keys:

| Env var | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API key used for classification and reports |
| `X_BEARER_TOKEN` | X API v2 bearer token used for tweet search |

For local dev, put them in `.env.local`. On Vercel, add them under
Project → Settings → Environment Variables.

Note: the X search endpoint requires a paid API tier (Basic or above).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or import the GitHub repo at [vercel.com/new](https://vercel.com/new) — no
special configuration needed. Optionally add `OPENAI_API_KEY` and
`X_BEARER_TOKEN` as environment variables in the Vercel project settings.

API routes set `maxDuration = 60`; the analysis of 100 tweets typically
finishes well within that.
