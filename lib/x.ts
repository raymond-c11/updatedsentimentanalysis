import type { Tweet } from "./types";

const SEARCH_URL = "https://api.x.com/2/tweets/search/recent";

/** Pull up to 100 recent tweets matching the query via the X API v2. */
export async function searchRecentTweets(
  query: string,
  bearerToken: string
): Promise<Tweet[]> {
  const params = new URLSearchParams({
    query,
    max_results: "100",
    "tweet.fields": "created_at,public_metrics",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  const users = new Map<string, any>(
    (json.includes?.users ?? []).map((u: any) => [u.id, u])
  );

  return (json.data ?? []).map((t: any) => {
    const author = users.get(t.author_id);
    return {
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
      likes: t.public_metrics?.like_count,
      retweets: t.public_metrics?.retweet_count,
      authorName: author?.name,
      authorUsername: author?.username,
    };
  });
}
