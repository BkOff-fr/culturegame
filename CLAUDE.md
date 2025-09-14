# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production with Turbopack  
npm start                # Start production server
npm run lint             # Run ESLint

# Database operations
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create and apply new migrations
npx prisma generate      # Regenerate Prisma client after schema changes
npx tsx prisma/seed.ts   # Seed database with sample data
```

## Architecture Overview

This is a multiplayer culture/quiz game built with:

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4 with Framer Motion animations
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **UI Components**: Custom components with glassmorphism design using Lucide React icons
- **Real-time Features**: Socket.io (planned for multiplayer)

### Key Architecture Patterns

- **API Routes**: Located in `src/app/api/` following Next.js App Router conventions
- **Database Models**: Defined in `prisma/schema.prisma` with comprehensive game mechanics
- **Authentication**: JWT-based auth with cookies, handled in `src/lib/auth.ts`
- **Component Structure**: React components in `src/components/` with TypeScript
- **Path Aliases**: Uses `@/*` for `./src/*` imports

### Database Schema

The application uses a sophisticated game database with these key models:
- **Users**: Authentication and profiles with avatars
- **Games**: Multiplayer game rooms with status tracking
- **Questions**: Flexible question system supporting 8 different types (multiple choice, true/false, text input, ordering, slider, image zones, matching, speed)
- **GamePlayers**: Player participation in games with scoring
- **PlayerAnswers**: Individual question responses with timing
- **Achievements & Leaderboards**: Gamification features

### Game Flow Architecture

1. **Authentication**: Users register/login through JWT system
2. **Game Creation**: Host creates game with room code
3. **Multiplayer Lobby**: Players join via room codes
4. **Question System**: Supports multiple question types with scoring
5. **Results & Statistics**: Performance tracking and leaderboards

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, games, questions, stats)
│   ├── globals.css    # Global styles with Tailwind
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # React components for game features
├── context/          # React contexts
├── hooks/            # Custom React hooks
└── lib/              # Utilities (auth, db connections)

prisma/
├── schema.prisma     # Database schema
├── seed.ts           # Database seeding
├── dev.db           # SQLite database file
└── migrations/      # Database migrations
```

## Development Notes

- Uses Turbopack for faster development builds (`--turbopack` flag)
- TypeScript strict mode enabled
- ESLint configured with Next.js and TypeScript rules
- Database migrations are automatically created with Prisma
- Seed data includes sample questions and users for testing
- Authentication uses secure JWT tokens with 7-day expiry

## Special Considerations

- The project is multilingual (French) - maintain French text in components
- Question system is highly flexible - new question types require updates to schema enum and components
- Game state management handles real-time multiplayer scenarios
- Scoring system includes base points, time bonuses, and streak multipliers