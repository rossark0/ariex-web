# SLC SaaS Boilerplate

Next.js App Router boilerplate for shipping Simple, Lovable, Complete SaaS.

Stack: Next.js, Resend (emails), Tailwind v4 + shadcn/ui. Uses pnpm and a src/ directory. Files are kebab-case by default; Zustand stores are PascalCase (exception).

— UI components are managed with shadcn/ui. See: [shadcn Next.js install](https://ui.shadcn.com/docs/installation/next).

## Quick start

Prerequisites:
- Node.js 20+
- pnpm 10+

Setup:
```bash
pnpm install
cp .env.example .env # fill with your keys
pnpm dev
```
App will be available at http://localhost:3000.

## Architecture (why this scales)

This boilerplate uses a feature-context architecture powered by vanilla Zustand stores. Each context is a vertical slice (data, models, services, UI) that owns its state and API access. This keeps concerns close together, prevents cross-feature coupling, and lets teams iterate independently.

- State with vanilla Zustand: stores live outside React, enabling light subscriptions via `useSyncExternalStore`, zero Provider nesting, and easy unit testing.
- Server Actions as BFF: services call external/internal APIs using Next.js Server Actions (`'use server'`), so the browser never holds secrets and requests stay fast within the same deployment.
- Route groups split marketing vs app concerns, keeping public and "app" code separate.
- All files kebab-case for consistency; only store files use PascalCase (e.g., `GenericStore.ts`) to make the state entry-point obvious.

Result: add a new feature by creating a new context folder; no global plumbing or cross-cutting edits are required. This minimizes merge conflicts and scales across teams.

## Environment variables
Copy `.env.example` to `.env` and fill:

- `RESEND_API_KEY`: Resend API key
- `NEXT_PUBLIC_APP_URL`: Base URL for links (e.g., http://localhost:3000)

## Scripts
```bash
pnpm dev        # run next dev with Turbopack
pnpm build      # production build
pnpm start      # start production server
pnpm lint       # run eslint
```

## Project layout

Route groups split marketing pages from the app. Kebab-case for files, except Zustand stores.

```
src/
  app/
    (marketing)/
      layout.tsx
      page.tsx            # Landing
      pricing/
        page.tsx
    (app)/
      layout.tsx
      dashboard/
        page.tsx
      settings/
        page.tsx
      billing/
        page.tsx
    api/
      health/route.ts
  components/
    layout/{header.tsx,footer.tsx,theme-toggle.tsx}
    nav/main-nav.tsx
    ui/*  # shadcn components
  contexts/
    generic/
      GenericStore.ts      # Zustand store (PascalCase by convention)
      components/ data/ models/ services/ utils/
  emails/templates/
    welcome-email.tsx trial-started-email.tsx trial-ending-email.tsx payment-failed-email.tsx
  hooks/
    use-auth-redirect.ts
  lib/
    email.ts utils.ts
    validators/user.ts
  types/
    env.d.ts user.ts
  utils/
    fetcher.ts format-date.ts
middleware.ts
```

## Folder purposes

- `src/app/`: App Router routes. `(marketing)` for public pages, `(app)` for authenticated app, `api/` for route handlers (webhooks, health, scheduled tasks).
- `src/components/`: Reusable UI building blocks (flexbox layouts by default). `ui/` is managed by shadcn/ui.
- `src/contexts/`: Feature contexts. Each context is self-contained with:
  - `GenericStore.ts`: Vanilla Zustand store (PascalCase is intentional). Exports store hooks and selectors.
  - `data/`: Mocks and validation messages.
  - `models/`: Zod schemas and TS models for this context's API.
  - `services/`: Server Actions that call APIs or DB.
  - `components/`: Feature-specific components.
  - `utils/`: Utilities local to the feature.
- `src/emails/`: React email templates for Resend.
- `src/hooks/`: Cross-cutting client hooks (e.g., redirects).
- `src/lib/`: App-level helpers, validators.
- `src/types/`: Global shared types.
- `src/utils/`: Global utilities (fetcher, formatting).

## Contexts: naming and conventions

- Folder name: the feature name in kebab-case (e.g., `checkout`, `products`).
- File names inside a context: `nameofthecontext-name-of-the-file.ts(x)`.
- Single exception: the Zustand store file is PascalCase and equals the context name plus `Store.ts`. Example for `generic`:
  - `GenericStore.ts`
  - `data/generic-validation.ts`
  - `models/generic.ts`
  - `services/generic.service.ts`
  - `components/generic-example.tsx`

## How to use a context (example: generic)

1) Select from the store in a client component and call a Server Action from `services/`:

```tsx
"use client"
import { useEffect } from "react"
import { useGeneric, selectItems, selectIsLoading } from "@/src/contexts/generic/GenericStore"
import { fetchGenericItems } from "@/src/contexts/generic/services/generic.service"

export default function Example() {
  const items = useGeneric(selectItems)
  const isLoading = useGeneric(selectIsLoading)
  const { setItems, startLoading, stopLoading } = useGeneric(s => ({
    setItems: s.setItems,
    startLoading: s.startLoading,
    stopLoading: s.stopLoading
  }))

  useEffect(() => {
    let mounted = true
    ;(async () => {
      startLoading()
      const data = await fetchGenericItems()
      if (mounted) setItems(data)
      stopLoading()
    })()
    return () => { mounted = false }
  }, [setItems, startLoading, stopLoading])

  return <pre>{JSON.stringify({ isLoading, items }, null, 2)}</pre>
}
```

2) Service (Server Action) example:

```ts
// src/contexts/generic/services/generic.service.ts
import type { GenericItem } from "../GenericStore"
import { genericItemsMock } from "../data/generic-mocks"

export const dynamic = "force-dynamic"

export async function fetchGenericItems(): Promise<GenericItem[]> {
  'use server'
  await new Promise(r => setTimeout(r, 200))
  return genericItemsMock
}
```

3) Zod model example:

```ts
// src/contexts/generic/models/generic.ts
import { z } from "zod"
import { create_generic_item_errors } from "../data/generic-validation"

export const genericItemSchema = z.object({
  id: z.string().optional(),
  title: z.string({ required_error: create_generic_item_errors.title }),
  createdAt: z.string().optional()
})
```

## Emails (Resend)
- Transactional emails with React templates live in `src/emails/templates/`.
- Recommended templates: Welcome, Trial Started, Trial Ending Soon, Payment Failed.
- Set up a verified sending domain (DKIM) in Resend and store the `RESEND_API_KEY`.

Example send helper (see `src/lib/email.ts`):
```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string) {
  await resend.emails.send({
    from: 'Team <hello@example.com>',
    to,
    subject: 'Welcome',
    react: /* JSX from emails/templates/welcome-email */ null
  })
}
```

## UI & Styling
- Tailwind CSS v4 with shadcn/ui.
- Base theme: Zinc (dark/light via theme toggle).
- Prefer flexbox layouts over CSS grid per project conventions.

Adding UI components:
```bash
pnpm dlx shadcn@latest add button input card
```
See the docs: [shadcn Next.js install](https://ui.shadcn.com/docs/installation/next)

## Conventions
- File naming: kebab-case for files, exception for Zustand stores (e.g., `GenericStore.ts`).
- TypeScript: non-strict.
- Environment-specific configuration is stored only in `.env` and deployment env vars.
- All new routes and components should live under `src/`.


## Troubleshooting
- Emails not sending: verify Resend domain verification and API key.

## References
- shadcn/ui (Next.js): https://ui.shadcn.com/docs/installation/next
- Next.js: https://nextjs.org/docs

