"use client";

import { useState } from "react";
import { marked } from "marked";
import TopBar from "@/components/TopBar";
import type { AnalyzeResult, AnalyzedTweet, Sentiment } from "@/lib/types";

type Phase = "idle" | "analyzing" | "reporting" | "done";

const TEAM = "By Raymond, Bryce, Gregory, Bennett & Andrew";
const EXAMPLES = ["$AAPL", "$TSLA", "$NVDA", "Bitcoin"];

function verdict(score: number): {
  label: string;
  emoji: string;
  tone: Sentiment;
  blurb: string;
} {
  if (score >= 0.5)
    return {
      label: "Very bullish",
      emoji: "🚀",
      tone: "positive",
      blurb: "People are overwhelmingly optimistic right now.",
    };
  if (score >= 0.15)
    return {
      label: "Bullish",
      emoji: "🐂",
      tone: "positive",
      blurb: "The mood leans clearly positive.",
    };
  if (score <= -0.5)
    return {
      label: "Very bearish",
      emoji: "🚨",
      tone: "negative",
      blurb: "People are overwhelmingly pessimistic right now.",
    };
  if (score <= -0.15)
    return {
      label: "Bearish",
      emoji: "🐻",
      tone: "negative",
      blurb: "The mood leans clearly negative.",
    };
  return {
    label: "Mixed",
    emoji: "⚖️",
    tone: "neutral",
    blurb: "Opinions are split — no clear lean either way.",
  };
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const secs = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function compact(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function PostCard({ post }: { post: AnalyzedTweet }) {
  const initial = (post.authorName ?? post.authorUsername ?? "X")
    .charAt(0)
    .toUpperCase();
  return (
    <a
      className="post"
      href={`https://x.com/i/web/status/${post.id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="post-avatar">{initial}</div>
      <div className="post-main">
        <div className="post-head">
          <span className="post-name">{post.authorName ?? "X user"}</span>
          {post.authorUsername && (
            <span className="post-handle">@{post.authorUsername}</span>
          )}
          {post.createdAt && (
            <span className="post-time">· {timeAgo(post.createdAt)}</span>
          )}
          <span className={`chip ${post.finalLabel}`}>{post.finalLabel}</span>
        </div>
        <p className="post-text">{post.text}</p>
        <div className="post-metrics">
          <span title="Reposts">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
            </svg>
            {compact(post.retweets)}
          </span>
          <span title="Likes">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />
            </svg>
            {compact(post.likes)}
          </span>
          {post.refined && (
            <span className="ai-tag" title="This post was borderline, so our AI judge took a closer look">
              ✦ AI-checked
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const busy = phase === "analyzing" || phase === "reporting";

  async function analyze(term: string) {
    const q = term.trim();
    if (busy || !q) return;
    setQuery(q);
    setError(null);
    setResult(null);
    setReport(null);
    setPhase("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data);

      setPhase("reporting");
      const repRes = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: data.query,
          overallScore: data.overallScore,
          tweets: data.tweets,
        }),
      });
      const repData = await repRes.json();
      if (!repRes.ok)
        throw new Error(repData.error ?? `Report failed (${repRes.status})`);
      setReport(repData.report);
      setPhase("done");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setPhase("idle");
    }
  }

  const total = result
    ? result.counts.positive + result.counts.neutral + result.counts.negative
    : 0;
  const pct = (s: Sentiment) =>
    result && total ? Math.round((result.counts[s] / total) * 100) : 0;
  const v = result ? verdict(result.overallScore) : null;
  const topPosts = result
    ? [...result.tweets].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    : [];

  return (
    <>
      <TopBar active="home" />

      <main>
        <section className="hero">
          <h1>What&apos;s the market feeling today?</h1>
          <p className="team">{TEAM}</p>
          <p className="tagline">
            Type a stock, ticker, or topic. We read the 100 latest posts on X,
            measure the mood, and have an AI analyst sum it all up for you.
          </p>

          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              analyze(query);
            }}
          >
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a stock or topic — try $AAPL"
              aria-label="Stock or topic"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !query.trim()}>
              {phase === "analyzing"
                ? "Reading posts…"
                : phase === "reporting"
                  ? "Writing report…"
                  : "Check the mood"}
            </button>
          </form>

          <div className="examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="example"
                onClick={() => analyze(ex)}
                disabled={busy}
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="error">
            <strong>Hmm, that didn&apos;t work.</strong>
            <span>{error}</span>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="loading card">
            <div className="spinner" />
            <p>
              Reading the latest posts about <strong>{query}</strong> and
              scoring the mood…
            </p>
          </div>
        )}

        {result && v && (
          <section className="results">
            <div className="card verdict">
              <div className="verdict-emoji">{v.emoji}</div>
              <div className="verdict-body">
                <span className="verdict-eyebrow">
                  The mood on <strong>{result.query}</strong>
                </span>
                <span className={`verdict-label ${v.tone}`}>{v.label}</span>
                <span className="verdict-blurb">{v.blurb}</span>
              </div>
              <div className="verdict-score">
                <span className={`score ${v.tone}`}>
                  {result.overallScore >= 0 ? "+" : ""}
                  {result.overallScore.toFixed(2)}
                </span>
                <span className="score-scale">mood score, −1 to +1</span>
              </div>
            </div>

            <div className="card">
              <h2>How the posts break down</h2>
              <div className="stacked-bar">
                <div
                  className="seg positive"
                  style={{ width: `${pct("positive")}%` }}
                />
                <div
                  className="seg neutral"
                  style={{ width: `${pct("neutral")}%` }}
                />
                <div
                  className="seg negative"
                  style={{ width: `${pct("negative")}%` }}
                />
              </div>
              <div className="legend">
                <span>
                  <i className="dot positive" /> {pct("positive")}% positive
                </span>
                <span>
                  <i className="dot neutral" /> {pct("neutral")}% neutral
                </span>
                <span>
                  <i className="dot negative" /> {pct("negative")}% negative
                </span>
              </div>
              <p className="fineprint">
                Based on {total} recent posts · {result.refinedCount} borderline
                posts double-checked by AI
              </p>
            </div>

            <div className="card">
              <h2>✦ The analyst&apos;s take</h2>
              {report ? (
                <div
                  className="report"
                  dangerouslySetInnerHTML={{ __html: marked.parse(report) }}
                />
              ) : phase === "reporting" ? (
                <div className="skeleton">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              ) : (
                <p className="fineprint">The report didn&apos;t come through.</p>
              )}
            </div>

            <div className="card posts-card">
              <h2>What people are saying</h2>
              <p className="fineprint">Sorted by likes · tap a post to open it on X</p>
              <div className="posts">
                {topPosts.map((t) => (
                  <PostCard key={t.id} post={t} />
                ))}
              </div>
            </div>
          </section>
        )}

        <footer>
          <span>
            MarketMood · {TEAM.replace("By", "Built by")} · Not financial advice
          </span>
        </footer>
      </main>
    </>
  );
}
