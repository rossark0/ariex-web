# Route Protection Architecture

## Protection Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     USER REQUESTS ROUTE                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   MIDDLEWARE (Server-Side)                  │
│                                                             │
│  1. Check cookies: ariex_user_role, ariex_user_id          │
│  2. If /login + authenticated → Redirect to dashboard      │
│  3. If protected route + not authenticated → /login        │
│  4. If wrong role for route → Redirect to own dashboard    │
│  5. Allow if authorized                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PAGE COMPONENT (Client-Side)               │
│                                                             │
│  useRoleRedirect('ROLE') hook:                             │
│  - Verifies user auth state from Zustand                   │
│  - Double-checks role permissions                          │
│  - Handles client-side navigation                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       RENDER PAGE                           │
└─────────────────────────────────────────────────────────────┘
```

## Route Access Matrix

| Route Pattern | ADMIN | COMPLIANCE | STRATEGIST | CLIENT |
|---------------|-------|------------|------------|--------|
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/compliance/*` | ✅ | ✅ | ❌ | ❌ |
| `/strategist/*` | ✅ | ❌ | ✅ | ❌ |
| `/client/*` | ✅ | ❌ | ❌ | ✅ |
| `/login` (when authenticated) | ❌ → /admin/dashboard | ❌ → /compliance/strategists | ❌ → /strategist/home | ❌ → /client/dashboard |
| `/` (public) | ✅ | ✅ | ✅ | ✅ |

## Actual Routes Per Role

### Admin Routes
- `/admin/dashboard` - Main admin dashboard

### Compliance Routes
- `/compliance/strategists` - All strategists list (main page)
- `/compliance/strategists/[strategistId]` - Strategist's clients
- `/compliance/clients/[clientId]` - Client detail with strategy access
- `/compliance/clients/[clientId]/strategy` - View strategy document
- `/compliance/clients/[clientId]/comments` - Internal comments (Compliance ↔ Strategist)
- `/compliance/clients/[clientId]/documents` - Client documents
- `/compliance/clients/[clientId]/payments` - Client payments
- `/compliance/clients/[clientId]/onboarding` - Client onboarding
- `/compliance/clients/[clientId]/tasks` - Client tasks

### Strategist Routes
- `/strategist/home` - Main strategist home (clients list)
- `/strategist/clients` - Clients list view
- `/strategist/clients/[clientId]` - Client detail with timeline
- `/strategist/clients/[clientId]/documents` - Client documents
- `/strategist/clients/[clientId]/billing` - Payment links
- `/strategist/clients/[clientId]/payments` - Payment history
- `/strategist/clients/[clientId]/signature` - Send for signature

### Client Routes
- `/client/dashboard` - Main client dashboard
- `/client/uploads` - Document upload and management
- `/client/agreements` - Agreements to sign
- `/client/billing` - Payments and invoices
- `/client/tasks` - To-do list

## Implementation Files

### 1. Middleware (`src/middleware.ts`)
- Runs on every request (server-side)
- Checks cookies for auth state
- Enforces role-based access rules
- Redirects unauthorized requests

### 2. Auth Store (`src/contexts/auth/AuthStore.ts`)
- Manages auth state with Zustand
- Sets both localStorage AND cookies on login
- Cookies enable middleware to read auth state
- Clears both on logout

### 3. Role Redirect Hook (`src/hooks/use-role-redirect.ts`)
- Client-side protection layer
- Used in page components: `useRoleRedirect('ROLE')`
- Verifies user has correct role
- Redirects if permissions don't match

### 4. Login Page (`src/app/(marketing)/login/page.tsx`)
- Checks if already authenticated
- Redirects to dashboard if logged in
- Prevents accessing login when authenticated

## Security Flow Examples

### Example 1: Client tries to access Strategist Dashboard

```
1. Client navigates to /strategist/dashboard
   ↓
2. Middleware reads cookie: ariex_user_role=CLIENT
   ↓
3. Checks access rules: /strategist/* requires STRATEGIST or ADMIN
   ↓
4. CLIENT not in allowed roles
   ↓
5. Middleware redirects → /client/dashboard
```

### Example 2: Strategist visits Login while authenticated

```
1. Strategist navigates to /login
   ↓
2. Middleware reads cookie: ariex_user_role=STRATEGIST
   ↓
3. Detects /login + authenticated user
   ↓
4. Middleware redirects → /strategist/home
```

### Example 3: Unauthenticated user tries protected route

```
1. No cookies present (not logged in)
   ↓
2. User tries /client/dashboard
   ↓
3. Middleware: No authentication cookies found
   ↓
4. Protected route requires authentication
   ↓
5. Middleware redirects → /login
```

## Cookie Management

**Set on Login:**
```typescript
document.cookie = `ariex_user_role=${user.role}; path=/; max-age=86400`;
document.cookie = `ariex_user_id=${user.id}; path=/; max-age=86400`;
```

**Cleared on Logout:**
```typescript
document.cookie = 'ariex_user_role=; path=/; max-age=0';
document.cookie = 'ariex_user_id=; path=/; max-age=0';
```

**Read by Middleware:**
```typescript
const userRole = request.cookies.get('ariex_user_role')?.value;
const userId = request.cookies.get('ariex_user_id')?.value;
```

## Benefits

✅ **Server-side protection** - Middleware runs before page loads
✅ **Client-side validation** - React hooks provide additional safety
✅ **No flash of wrong content** - Redirects happen before render
✅ **Admin override** - Admin role can access all routes
✅ **Type-safe** - TypeScript ensures role consistency
