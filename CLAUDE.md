# CLAUDE.md — Engineering Constitution

Authoritative rules for **any** agent or human touching this repo. If a request
conflicts with a rule here, say so before writing code. If a rule is wrong,
change this file in the same PR — never silently ignore it.

---

## 1. What this is

**AI Invoice** — a cross-platform (Android / iOS / Web) invoicing app.

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| Expo SDK     | 57                                                       |
| React Native | 0.86.3 (New Architecture)                                |
| React        | 19.2 (React Compiler enabled)                            |
| Router       | Expo Router v57, file-based, routes in `src/app/`        |
| Language     | TypeScript 6, `strict` + `noUncheckedIndexedAccess`      |
| State        | Zustand + AsyncStorage (local) · TanStack Query (server) |
| Validation   | Zod 4                                                    |
| Node         | 22 (see `.nvmrc`)                                        |

A user describes work in plain language → the backend's LLM drafts a structured
invoice → the app renders and exports it as PDF.

**Domain reality check:** this app produces financial documents people send to
clients and file with tax authorities. A rounding bug is a customer-facing
defect, not a cosmetic one. Treat money, dates, and invoice numbering as
correctness-critical code.

> Expo changes fast and this project is on the current SDK. Check the versioned
> docs at <https://docs.expo.dev/versions/v57.0.0/> before using an API you
> remember from an older SDK — several moved (see §5, Framework drift).

---

## 2. Commands

| Task                | Command                                               |
| ------------------- | ----------------------------------------------------- |
| Install             | `npm install`                                         |
| Dev server          | `npx expo start` — then `a` / `i` / `w`               |
| Android / iOS / Web | `npm run android` · `npm run ios` · `npm run web`     |
| Lint                | `npm run lint`                                        |
| Typecheck           | `npm run typecheck`                                   |
| Test                | `npm test` (`npm run test:watch` while iterating)     |
| Format              | `npm run format` (`format:check` in CI)               |
| **Full gate**       | **`npm run verify`** — lint + typecheck + test        |
| Web export          | `npm run export:web`                                  |
| Local database      | `npm run db:start` · `db:stop` · `db:status` (Docker) |
| Schema change       | `npm run db:new -- <name>` → `db:reset` → `db:test`   |

Add runtime packages with `npx expo install <pkg>`, never plain `npm install`,
so versions stay SDK-compatible. Dev-only tools that never reach the bundle
(the Supabase CLI) use `npm install --save-dev`.

---

## 3. Architecture

### Layers and the one import rule

```
src/app/  ──►  src/features/  ──►  src/services/ ──► network
                    │                    │
                    ├──► src/store/      │
                    ├──► src/components/ui/
                    └──► src/types/ · src/theme/ · src/utils/ · src/constants/
```

**Imports flow downward only.** A lower layer may never import from a higher one.
This is enforced in `eslint.config.js`, not just documented.

| Layer     | Path                   | May import                                          | Must never                                                       |
| --------- | ---------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Routes    | `src/app/`             | features, ui, theme, store                          | contain business logic, call `fetch`, or be imported by anything |
| Features  | `src/features/<name>/` | services, store, types, ui, theme, utils, constants | import from `src/app/` or from another feature                   |
| Shared UI | `src/components/ui/`   | theme, types, utils                                 | touch the store, call services, or know about invoices           |
| State     | `src/store/`           | types, utils                                        | call services or render                                          |
| Services  | `src/services/`        | types, constants, utils                             | import features or store                                         |
| Contracts | `src/types/`           | zod, utils                                          | import anything above it                                         |
| Tokens    | `src/theme/`           | nothing                                             | —                                                                |

Cross-feature dependency is a **design smell**. If `features/invoices` needs
something from `features/clients`, promote the shared piece to `src/types/`,
`src/utils/`, or `src/services/` — do not reach sideways.

### Where a new file goes

| You are writing…                   | Put it in                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| A screen the user navigates to     | `src/app/` (thin — see §4.1)                                                         |
| The logic behind that screen       | `src/features/<feature>/use-<thing>.ts`                                              |
| A component only this feature uses | `src/features/<feature>/<thing>.tsx`                                                 |
| A component 2+ features use        | `src/components/ui/<thing>.tsx`                                                      |
| A hook 2+ features use             | `src/hooks/use-<thing>.ts` (only once the 2nd consumer exists)                       |
| Anything hitting the network       | Through `src/services/api-client.ts` — no exceptions                                 |
| A shape crossing a boundary        | `src/types/<domain>.ts` as a zod schema                                              |
| An env var or magic constant       | `src/constants/config.ts`                                                            |
| A colour, size, or spacing value   | `src/theme/index.ts`                                                                 |
| A table, column, or RLS policy     | New file via `npm run db:new -- <name>` + a pgTAP test in `supabase/tests/database/` |

Start every new feature by copying `src/features/_TEMPLATE/`.

---

## 4. Non-negotiables

These are hard failures in review.

1. **`src/app/` holds routes only.** A route wires params → a feature hook →
   presentational components. Target under ~80 lines. No `fetch`, no
   calculations, no store mutation logic.
2. **No hardcoded design values.** Every colour, spacing, radius, font size, and
   weight comes from `src/theme`. Literal hex codes and magic pixel numbers in a
   component are a defect.
3. **Zod at every boundary.** Any data from the network, the LLM, storage, or a
   route param is `unknown` until a schema parses it. Never `as SomeType` on
   external data.
4. **No secrets in the bundle.** LLM keys live on the backend. The app only calls
   `/ai/*` on our own server. `EXPO_PUBLIC_*` is compiled into the binary and
   extractable — treat it as public.
5. **One API client.** Base URL, headers, auth, timeouts, and error mapping live
   only in `src/services/api-client.ts`. Bare `fetch` elsewhere is a lint error.
6. **Money is integer minor units.** See §6.
7. **Cross-platform or explicitly forked.** Code runs on Android, iOS, and web.
   Divergence is isolated to a single `Platform.OS` check with a comment saying
   why — never a silently broken platform.
8. **No `any`, no `@ts-expect-error`, no `eslint-disable`** without a same-line
   comment naming the reason. Prefer `unknown` + a narrowing parse.
9. **Never commit `.env`,** credentials, tokens, or real client data.
10. **Delete, don't comment out.** Dead code, commented-out blocks, and
    `console.log` do not land on `main`.
11. **The schema changes only through `supabase/migrations/`.** No DDL in the
    Supabase SQL editor or Table Editor, and no edits to a migration that has
    been pushed. CI applies migrations to the hosted database (`docs/DATABASE.md`).

---

## 5. Code standards

**Naming & files**

- **Files are `kebab-case`** — `invoice-card.tsx`, `use-create-invoice.ts`,
  `api-client.ts`. This matches the SDK 57 template convention. Exported
  _components_ stay `PascalCase`; exported functions stay `camelCase`.
- One component per file, **named export**.
- Route files in `src/app/`: **default export** (Expo Router requires it) — the
  only place default exports are allowed.
- Hooks return an object, never a positional tuple past two values.
- Schemas `PascalCaseSchema`, inferred types `PascalCase`.
- Booleans read as predicates: `isLoading`, `hasItems`, `canExport`.

**TypeScript**

- `strict` and `noUncheckedIndexedAccess` are on and stay on. Do not widen
  `tsconfig` to make an error go away.
- Derive types from zod (`z.infer`) rather than declaring them twice.
- Use `import type { … }` for type-only imports.
- Prefer narrow params (`Pick<Invoice, 'items'>`) over whole entities.
- Exhaustive `switch` on unions with a `never` default.
- Beware `as const` on config: it narrows defaults to literal types. Annotate
  parameters explicitly (`currency: string = config.defaultCurrency`).

**React Native**

- Styles in a `StyleSheet.create` block at the **bottom** of the file. Inline
  style objects are for one-off layout (`{ flex: 1 }`), never colour or type.
- Compose tokens by spreading: `{ ...typography.title, color: colors.ink }`.
- Lists use `FlatList` with a stable `keyExtractor`.
- Every touchable: `accessibilityRole`, an `accessibilityLabel` when the text
  isn't self-describing, and a **≥48px** target (`HIT_SLOP_MIN`).
- Every async screen handles three states explicitly: loading, empty, error.
  For persisted stores, "loading" means not yet rehydrated — use `useHydrated`.
- `<Link asChild>` merges its own `style` into the child with an object spread:
  a `Pressable` style **function** is silently dropped and a component's own
  `style` can be replaced. In a component that may be wrapped by a Link, spread
  `...rest` **before** its own `style`, or put pressed styles on an inner view.

**Framework drift (SDK 57)** — APIs that moved; using the old one still compiles
but is deprecated:

- `Tabs` comes from **`expo-router/js-tabs`**, not the root `expo-router` export.
- React Compiler is **on** (`app.json` → `experiments.reactCompiler`). Do not
  hand-add `useMemo`/`useCallback` for pure render-cost reasons; keep
  `useCallback` only where a stable identity is semantically required.
- Zod is **v4**. Check v4 docs before copying a v3 snippet.

**State**

- Server data → TanStack Query. Local/persisted → Zustand. Do not cache server
  responses in Zustand.
- Select narrowly: `useInvoiceStore((s) => s.invoices)`, never the whole store.
- Store actions are pure reducers — no I/O, no navigation inside them.

**Errors**

- Users see a plain-language, actionable message; never a raw exception or
  status code. `ApiError.userMessage` exists for exactly this.
- `catch {}` that swallows an error silently is forbidden. Distinguish causes —
  a dead network and a malformed model response need different messages.
- Loading and error state belong to the feature hook, not the route.

---

## 6. Money, dates, and numbering

These rules exist because this is accounting software.

1. **All amounts are integers in minor units** (cents). The field name says so:
   `unitPriceMinor`. Floats never hold or accumulate an amount.
2. **Tax rates are basis points** (`taxRateBps`, 2000 = 20%) — integers, so the
   rate itself carries no float error.
3. **Round where a number is displayed, and nowhere else.** A line amount rounds
   (it's printed); the subtotal is the sum of rounded lines; tax rounds once on
   that subtotal. The printed lines must add up to the printed subtotal — a
   client will check.
4. **Never convert with `value * 10 ** digits`.** `1.005 * 100` is
   `100.49999999999999`. Use `toMinorUnits`, which shifts the decimal exponent.
5. **Currency travels with the amount.** No function takes a bare number and
   assumes USD. Respect zero-decimal (JPY) and three-decimal (KWD) currencies —
   `minorUnitDigits` knows them.
6. **Formatting locale is explicit and stored** (`config.defaultLocale`), never
   the device locale. The same invoice must format identically everywhere.
7. **Dates are ISO `YYYY-MM-DD` strings**, validated by `IsoDateSchema`. Use
   `date-fns`. A due date is a calendar day, not a timestamp — no timezone
   shifting an invoice a day early.
8. **Invoice numbers must be unique, monotonic, and gap-free per year.** Never
   derive one from `invoices.length`. The client mints a provisional
   `DRAFT-…` id; the **backend assigns the real number** when the invoice is sent.
9. **IDs are collision-resistant** — `newId()` (`crypto.randomUUID`). Never
   `Math.random()`, and never mint one entity's ID as a side effect of creating
   another.

---

## 7. The AI boundary

1. The app **never** talks to an LLM provider directly. It calls our backend.
2. Every model response is parsed by a zod schema before any component sees it.
3. Treat model output as **untrusted input**: never interpolate it into HTML,
   a URL, or a query without escaping. The PDF template uses `escapeHtml` on
   every interpolated value — keep it that way, and test it.
4. Model output is a _draft_. The user must review and edit every AI-generated
   figure before it becomes a sent invoice. Never auto-send or auto-finalize.
   A scanned receipt only prefills the expense form; the user saves it.
5. Backend contract — keep in sync with `docs/ARCHITECTURE.md`:
   ```
   POST /ai/draft-invoice   { prompt }
     → { clientName, items: [{ description, quantity, unitPriceMinor }],
         notes?, suggestedDueInDays }
   POST /ai/draft-reminder  { invoiceNumber, clientName, daysOverdue }
     → { subject, body }
   POST /ai/scan-receipt    { imageBase64, mimeType }
     → { merchant, date?, totalMinor, taxMinor?, currency? }
   ```
   `unitPriceMinor`, `totalMinor` and `taxMinor` are **integers in minor units**;
   `quantity` has **at most 3 decimal places** (`QuantitySchema`, matching the
   database), and one line may be worth at most `MAX_LINE_MINOR` (1e12, also the
   database's limit). A scan omits what it can't read rather than guessing, and
   `taxMinor ≤ totalMinor`. The schemas live in `src/types/ai.ts`. Changing a schema here is a breaking change: update the
   zod schema, this file, and the docs together.

---

## 8. Testing

Preset is `jest-expo`. Tests live next to what they test (`money.test.ts` beside
`money.ts`) or in a `__tests__/` folder inside the feature.

**Required coverage** (a PR without these is incomplete):

- Every money/tax/total calculation — including a case that would fail under
  float arithmetic.
- Every zod schema — one valid fixture and one malformed payload that must be
  _rejected_.
- Every feature hook's error path, not just its happy path.
- Any string that reaches the PDF template — assert it comes out escaped.
- Every RLS policy, grant, and database trigger — a pgTAP test that another
  tenant (or a lower role) is refused. Never edit a pushed migration; add one.
  `npm run db:test` runs them locally; CI runs them on every PR.

**Not required:** snapshot tests of whole screens. They lock in markup and catch
nothing. Test behaviour.

Tests are deterministic: the clock is fixed in `jest.config.js`, `fetch` throws if
unmocked, and IDs must be stubbed. Mock at the module boundary
(`@/services/api-client`), never deeper.

**Never weaken an assertion or delete a test to make CI green.** A failing test
is information.

---

## 9. Definition of done

Before saying work is complete, an agent must have:

1. Run `npm run verify` — **all green**, with the actual output shown. If
   `supabase/` changed, also `npm run db:reset && npm run db:test`.
2. Added or updated tests for the behaviour changed.
3. Checked the change on web at minimum; named any platform not verified.
4. Updated `docs/ARCHITECTURE.md` if a layer boundary or contract moved, and
   this file if a rule changed.
5. Reported honestly: what was verified, what was assumed, what was skipped.
   "It should work" is not a result. If something is broken, say it's broken.

**Git:** branches `feat/…`, `fix/…`, `chore/…`; Conventional Commits. Do not
commit or push unless explicitly asked.

---

## 10. Agent operating rules

- **Read before writing.** Open neighbouring files and match their idiom, comment
  density, and import style. Consistency beats personal preference.
- **Smallest change that fully solves it.** No opportunistic refactors, no
  renaming things you happened to read, no abstraction for one caller.
- **Do not add a dependency** without stating why the platform or existing deps
  can't do it. Every dep is bundle size, native-build risk, and maintenance.
- **Do not weaken configuration** to pass a check — not `tsconfig`, not eslint,
  not a test assertion.
- **Ask when a decision is the user's** (product behaviour, schema changes,
  anything irreversible). Decide routine mechanics yourself.
- **Never invent backend behaviour.** If an endpoint doesn't exist, say so and
  stub against the documented contract.
- Scratch files go in the session scratchpad, never in the repo.

### Sub-agents (`.claude/agents/`)

| Agent                     | Use for                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `feature-architect`       | Planning a feature's module layout and contracts before code |
| `rn-implementer`          | Building screens/components/hooks against these rules        |
| `invoice-domain-reviewer` | Auditing money, tax, date, and numbering correctness         |
| `test-author`             | Writing jest tests for logic, schemas, and hooks             |

### Skills (`.claude/skills/`)

| Skill          | Use for                                               |
| -------------- | ----------------------------------------------------- |
| `new-feature`  | Scaffolding a feature module from `_TEMPLATE`         |
| `rn-component` | Adding a token-styled, accessible shared UI component |
| `preflight`    | Running the full pre-PR gate and reporting results    |

---

## 11. Known gaps

Not defects in the code — work that hasn't been built yet. Read before filing a
bug or "fixing" something that was left deliberately.

| #   | Gap                           | Note                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Backend not deployed or wired | Supabase schema + RLS exist in `supabase/` (tested, see `docs/DATABASE.md`) but aren't pushed (CI deploys them once `SUPABASE_PROJECT_ID` is set), and the app still stores everything locally. `/ai/*` endpoints (§7), including `/ai/scan-receipt`, are unimplemented: AI drafting and receipt scanning show an error until a server answers; manual expense entry works. |
| G2  | No auth                       | Sign-up creates a `profiles` row server-side, but the app has no auth screens; `setAuthToken()` is uncalled. Tokens belong in `expo-secure-store`.                                                                                                                                                                                                                          |
| G3  | Numbers are provisional       | The client mints `DRAFT-<date>-<id>` for invoices and `DRAFT-EST-<date>-<id>` for estimates. The database's `send_invoice()` implements real gap-free numbering (§6.8); the app doesn't call it yet.                                                                                                                                                                        |
| G4  | Tax rate is fixed at 0        | `taxRateBps` is modelled, validated, tested, and rendered end to end, but no UI sets it.                                                                                                                                                                                                                                                                                    |
| G5  | Line items aren't editable    | Drafts are created from AI output (or converted from an estimate) and can only be viewed. §7.4 requires user review before sending — that UI is unbuilt. Until it exists, catalog items and logged time can't be added to an invoice.                                                                                                                                       |
| G6  | Settings are read-only        | `src/app/settings.tsx` (the header gear) displays `config`; no settings store yet.                                                                                                                                                                                                                                                                                          |
| G7  | No error boundary             | `+not-found.tsx` handles bad routes; a render throw has no defined behaviour.                                                                                                                                                                                                                                                                                               |
| G8  | Single fixed light theme      | The SDK 57 template's colour-scheme hooks were removed as unused. Dark mode means adding tokens to `src/theme`, not re-adding those hooks.                                                                                                                                                                                                                                  |
| G9  | No client records             | The Clients tab is derived from invoice history, grouped by normalized name (`nameKey`). There's no client store, contacts import, or client detail screen, so two different clients with the same name merge.                                                                                                                                                              |
| G10 | Dates are typed, not picked   | Date fields are `YYYY-MM-DD` text checked with `isRealIsoDate`; a native picker needs a new dependency. `IsoDateSchema` itself only checks the pattern, so a stored `2026-02-30` would still parse.                                                                                                                                                                         |
| G11 | "Today" is the device's day   | `dueState` and the dashboards compare against the device's calendar day. The database's `invoice_totals.is_overdue` uses the business's timezone — pass the business-local day (or use `is_overdue`) once the backend is wired.                                                                                                                                             |
| G12 | Two status colours miss AA    | `colors.accent` (#0FA37F) and `colors.warning` (#C97A12) are ~3.2:1 and ~3.3:1 on white, under WCAG AA's 4.5:1 for small text such as "Paid" and "Due today". Darker values (#0B7F63, #A15C00) pass.                                                                                                                                                                        |

`src/features/_TEMPLATE/` is scaffold, not shipped code — excluded from coverage.
