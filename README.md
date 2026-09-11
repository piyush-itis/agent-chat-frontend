# Galaxy Agent Chat — Frontend

Next.js App Router UI. Talks to the backend through typed service modules and TanStack Query.

## Setup

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
pnpm install
pnpm --filter backend contracts:export
pnpm dev
```

http://localhost:3000
