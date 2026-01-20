# Neil's Reels

A family watchlist app for tracking movies and TV shows. Built with Next.js, Supabase, and AI-powered recommendations.

## Features

- **Quick Add**: Search TMDb database and add movies/TV shows to your watchlist
- **Discover Trending**: "Find More" button shows what's hot on TMDb for quick discovery
- **Smart Metadata**: Automatically fetches IMDB ratings, Rotten Tomatoes scores, and streaming availability
- **Tagging System**: Organize shows with customizable tags (who it's for, genre, mood, ratings)
- **Auto-Tagging**: TMDb genres are automatically mapped to your tag system
- **Rating Tags**: Mark shows as "Loved", "Liked", or "Didn't Like" to improve AI recommendations
- **Status Tracking**: Mark shows as "To Watch", "Watching", "Watched", or "Parked"
- **Filtering & Sorting**: Filter by status, tags, streaming service
- **AI Recommendations**: Two-tier system with quick picks and deep analysis using Claude with web search
- **Persisted Recommendations**: Last recommendation is saved and displayed instantly on return visits
- **Multi-Household Support**: Share your watchlist with family while keeping it separate from friends
- **Magic Link Auth**: Passwordless authentication via Supabase

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **APIs**:
  - [TMDb](https://www.themoviedb.org/documentation/api) - Movie/TV metadata, posters, genres, trending
  - [OMDb](https://www.omdbapi.com/) - IMDB ratings, Rotten Tomatoes scores
  - [Anthropic Claude](https://docs.anthropic.com/) - AI recommendations with extended thinking and web search

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for TMDb, OMDb, and Anthropic

### 1. Clone and Install

```bash
git clone https://github.com/dannyneil/show_tracker.git
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
4. Run the migration from `supabase/migrations/001_add_households.sql` for multi-user support

### 4. Configure Authentication

1. In Supabase Dashboard, go to **Authentication > URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://yourdomain.com`)
3. Add your callback URL to **Redirect URLs**: `https://yourdomain.com/auth/callback`
4. Enable Email provider with "Magic Link" enabled

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
│   │   ├── decide/             # AI recommendation endpoint
│   │   ├── household/          # Household management
│   │   │   ├── invite/         # Invitation management
│   │   │   └── member/         # Member management
│   │   ├── search/             # TMDb search endpoint
│   │   ├── shows/              # CRUD for shows
│   │   │   ├── [id]/           # Individual show operations
│   │   │   │   └── tags/       # Tag management for shows
│   │   │   └── refresh-ratings/ # Batch refresh ratings
│   │   ├── tags/               # Tag management
│   │   └── trending/           # TMDb trending content
│   ├── auth/
│   │   └── callback/           # Magic link callback
│   ├── login/                  # Login page
│   ├── settings/               # Account settings page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main app page
├── components/
│   ├── DecideHelper.tsx        # AI recommendation modal
│   ├── DiscoverModal.tsx       # Trending content discovery
│   ├── FilterBar.tsx           # Status/tag/service filters
│   ├── SearchBar.tsx           # TMDb search component
│   ├── ShowCard.tsx            # Individual show display
│   ├── StatusSelector.tsx      # Watch status dropdown
│   └── TagBadge.tsx            # Tag display component
├── lib/
│   ├── claude.ts               # Anthropic API integration
│   ├── omdb.ts                 # OMDb API integration
│   ├── supabase.ts             # Supabase client (browser)
│   ├── supabase-server.ts      # Supabase client (server)
│   └── tmdb.ts                 # TMDb API integration
├── types/
│   └── index.ts                # TypeScript type definitions
└── middleware.ts               # Auth middleware
```

## Database Schema

### Households Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Household name |
| created_at | timestamp | Creation date |

### Household Members Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| household_id | uuid | Reference to household |
| user_id | uuid | Reference to auth.users |
| email | text | Member email |
| role | text | 'owner' or 'member' |

### Shows Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| household_id | uuid | Reference to household |
| tmdb_id | integer | TMDb identifier |
| title | text | Show title |
| type | enum | 'movie' or 'tv' |
| poster_url | text | TMDb poster URL |
| year | integer | Release year |
| overview | text | Description |
| status | enum | 'to_watch', 'watching', 'watched', 'parked' |
| imdb_rating | decimal | IMDB rating (0-10) |
| rotten_tomatoes_score | integer | RT score (0-100) |
| imdb_id | text | IMDB ID for linking |
| streaming_services | jsonb | Array of service names |

### Recommendations Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| household_id | uuid | Reference to household |
| quick_pick | text | Fast AI recommendation |
| deep_analysis | text | Detailed AI recommendation |
| updated_at | timestamp | Last update time |

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

**Meta** (orange/red/gray): Recommended, Must-watch, Liked, Loved, Didn't Like

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
| GET | /api/trending | Get trending movies/TV from TMDb |
| GET | /api/tags | Get all tags |
| GET | /api/decide | Get last saved recommendation |
| POST | /api/decide | Generate AI recommendations |
| GET | /api/household | Get household info and members |
| PATCH | /api/household | Update household name |
| POST | /api/household/invite | Send invitation |
| DELETE | /api/household/invite | Cancel invitation |
| DELETE | /api/household/member | Remove member |

## AI Features

### Help Me Decide

The recommendation engine offers two modes:

**Quick Pick** (Fast)
- Uses Claude to analyze your watchlist and preferences
- Considers your "Loved", "Liked", and "Didn't Like" ratings
- Returns ranked recommendations in seconds

**Deep Analysis** (Thorough)
- Uses Claude with extended thinking (4000 token budget)
- Performs web searches for current critical reviews
- Provides detailed reasoning with critic quotes
- Takes longer but gives more comprehensive recommendations

Both modes save results for instant access on your next visit.

## Multi-Household Support

The app supports multiple households (accounts) with shared access:

1. **First user** who signs up becomes the **owner** of a new household
2. **Owners can invite** family members by email in Settings
3. **Invited users** automatically join the household when they sign up
4. **All household members** see and can edit the same watchlist
5. **Friends** get their own separate households with their own data

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

### Supabase Configuration

For magic link authentication to work in production:
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set **Site URL** to your production domain
3. Add `https://yourdomain.com/auth/callback` to **Redirect URLs**

## License

MIT License - Feel free to fork and customize for your own family!
