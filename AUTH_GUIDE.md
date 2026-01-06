# Ariex Authentication System

## Mock User Accounts

This project includes mock user authentication for development and testing. All users use the password: **`password`**

### Available Test Accounts

| Role | Email | Name | Description |
|------|-------|------|-------------|
| **Strategist** | `strategist@ariex.ai` | Alex Morgan | Tax strategist with 15+ years experience |
| **Client** | `client@ariex.ai` | Emily Davis | Fully onboarded client with active plan |
| **Client** | `client2@ariex.ai` | Sarah Johnson | Client with plan pending signature |
| **Client** | `client3@ariex.ai` | Robert Wilson | New client in onboarding phase |
| **Compliance** | `compliance@ariex.ai` | Jordan Chen | Compliance officer with oversight access |
| **Admin** | `admin@ariex.ai` | System Administrator | Full system access and configuration |

## Role-Based Dashboards

Each role redirects to their specific dashboard after login:

- **Admin** → `/admin/dashboard` - System administration
- **Compliance** → `/compliance/strategists` - See all strategists and their clients
- **Strategist** → `/strategist/home` - Manage clients, create strategies
- **Client** → `/client/dashboard` - View status, upload documents, tasks

## Quick Start

1. Navigate to `/login` or click "Sign In"
2. Use any email/password from the table above
3. OR click the "Quick Login" buttons to sign in instantly
4. You'll be automatically redirected to the appropriate dashboard

## Development Notes

- Authentication is controlled by `NEXT_PUBLIC_AUTH_BYPASS=true` in `.env`
- User sessions persist in localStorage during development
- Mock users are defined in `src/contexts/auth/data/mock-users.ts`
- Role-based routing is handled by `useRoleRedirect` hook

## Features

✅ Role-based authentication (Admin, Compliance, Strategist, Client)
✅ Persistent sessions (localStorage + cookies)
✅ Role-based route protection via middleware
✅ Automatic redirects to correct dashboard
✅ Authenticated users cannot access login page
✅ Users cannot access routes outside their role permissions
✅ Logout functionality
✅ User profile display in header

## Route Protection

### Middleware-Level Protection

The application uses Next.js middleware to enforce route access rules:

**1. Authenticated users cannot access login**
- If logged in, visiting `/login` redirects to your role's dashboard

**2. Role-based route restrictions**
```
/admin/*       → Only ADMIN
/compliance/*  → COMPLIANCE and ADMIN
/strategist/*  → STRATEGIST and ADMIN  
/client/*      → CLIENT and ADMIN
```

**3. Unauthenticated access**
- Trying to access protected routes redirects to `/login`
- Public routes (/, /pricing, /about) are always accessible

### How It Works

1. **Login**: User credentials → Set cookies (`ariex_user_role`, `ariex_user_id`)
2. **Middleware**: Checks cookies on every request → Enforces access rules
3. **Client**: React hooks verify auth state → Handle client-side navigation
4. **Logout**: Clears cookies and localStorage → Redirects to login

## Testing Different Roles

To test different user perspectives:

1. Logout from current account
2. Login with a different role's credentials
3. Observe role-specific UI and permissions
4. Each role has a tailored dashboard and features

### Testing Route Protection

**Test 1: Cannot access login when authenticated**
1. Login as any user
2. Try to navigate to `/login`
3. ✅ You should be redirected to your dashboard

**Test 2: Role-based access control**
1. Login as CLIENT (`client@ariex.ai`)
2. Try to navigate to `/strategist/home`
3. ✅ You should be redirected to `/client/dashboard`

**Test 3: Unauthenticated access**
1. Logout completely
2. Try to navigate to `/client/dashboard`
3. ✅ You should be redirected to `/login`

**Test 4: Admin has access to all**
1. Login as ADMIN (`admin@ariex.ai`)
2. Navigate to any role's dashboard
3. ✅ Admin can access all routes
