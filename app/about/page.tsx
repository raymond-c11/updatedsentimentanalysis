import type { Metadata } from "next";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "How it works — MarketMood",
  description:
    "How MarketMood reads X sentiment: VADER scoring, an OpenAI second pass on ambiguous posts, and an AI analyst report.",
};

const TEAM = ["Raymond", "Bryce", "Gregory", "Bennett", "Andrew"];

const STEPS = [
  {
    title: "Fetch",
    body: (
      <>
        We pull up to 100 recent posts matching your search term from the X
        API v2 <code>/2/tweets/search/recent</code> endpoint.
      </>
    ),
  },
  {
    title: "Score every post with VADER",
    body: (
      <>
        Each post gets a VADER compound sentiment score. Scores ≥ 0.05 are
        labeled positive, ≤ −0.05 negative, and everything in between neutral.
      </>
    ),
  },
  {
    title: "Send the borderline cases to an AI judge",
    body: (
      <>
        Posts VADER is unsure about — scores between −0.65 and −0.35, or
        between 0.35 and 0.65 — get a second look from an OpenAI model,
        re-judged in batches of 25.
      </>
    ),
  },
  {
    title: "Average it into one score",
    body: (
      <>
        Final labels are encoded as −1, 0, or +1 and averaged into a single
        mood score from −1 (very bearish) to +1 (very bullish).
      </>
    ),
  },
  {
    title: "Write the analyst report",
    body: (
      <>
        A random sample of 20 posts, plus the overall score, is handed to the
        model to generate a plain-language, client-facing summary.
      </>
    ),
  },
];

export default function About() {
  return (
    <>
      <TopBar active="about" />

      <main>
        <section className="about-hero">
          <h1>How MarketMood reads the room</h1>
          <p>
            MarketMood turns a flood of posts on X into one clear read on
            market mood — a fast sentiment score plus a written summary,
            built on a two-stage scoring pipeline rather than a single model
            call.
          </p>
        </section>

        <section className="results" style={{ marginTop: 0 }}>
          <div className="card">
            <h2>The pipeline</h2>
            <div className="steps">
              {STEPS.map((s, i) => (
                <div className="step" key={s.title}>
                  <div className="step-index">{i + 1}</div>
                  <div className="step-body">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Why two scoring passes?</h2>
            <p className="fineprint" style={{ fontSize: "0.95rem" }}>
              VADER is fast and free, and it gets the clear-cut cases —
              obviously excited or obviously angry posts — right most of the
              time. But sarcasm, finance slang, and mixed-emotion posts often
              land in an ambiguous middle zone. Rather than trust VADER
              blindly or send every single post to a language model
              (slow and expensive), MarketMood only escalates the genuinely
              uncertain ones. That keeps results both fast and more accurate
              than either method alone.
            </p>
          </div>

          <div className="card">
            <h2>Reading the score</h2>
            <div className="about-grid">
              <div>
                <span className="chip negative" style={{ marginLeft: 0 }}>
                  bearish
                </span>
                <p className="fineprint">−1.0 to −0.15 · mood leans negative</p>
              </div>
              <div>
                <span className="chip neutral" style={{ marginLeft: 0 }}>
                  mixed
                </span>
                <p className="fineprint">−0.15 to 0.15 · no clear lean</p>
              </div>
              <div>
                <span className="chip positive" style={{ marginLeft: 0 }}>
                  bullish
                </span>
                <p className="fineprint">0.15 to 1.0 · mood leans positive</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Built by</h2>
            <p className="fineprint" style={{ marginTop: 0, marginBottom: 12 }}>
              Refactored from an original Colab notebook into this app.
            </p>
            <div className="team-list">
              {TEAM.map((name) => (
                <span className="team-pill" key={name}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <footer>
          <span>MarketMood · Not financial advice</span>
        </footer>
      </main>
    </>
  );
}
