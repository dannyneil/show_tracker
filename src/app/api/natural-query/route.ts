import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const client = getClient();

    // Send the query directly to Claude with context about what this is for
    // Use Opus 4.5 since this is about making important decisions (choosing what to watch for many hours)
    const systemPrompt = `You are helping a user find shows to watch based on their preferences.
The user has provided you with information about shows they loved, liked, and didn't like, along with their watchlist.
They may also ask you questions about what to watch.

Pay close attention to:
- Their loved/liked shows to understand their taste
- Shows they didn't like and WHY (check their notes)
- Any notes on shows (e.g., "too violent", "great aesthetic but aimless") - these provide crucial context
- Tags that reveal patterns (genres, moods, who tagged it)

Provide helpful, thoughtful recommendations or answers based on their query.
When recommending shows, explain why based on their stated preferences and patterns you notice.
Be honest about potential concerns if a show has traits similar to ones they disliked.
Format your response in a clear, readable way.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514', // Using Sonnet 4 for reliable performance
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    const response = textContent?.text || 'Unable to process your query.';

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error processing natural query:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to process your query. Please try again.' },
      { status: 500 }
    );
  }
}
