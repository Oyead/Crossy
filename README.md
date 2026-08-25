# Crossy

Crossy is a cross-medium media discovery engine. Enter a movie, album, game, book, or just describe a mood, and Crossy discovers brilliant matches scattered across different mediums using AI-powered search, vector embeddings, and collaborative filtering.

## Tech Stack

### Core

- **Next.js 14** (App Router) with React 18 and TypeScript
- **PostgreSQL** with the **pgvector** extension for semantic search
- **Prisma 5** ORM
- **Upstash Redis** for caching, rate limiting, and circuit breaker state

### AI and LLM

- **Google Gemini** (primary LLM for candidate generation and ranking)
- **Groq** (fallback LLM)
- **OpenRouter** (second fallback LLM)
- **OpenAI text-embedding-3-small** (1536-dimension embeddings for semantic search)

### External Media APIs

- **TMDB** (The Movie Database) for movies and TV
- **iTunes Search API** for music
- **RAWG** for video games
- **Open Library** for books

### Authentication

- **NextAuth.js** with JWT sessions
- **GitHub OAuth** and **Google OAuth** for social sign-in
- **Email/password** with bcrypt hashing and email verification codes
- **WebAuthn/Passkeys** via SimpleWebAuthn

### Client-Side

- **React Query** (stale time 60 seconds)
- **next-themes** for dark/light mode
- **Tailwind CSS** with a custom retro/neobrutalist design system
- **Lucide React** icons

### Email

- **Nodemailer** with Gmail SMTP for verification codes and password resets

## Project Structure

```
/
├── middleware.ts                    # Edge middleware: rate limiting for API routes
├── prisma/
│   ├── schema.prisma               # Database schema (9 models, pgvector)
│   └── migrations/
├── src/
│   ├── app/                        # Next.js App Router pages and API routes
│   │   ├── page.tsx                # Homepage: hero, search bar, features, For You
│   │   ├── layout.tsx              # Root layout
│   │   ├── providers.tsx           # Client providers (React Query, NextAuth, Theme)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx         # Email verification signup flow
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── search/[queryId]/page.tsx   # Search results (server-side pipeline)
│   │   ├── media/[type]/[id]/page.tsx  # Media detail page
│   │   ├── favorites/page.tsx      # Saved media library
│   │   ├── subscription/page.tsx   # Pro plan (coming soon)
│   │   └── api/                    # API route handlers
│   │       ├── search/route.ts
│   │       ├── suggest/route.ts
│   │       ├── favorites/route.ts
│   │       ├── interactions/route.ts
│   │       ├── media/[type]/[id]/route.ts
│   │       ├── recommendations/
│   │       ├── auth/               # NextAuth, signup, verify, forgot/reset password
│   │       └── webauthn/options/route.ts
│   ├── components/
│   │   ├── layout/Navbar.tsx
│   │   ├── search/SearchBar.tsx    # Autocomplete with debounce and cache
│   │   ├── results/               # ResultsGrid, MediaCard, MediaTypeSection, Skeleton
│   │   ├── auth/SocialSignInButtons.tsx
│   │   ├── hero/MediaPhrase.tsx
│   │   └── home/ForYouSection.tsx
│   ├── server/
│   │   ├── db/prisma.ts           # Prisma client singleton
│   │   ├── ai/
│   │   │   ├── llmClient.ts       # Multi-provider LLM with fallback chain
│   │   │   ├── prompts.ts         # AI prompt templates
│   │   │   └── schemas.ts         # Zod schemas for AI responses
│   │   ├── pipeline/
│   │   │   ├── mediaPipeline.ts   # Core search orchestrator
│   │   │   ├── candidateSearch.ts # AI candidate generation and hydration
│   │   │   ├── circuitBreaker.ts  # Per-provider Redis-backed circuit breaker
│   │   │   └── collaborative.ts   # Item-to-item collaborative filtering
│   │   ├── integrations/
│   │   │   ├── registry.ts        # Provider registry
│   │   │   ├── fetchWithTimeout.ts
│   │   │   ├── tagMap.ts          # Genre alias normalization
│   │   │   └── providers/         # tmdb, itunes, rawg, openLibrary
│   │   └── context/
│   │       ├── embed.ts           # OpenAI embedding wrapper
│   │       ├── itemVectors.ts     # pgvector recall, taste profiles
│   │       ├── searchMemory.ts    # Query embedding and recall
│   │       └── userSignal.ts      # User personalization signals
│   └── lib/
│       ├── authOptions.ts         # NextAuth configuration
│       ├── cache.ts               # Redis cache helpers
│       ├── redis.ts               # Upstash Redis client
│       ├── rateLimit.ts           # Sliding window rate limiter
│       ├── mailer.ts              # Gmail SMTP email sender
│       ├── trace.ts               # Server-Timing instrumentation
│       ├── analytics.ts           # Search query logging
│       ├── interactions.ts        # Client-side event logging
│       ├── favorites.ts           # Client-side favorites API
│       └── webauthnChallengeStore.ts  # Redis-backed WebAuthn challenges
```

## Search Pipeline

The search pipeline is the core system. It runs entirely server-side and produces ranked cross-medium results in four phases.

### Phase 1: Fast Provider Search

All four media providers are queried in parallel (TMDB, iTunes, RAWG, Open Library). Each provider call goes through a Redis-backed circuit breaker that tracks failures and caches results per provider. If a provider has failed 2 or more times in the last 30 minutes, it is skipped. Results are deduplicated, filtered to items with cover images, and sorted by rating.

### Phase 2: AI Candidate Generation (runs in parallel with Phase 1)

The user query is sent to the LLM fallback chain (Gemini -> Groq -> OpenRouter) with a prompt asking for up to 15 real existing media titles across all types. The prompt emphasizes broad interpretation: vibe, tone, mood, genre, not just keyword matching. The response is validated against a Zod schema. Each AI-suggested candidate is "hydrated" by looking it up in the base results or fetching it from the appropriate provider.

### Phase 3: Merge

Results from five sources are combined and deduplicated:

1. AI-generated candidates (from Phase 2)
2. **Vector search** - The query is embedded via OpenAI, then a pgvector cosine similarity search finds the nearest items in the database
3. **Collaborative filtering** - "Users who clicked X also clicked Y." Finds users who interacted with the top 3 provider results, then surfaces the most co-clicked items across those users
4. **Search memory** - The query is embedded and compared against past search query embeddings to find semantically similar previous searches, returning their stored recommendations
5. Base provider results (from Phase 1)

### Phase 4: AI Ranking

The top 25 merged results are sent to the LLM with a ranking prompt. The AI returns index-reason-confidence triples for each result. A safety net ensures exact title matches are never dropped. Results are diversified within confidence bands to ensure variety across media types and creators.

### Caching

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `search:{query}` | 1 hour | Full ranked results |
| `search:u{userId}:{query}` | 1 hour | Personalized ranked results |
| `fast:search:{query}` | 20 minutes | Intermediate merged results |
| `candidates:{query}` | 15 minutes | AI-generated candidates |
| `provider:{name}:{query}` | 20 minutes | Per-provider raw results |
| `suggest:{query}` | 10 minutes | Autocomplete suggestions |
| `cb:{provider}` | 30 minutes | Circuit breaker failure state |

## Authentication System

### NextAuth Configuration

- JWT session strategy
- Custom sign-in page at `/login`
- PrismaAdapter with a wrapper that strips non-schema fields from OAuth tokens

### Authentication Flows

**Email/Password Signup:**
1. User submits email and password
2. Password is hashed with bcrypt (10 rounds)
3. A 6-digit verification code is generated and sent via email
4. User enters the code (max 5 attempts, 10-minute expiry)
5. On verification, the User record is created

**Password Reset:**
1. User requests a reset at `/forgot-password`
2. A JWT token with 15-minute expiry is generated and emailed
3. User clicks the link and sets a new password
4. The endpoint always returns the same response to prevent email enumeration

**OAuth (GitHub/Google):**
1. Standard OAuth2 redirect flow
2. On callback, the user is linked or created via PrismaAdapter
3. The adapter strips `refresh_token_expires_in` from GitHub tokens to avoid Prisma validation errors

**WebAuthn/Passkeys:**
1. Registration and authentication options are generated via SimpleWebauthn
2. Challenges are stored in Redis with 5-minute TTL
3. Verification happens inside the NextAuth Credentials provider

## Database Schema

Nine models backed by PostgreSQL with pgvector:

- **Media** - Canonical media items with optional 1536-dimension vector embeddings for semantic search
- **SearchQuery** - Logged search queries with embeddings for finding similar past searches
- **Recommendation** - Links search queries to recommended media with match reasons
- **Interaction** - Click and impression tracking events for CTR analytics
- **User** - Application users with optional password field
- **Account** - NextAuth OAuth account linkage
- **Session** - NextAuth session records
- **PendingSignup** - Temporary state for email verification during signup
- **Favorite** - User's saved media items

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=` | Full search pipeline |
| GET | `/api/suggest?q=` | Autocomplete suggestions |
| GET | `/api/favorites` | Get user's favorites |
| POST | `/api/favorites` | Toggle a favorite |
| DELETE | `/api/favorites` | Remove a favorite |
| POST | `/api/interactions` | Log impressions/clicks |
| GET | `/api/stats/ctr` | Click-through rate analytics |
| GET | `/api/media/:type/:id` | Media details from provider |
| GET | `/api/recommendations/for-you` | Personalized picks |
| GET | `/api/recommendations/:id/similar` | Similar items |
| GET | `/api/webauthn/options` | WebAuthn registration/auth options |
| POST | `/api/auth/signup` | Register with email verification |
| POST | `/api/auth/verify-signup` | Verify email code |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| * | `/api/auth/[...nextauth]` | NextAuth handler |

## Rate Limiting and Circuit Breakers

**Edge Middleware Rate Limiting:**
- All API routes except `/api/suggest` are rate limited
- 100 requests per 15 minutes per IP using Upstash sliding window
- Returns JSON 429 response

**Suggest Endpoint Rate Limiting:**
- Separate in-memory rate limiter
- 60 requests per minute per IP

**Media Provider Circuit Breaker:**
- Redis-backed, per-provider failure tracking
- After 2 failures in 30 minutes, the provider is skipped
- Allows one probe request after 60 seconds of cooldown
- On success, resets the failure counter

**LLM Provider Circuit Breaker:**
- In-memory cooldown per provider
- On failure, provider enters 60-second cooldown
- Automatic fallback to next provider in the chain

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (must have pgvector extension) |
| `DIRECT_URL` | Direct database connection for Prisma migrations |
| `NEXTAUTH_URL` | Base URL for NextAuth (e.g., `https://crossymedia-app.vercel.app`) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `GEMINI_API_KEY` | Google Gemini API key |

### Optional

| Variable | Description |
|----------|-------------|
| `TMDB_API_KEY` | TMDB API key for movie/TV search |
| `RAWG_API_KEY` | RAWG API key for game search |
| `GROQ_API_KEY` | Groq API key (LLM fallback) |
| `OPENROUTER_API_KEY` | OpenRouter API key (LLM fallback) |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings only) |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth credentials |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Google OAuth credentials |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail SMTP credentials for email sending |
| `NEXT_PUBLIC_APP_URL` | Public app URL for email links |

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/Oyead/Crossy.git
cd Crossy
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Fill in the required values in `.env`.

4. Set up the database

```bash
npx prisma db push
```

5. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Deployment to Vercel

1. Push to GitHub

2. Connect the repository to Vercel

3. Set all environment variables in the Vercel dashboard

4. The `postinstall` script runs `prisma generate` automatically during the build

5. Deploy

```bash
npx vercel --prod
```

## Design System

Crossy uses a retro/neobrutalist design language with:

- Hard box-shadows with offset (e.g., `shadow-[6px_6px_0px_#1a1a15]`)
- Corner dot decorations on cards and containers
- Border-heavy UI with `border-2 border-foreground`
- Warm color palette: off-white background (`#FAF6EE`), indigo accent (`#4F46E5`), yellow highlights (`#FFEAA7`)
- Per-type color coding: blue for movies/TV (`#D2E9F9`), peach for music (`#FAD3A2`), pink for books (`#E8C5C8`), yellow for games (`#FFEAA7`)
- Custom CSS animations for fade-up effects and horizontal marquees
