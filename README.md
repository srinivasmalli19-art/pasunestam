This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project's URL and anon key
(Supabase dashboard → Settings → API). See `PLAYBOOK.md` Part 1.3 for creating a separate dev
project so you never test against the live database.

## Database migrations and generated types

Schema changes live in `supabase/migrations/`. To link this project to your Supabase project and
regenerate `lib/supabase/database.types.ts` after a migration:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # found in the Supabase dashboard URL
npx supabase db push                                  # applies migrations/*.sql
npm run db:types                                       # regenerates lib/supabase/database.types.ts
```

## Tests

```bash
npm test          # run once
npm run test:watch
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
