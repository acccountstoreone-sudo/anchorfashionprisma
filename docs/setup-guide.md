# Anchor Fashion - Development Setup Guide

## Prerequisites

- **Node.js**: Version 20.x or higher
- **Package Manager**: npm (or pnpm/yarn)
- **Supabase Account**: You must have access to the Anchor Fashion Supabase project, or create a new one for local development.

## 1. Clone and Install

```bash
git clone <repository-url>
cd anchor-fashion
npm install --legacy-peer-deps
```

_(Note: `--legacy-peer-deps` is required due to some UI component libraries expecting React 18 while we are on React 19)_

## 2. Environment Variables

We need to configure our environment variables to connect to our backend and third-party services.

1. Copy the example configuration file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and replace the placeholder values. At a minimum, you must configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 3. Local Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application should compile and render the landing page.

## 4. Build and Production (Optional)

To verify the app builds properly before deploying:

```bash
npm run build
npm run start
```

## Common Issues

- **Compile Errors**: Ensure you have run `npm install --legacy-peer-deps` correctly.
- **Supabase Auth / Data fetching fails**: Verify your `.env.local` keys are exact and that your local/remote Supabase instance has the necessary schemas/migrations.
