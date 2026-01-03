# Fitness Tracker with AI Form Check

## Overview

A personal fitness tracking application that allows users to log pushups and walks, visualize progress over time, and receive AI-powered feedback on exercise form through video uploads. The app features data visualization with charts, multiple time-based views (daily, weekly, monthly), and integrates Google's Gemini AI for video analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Charts**: Recharts for data visualization (line charts for progress tracking)
- **Forms**: React Hook Form for form handling

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/`
- Feature components like `form-check.tsx` for specific functionality
- Custom hooks in `client/src/hooks/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **File Uploads**: Multer for handling video uploads (stored in `uploads/` directory)
- **API Design**: RESTful endpoints under `/api/` prefix

The server handles:
- CRUD operations for fitness data (pushups, walks)
- Video upload processing for AI form analysis
- Static file serving in production

### Data Storage
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `db/schema.ts`
- **Migrations**: Drizzle Kit for database migrations stored in `migrations/`

Current database tables:
- `users`: User authentication data
- `pushups`: Pushup count entries with timestamps (id, count, date)
- `walks`: Walking distance entries with timestamps (id, miles, date)

## Recent Changes

### January 3, 2026
- Added walk tracking feature with logging form, statistics, and progress chart
- Updated app title to "Bole Fitness Tracker" to reflect both pushups and walks
- Fixed timezone issue causing dates to display as previous day on charts

### Build and Development
- **Development**: `tsx` for running TypeScript directly
- **Production Build**: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/`
- **Path Aliases**: `@/` maps to client source, `@db` maps to database modules

## External Dependencies

### AI Integration
- **Google Generative AI (Gemini)**: Used for analyzing exercise form from uploaded videos
- Supports video uploads up to 50MB
- Accepts MP4 and MOV video formats

### Database
- **Neon Serverless**: PostgreSQL database provider
- Connection via `DATABASE_URL` environment variable
- WebSocket support for serverless connections

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (Neon)
- `GEMINI_API_KEY`: Google AI API key for video analysis (implied by @google/generative-ai usage)

### Key NPM Packages
- `drizzle-orm` + `drizzle-zod`: Database ORM and validation
- `@neondatabase/serverless`: Serverless Postgres driver
- `@google/generative-ai`: Gemini AI integration
- `multer`: File upload handling
- `recharts`: Data visualization
- Full shadcn/ui component set via Radix UI primitives