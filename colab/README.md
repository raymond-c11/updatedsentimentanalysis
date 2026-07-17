# X (Twitter) Sentiment Analyzer

A quick Colab project that pulls tweets about a stock/ticker from the X API, scores their sentiment with VADER, and uses OpenAI to double-check the ambiguous ones — then generates a short summary report.

## What it does

1. Search X for tweets matching a term (e.g. `AAPL`)
2. Score each tweet with VADER (fast, rule-based sentiment)
3. Send the borderline/ambiguous tweets to OpenAI for a second opinion
4. Combine everything into a final sentiment score
5. Ask OpenAI to write a short summary report

## Setup

- Run in Google Colab
- Add your `OPENAI_API_KEY` and X API Bearer Token as Colab secrets
- Set `user_prompt` to whatever you want to search (ticker, company, keyword)
- Run the cells top to bottom

## Requirements

`openai`, `tweepy`, `vaderSentiment`, `pandas`, `scikit-learn`, `matplotlib`, `seaborn`, `tqdm`
