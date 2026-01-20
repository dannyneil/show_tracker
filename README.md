# Neil's Reels

A family watchlist app for tracking movies and TV shows. Built with Next.js, Supabase, and AI-powered recommendations.

## Features

- **Quick Add**: Search TMDb database and add movies/TV shows to your watchlist
- **Smart Metadata**: Automatically fetches IMDB ratings, Rotten Tomatoes scores, and streaming availability
- **Tagging System**: Organize shows with customizable tags (who it's for, genre, mood, etc.)
- **Auto-Tagging**: TMDb genres are automatically mapped to your tag system
- **Status Tracking**: Mark shows as "To Watch", "Watching", or "Watched"
- **Filtering & Sorting**: Filter by status, tags, streaming service; sort by date, title, rating, or year
- **AI Recommendations**: "Help Me Decide" uses Claude with web search to analyze critical consensus and recommend what to watch based on your taste
- **Magic Link Auth**: Passwordless authentication via Supabase

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **APIs**:
  - [TMDb](https://www.themoviedb.org/documentation/api) - Movie/TV metadata, posters, genres
  - [OMDb](https://www.omdbapi.com/) - IMDB ratings, Rotten Tomatoes scores
  - [Anthropic Claude](https://docs.anthropic.com/) - AI recommendations with web search

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for TMDb, OMDb, and Anthropic

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd show_tracker
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDb API (get from https://www.themoviedb.org/settings/api)
TMDB_API_KEY=your_tmdb_bearer_token

# OMDb API (get from https://www.omdbapi.com/apikey.aspx)
OMDB_API_KEY=your_omdb_api_key

# Anthropic API (get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Set Up Supabase Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the schema from `supabase/schema.sql` to create tables and seed data

### 4. Configure Authentication

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Email provider with "Magic Link" enabled
3. Add your allowed email addresses under Authentication > Users (or configure allowed domains)

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── decide/          # AI recommendation endpoint
│   │   ├── search/          # TMDb search endpoint
│   │   ├── shows/           # CRUD for shows
│   │   │   ├── [id]/        # Individual show operations
│   │   │   │   └── tags/    # Tag management for shows
│   │   │   └── refresh-ratings/  # Batch refresh ratings
│   │   └── tags/            # Tag management
│   ├── auth/
│   │   └── callback/        # Magic link callback
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main app page
├── components/
│   ├── AddShowModal.tsx     # Search and add shows
│   ├── FilterBar.tsx        # Status/tag/service filters
│   ├── HelpMeDecide.tsx     # AI recommendation modal
│   ├── ShowCard.tsx         # Individual show display
│   ├── ShowList.tsx         # Grid of show cards
│   ├── StatusSelector.tsx   # Watch status dropdown
│   └── TagBadge.tsx         # Tag display component
├── lib/
│   ├── claude.ts            # Anthropic API integration
│   ├── omdb.ts              # OMDb API integration
│   ├── supabase-browser.ts  # Supabase client (browser)
│   ├── supabase-server.ts   # Supabase client (server)
│   └── tmdb.ts              # TMDb API integration
├── types/
│   └── index.ts             # TypeScript type definitions
└── middleware.ts            # Auth middleware
```

## Database Schema

### Shows Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tmdb_id | integer | TMDb identifier |
| title | text | Show title |
| type | enum | 'movie' or 'tv' |
| poster_url | text | TMDb poster URL |
| year | integer | Release year |
| overview | text | Description |
| status | enum | 'to_watch', 'watching', 'watched' |
| imdb_rating | decimal | IMDB rating (0-10) |
| rotten_tomatoes_score | integer | RT score (0-100) |
| imdb_id | text | IMDB ID for linking |
| streaming_services | jsonb | Array of service names |
| ai_summary | text | AI-generated summary |

### Tags Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Tag name |
| color | text | Hex color code |
| category | enum | 'who', 'genre', 'mood', 'meta' |

### Default Tags

**Who** (blue): Danny, Elizabeth, Both, Kids

**Genre** (purple): Romcom, Funny, Scifi, Drama, Thriller, Documentary, Action, Mystery

**Mood** (green): Light, Intense, Feel-good

**Meta** (orange): Recommended, Must-watch, Liked

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/shows | Get all shows with tags |
| POST | /api/shows | Add a new show |
| PATCH | /api/shows/[id] | Update show status |
| DELETE | /api/shows/[id] | Delete a show |
| POST | /api/shows/[id]/tags | Add tag to show |
| DELETE | /api/shows/[id]/tags | Remove tag from show |
| POST | /api/shows/refresh-ratings | Refresh all ratings from OMDb |
| GET | /api/search?q=query | Search TMDb for shows |
| GET | /api/tags | Get all tags |
| POST | /api/decide | Get AI recommendations |

## AI Features

### Help Me Decide

The recommendation engine uses Claude with:

- **Extended Thinking**: 8000 token budget for deeper reasoning about your preferences
- **Web Search**: Looks up current critical reviews and audience reception
- **Personalized Ranking**: Considers your liked shows and viewing history

The AI analyzes:
1. How well each show matches your demonstrated tastes
2. Current critical and audience consensus from reviews
3. Notable praise or criticism to be aware of

## Genre Auto-Tagging

When adding a show, TMDb genres are automatically mapped to your tags:

| TMDb Genre | Mapped Tag |
|------------|------------|
| Action, Adventure | Action |
| Comedy | Funny |
| Drama | Drama |
| Horror, Crime, Thriller | Thriller |
| Romance | Romcom |
| Science Fiction, Fantasy | Scifi |
| Documentary | Documentary |
| Mystery | Mystery |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TMDB_API_KEY`
- `OMDB_API_KEY`
- `ANTHROPIC_API_KEY`

## License

Private project for personal/family use.
