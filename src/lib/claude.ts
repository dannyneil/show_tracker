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

export async function helpMeDecide(
  likedShows: ShowWithTags[],
  toWatchShows: ShowWithTags[]
): Promise<string> {
  const client = getClient();

  const likedList = likedShows
    .map((s) => `- "${s.title}" (${s.year || 'N/A'}) - ${s.type}, tags: ${s.tags.map((t) => t.name).join(', ') || 'none'}`)
    .join('\n');

  const toWatchList = toWatchShows
    .map((s) => {
      const ratings = [];
      if (s.imdb_rating) ratings.push(`IMDB: ${s.imdb_rating}`);
      if (s.rotten_tomatoes_score) ratings.push(`RT: ${s.rotten_tomatoes_score}%`);
      const ratingsStr = ratings.length > 0 ? ` (${ratings.join(', ')})` : '';
      const services = s.streaming_services.length > 0 ? ` [${s.streaming_services.join(', ')}]` : '';
      return `- "${s.title}" (${s.year || 'N/A'}) - ${s.type}${ratingsStr}${services}`;
    })
    .join('\n');

  // Use extended thinking and web search for deeper analysis
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    thinking: {
      type: 'enabled',
      budget_tokens: 8000,
    },
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `I need help deciding what to watch. Based on shows I've enjoyed in the past, help me pick from my watchlist.

## Shows I've Liked:
${likedList || '(No liked shows yet - just give general recommendations)'}

## My Watchlist (to choose from):
${toWatchList}

Please use web search to look up current critical reviews and audience reception for the shows on my watchlist. I want to understand the broader critical consensus - what do reviewers and audiences generally think about these shows?

After researching, rank my watchlist from most to least recommended for me, considering:
1. How well each show matches my tastes based on what I've liked
2. The current critical and audience consensus
3. Any notable praise or criticism from reviews

For each recommendation, include:
- A brief explanation of why I might enjoy it based on my tastes
- What critics/audiences generally say about it
- Any caveats or things to be aware of

Format as a numbered list with each show's title in bold.`,
      },
    ],
  });

  // Extract the text response (may include thinking blocks which we don't show to user)
  const textContent = message.content.find((c) => c.type === 'text');
  return textContent?.text || 'Unable to generate recommendations.';
}
