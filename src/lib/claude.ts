import Anthropic from '@anthropic-ai/sdk';
import type { ShowWithTags } from '@/types';

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export async function generateShowSummary(
  title: string,
  overview: string,
  type: 'movie' | 'tv'
): Promise<string> {
  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Based on this ${type === 'tv' ? 'TV show' : 'movie'} overview, provide a brief 2-3 sentence summary that helps someone decide if they'd enjoy it. Focus on tone, themes, and what kind of viewer would like it.

Title: ${title}
Overview: ${overview}

Keep your response concise and helpful.`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  return textContent?.text || 'Unable to generate summary.';
}

// Helper to format show list
function formatShowList(shows: ShowWithTags[], includeRatings = false): string {
  return shows
    .map((s) => {
      const parts = [`- "${s.title}" (${s.year || 'N/A'}) - ${s.type}`];
      if (includeRatings) {
        const ratings = [];
        if (s.imdb_rating) ratings.push(`IMDB: ${s.imdb_rating}`);
        if (s.rotten_tomatoes_score) ratings.push(`RT: ${s.rotten_tomatoes_score}%`);
        if (ratings.length > 0) parts.push(`(${ratings.join(', ')})`);
      }
      const tags = s.tags.filter((t) => !['Loved', 'Liked', "Didn't Like"].includes(t.name));
      if (tags.length > 0) parts.push(`[${tags.map((t) => t.name).join(', ')}]`);
      return parts.join(' ');
    })
    .join('\n');
}

// Fast recommendation - no web search, uses existing ratings data
export async function helpMeDecide(
  lovedShows: ShowWithTags[],
  likedShows: ShowWithTags[],
  dislikedShows: ShowWithTags[],
  toWatchShows: ShowWithTags[]
): Promise<string> {
  const client = getClient();

  const lovedList = formatShowList(lovedShows);
  const likedList = formatShowList(likedShows);
  const dislikedList = formatShowList(dislikedShows);
  const toWatchList = formatShowList(toWatchShows, true);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Help me decide what to watch next. Rank my watchlist based on my tastes.

## Shows I LOVED (favorites):
${lovedList || '(None yet)'}

## Shows I Liked:
${likedList || '(None yet)'}

## Shows I Didn't Like (avoid similar):
${dislikedList || '(None yet)'}

## My Watchlist:
${toWatchList}

Give me a quick ranked list (top 3-5) with one sentence each explaining why. Prioritize shows similar to my loved/liked ones and avoid anything similar to what I didn't like. Format: **Title** - reason.`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  return textContent?.text || 'Unable to generate recommendations.';
}

// Deep analysis with web search for critical consensus
export async function helpMeDecideDeep(
  lovedShows: ShowWithTags[],
  likedShows: ShowWithTags[],
  dislikedShows: ShowWithTags[],
  toWatchShows: ShowWithTags[]
): Promise<string> {
  const client = getClient();

  const lovedList = formatShowList(lovedShows);
  const likedList = formatShowList(likedShows);
  const dislikedList = formatShowList(dislikedShows);
  const toWatchList = formatShowList(toWatchShows, true);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    thinking: {
      type: 'enabled',
      budget_tokens: 4000,
    },
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `I need help deciding what to watch. Search for reviews of my top watchlist items.

## Shows I LOVED (favorites):
${lovedList || '(None yet)'}

## Shows I Liked:
${likedList || '(None yet)'}

## Shows I Didn't Like (avoid similar):
${dislikedList || '(None yet)'}

## My Watchlist:
${toWatchList}

Search for critical reviews of the top 2-3 most promising shows from my watchlist. Then rank all shows with:
- Why it matches my tastes (reference my loved/liked shows)
- What critics say
- Any caveats (especially if similar to my disliked shows)

Format as numbered list with **bold titles**.`,
      },
    ],
  });

  // Get all text blocks and concatenate them (web search produces multiple text blocks)
  const textContents = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text);
  return textContents.join('\n\n') || 'Unable to generate recommendations.';
}

// Clean up deep analysis output into a consistent, readable format
export async function cleanupDeepAnalysis(rawAnalysis: string): Promise<string> {
  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Clean up and format this recommendation analysis into a clear, consistent numbered list.

Requirements:
- Keep all the substantive content (show recommendations, reasons, critic opinions, caveats)
- Format as a numbered list: 1., 2., 3., etc.
- Each entry should have: **Title** followed by the recommendation text
- Remove redundant headers, excessive line breaks, and formatting inconsistencies
- Keep it concise but preserve key insights
- Don't add new information, just reorganize what's there

Raw analysis to clean up:
${rawAnalysis}`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  return textContent?.text || rawAnalysis;
}
