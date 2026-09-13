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

## Backend: Firebase

This app uses Firebase for auth (Identity Toolkit REST API + `firebase-admin` session cookies —
see `lib/firebase/`) and Firestore for data, accessed only from the server (`firebase-admin`,
never the client SDK). Firestore Security Rules (`firestore.rules`) therefore deny all
client-side access by default; every read/write happens through Server Components/Actions.

### Option A — develop against the Firebase Local Emulator Suite (recommended)

No real Firebase project needed. Requires Java (`java -version`) and the Firebase CLI:

```bash
npm run emulators          # starts Auth (9099) + Firestore (8080) + emulator UI (4000)
```

In another terminal, seed the certificate templates and start the app:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run db:seed
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run dev
```

(Or set those two vars in `.env.local` so you don't have to repeat them.) The emulator UI at
http://localhost:4000 lets you inspect Firestore documents and Auth users, and manually mark a
signed-up user's email as verified (real email sending doesn't happen locally) so you can sign in.

### Option B — a real Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com), enable
   **Authentication → Email/Password** and **Firestore Database** (production mode).
2. Register a Web app to get `apiKey`/`projectId` for `NEXT_PUBLIC_FIREBASE_*`.
3. **Project settings → Service accounts → Generate new private key** for the
   `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` server credentials.
4. **Storage → Get started** — a separate step from Firestore, easy to miss. Needed for uploading
   scheme form files on `/schemes`; everything else works without it.
5. Copy `.env.example` to `.env.local` and fill in both sets of values.
6. Deploy the security rules: `npx firebase-tools deploy --only firestore:rules,storage:rules --project <your-project-id>`.
7. Seed sample data: `npm run db:seed` (certificate templates) and `npm run db:seed:content`
   (schemes/news/admissions/prices/cases — all sample content, same disclosure the prototype's own
   footer makes).

Consider a separate `pasunestam-dev` project so you never test against real data, same reasoning
as `PLAYBOOK.md` Part 1.3 originally described for Supabase.

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
