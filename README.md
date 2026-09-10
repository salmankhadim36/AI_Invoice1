# AI Invoice

Cross-platform (Android / iOS / Web) invoicing app built with Expo Router +
TypeScript. Describe your work in plain language → AI drafts a structured
invoice → export it as a PDF.

|              |                               |
| ------------ | ----------------------------- |
| Expo SDK     | 57                            |
| React Native | 0.86.3 (New Architecture)     |
| React        | 19.2 (React Compiler enabled) |
| TypeScript   | 6, strict                     |
| Node         | 22 (`.nvmrc`)                 |

## Quick start

```bash
nvm use
npm install
cp .env.example .env
npx expo start        # press a = Android, i = iOS, w = Web
```

## Folder structure

```
ai-invoice/
├── src/
│   ├── app/                      # Routes only (Expo Router, file-based)
│   │   ├── _layout.tsx           # Root stack + providers (React Query, gestures)
│   │   ├── +not-found.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       # Bottom tabs
│   │   │   ├── index.tsx         # Invoice list + outstanding total
│   │   │   ├── create.tsx        # AI prompt → draft invoice
│   │   │   └── settings.tsx
│   │   └── invoice/[id].tsx      # Invoice detail + PDF export
│   ├── components/ui/            # Dumb, reusable UI (button, badge, card, text-field, …)
│   ├── constants/config.ts       # Every env var / magic constant, in one place
│   ├── features/                 # Feature-first modules (the screens' brains)
│   │   ├── _TEMPLATE/            # Copy this to start a new feature
│   │   └── invoices/             # Card, create hook, PDF builder, export hook
│   ├── hooks/                    # Only hooks used by 2+ features
│   ├── services/api-client.ts    # Single fetch wrapper: auth, timeout, errors
│   ├── store/                    # Zustand + AsyncStorage persistence
│   ├── theme/                    # Design tokens: colors, spacing, type
│   ├── types/                    # Zod schemas = runtime validation + TS types
│   └── utils/                    # money (integer minor units), id
├── supabase/                     # Postgres schema, RLS, pgTAP tests (docs/DATABASE.md)
├── .claude/                      # Agent config: agents, skills, permissions
├── docs/                         # Architecture, contributing, running
├── CLAUDE.md                     # Engineering constitution — read this first
├── eslint.config.js              # Layer boundaries enforced as lint errors
└── jest.config.js
```

## Architecture rules

The authoritative ruleset is [`CLAUDE.md`](./CLAUDE.md). The short version:

1. **`src/app/` contains routes only.** Screens import logic from
   `src/features/*`, keeping navigation thin and logic testable.
2. **Feature-first, not type-first.** Everything about invoices lives in
   `features/invoices/`, not scattered across global folders.
3. **Zod at every boundary.** API and AI responses are parsed, never trusted.
   Schemas double as TypeScript types.
4. **One API client.** Base URL, auth, timeout, and error mapping live in
   `services/api-client.ts` only.
5. **Design tokens.** No hardcoded colours or spacing — everything from
   `src/theme`.
6. **Money is integer minor units.** Cents, never floats; tax in basis points;
   rounding only where a number is printed.
7. **AI key stays on the backend.** The app calls `/ai/draft-invoice` on _your_
   server; the server calls the LLM. A key in a mobile binary can be extracted.

Rules 1, 4 and the import direction are enforced by `eslint.config.js`.

## Quality gate

```bash
npm run verify    # lint + typecheck + test
```

## Backend contract (implement these two endpoints)

```
POST /ai/draft-invoice   { prompt }
  → { clientName, items: [{ description, quantity, unitPriceMinor }],
      notes?, suggestedDueInDays }

POST /ai/draft-reminder  { invoiceNumber, clientName, daysOverdue }
  → { subject, body }
```

`unitPriceMinor` is an **integer in the currency's minor unit** (cents).

## Status

The UI, contracts, state, PDF export, and test suite are built and green. No
backend exists yet, so AI drafting fails until you implement the two endpoints
above. See [`CLAUDE.md` §11](./CLAUDE.md) for the full list of known gaps.

## Next steps

- Implement the backend `/ai/*` endpoints
- Auth (`expo-secure-store` for tokens; `setAuthToken()` is already wired)
- Editable line items and a tax-rate control
- Sync invoices to the backend with React Query mutations
- EAS Build for store releases: `npx eas build --platform all`
