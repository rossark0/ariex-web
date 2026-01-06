# Service Utilities - Quick Reference

This document provides a quick reference for the service utilities available in this project.

## Environment Variables

Add to your `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_CORE_URL=https://your-api-url.com
```

## Available Utilities

### 1. API Request Functions (`src/utils/services/api.ts`)

Server-side functions for making API requests:

```typescript
import { authenticatedRequest, notAuthenticatedRequest, deleteApi } from "@/src/utils/services/api"

// Authenticated GET request
const data = await authenticatedRequest("/users/me")

// Authenticated POST request
const result = await authenticatedRequest("/documents", {
  method: "POST",
  body: JSON.stringify({ title: "My Doc" }),
})

// Unauthenticated request (login, public endpoints)
const loginResult = await notAuthenticatedRequest("/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
})

// DELETE request
await deleteApi("/documents/123")
```

**Key Features:**
- Automatic authentication header injection
- Automatic sign-out on 401 errors
- JSON/text response parsing
- Error handling

---

### 2. Response Wrapper (`src/utils/services/tryAndResponde.ts`)

Wraps server actions with standardized error handling:

```typescript
"use server"

import { tryCatchResponse } from "@/src/utils/services/tryAndResponde"
import type ServiceResponse from "@/src/utils/services/tryAndResponde"
import { authenticatedRequest } from "@/src/utils/services/api"

export async function fetchUserData(userId: string): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Fetch User Data", async () => {
    const data = await authenticatedRequest(`/users/${userId}`)
    
    return {
      response: data,
      hasError: false,
      message: "Success",
    }
  })
}
```

**Returns:**
```typescript
{
  message: string
  response: T
  details?: any
  status?: number
  hasError: boolean
}
```

---

### 3. Client-Side Middleware (`src/utils/services/server-loading-middleware.ts`)

Handles loading states and toast notifications in client components:

```typescript
"use client"

import { useState } from "react"
import { serverLoadingMiddleware } from "@/src/utils/services/server-loading-middleware"
import { createDocument } from "@/actions/documents"

export function MyForm() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: any) => {
    const result = await serverLoadingMiddleware(
      "Document created!",           // Success message
      "Failed to create document",   // Error message
      () => createDocument(formData), // Server action
      setLoading,                    // Loading state setter
      {
        successDescription: "You can view it now",
        dontShowSuccessMessage: false,
        dontShowErrorMessage: false,
      }
    )

    if (!result?.hasError) {
      // Handle success
    }
  }
}
```

**Features:**
- Automatic loading state management
- Toast notifications (success/error)
- Firebase error translation
- JSON validation error parsing
- Global loading tracking

---

### 4. Polling Component (`src/utils/services/poling.tsx`)

Polls a function until a condition is met:

```typescript
"use client"

import { useState } from "react"
import Poling from "@/src/utils/services/poling"
import { checkStatus } from "@/actions/status"

export function StatusChecker() {
  const [isChecking, setIsChecking] = useState(false)

  return (
    <>
      <button onClick={() => setIsChecking(true)}>Check Status</button>
      
      <Poling
        polingFunction={async () => {
          const result = await checkStatus()
          return result.response.data
        }}
        polingRule={(content) => content?.status === "completed"}
        onSucceed={(content) => console.log("Done:", content)}
        onError={() => console.log("Timeout")}
        isPoling={isChecking}
        setIsPoling={setIsChecking}
        maxCount={20}       // Max attempts
        timeout={3000}      // 3 seconds between polls
      />
    </>
  )
}
```

---

## Complete Pattern

Here's how all utilities work together:

```typescript
// ========================================
// 1. Server Action (services/document.service.ts)
// ========================================
"use server"

import { tryCatchResponse } from "@/src/utils/services/tryAndResponde"
import type ServiceResponse from "@/src/utils/services/tryAndResponde"
import { authenticatedRequest } from "@/src/utils/services/api"

export async function createDocument(data: any): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Create Document", async () => {
    const result = await authenticatedRequest("/documents", {
      method: "POST",
      body: JSON.stringify(data),
    })
    
    return {
      response: result,
      hasError: false,
      message: "Document created",
    }
  })
}

// ========================================
// 2. Client Component (components/document-form.tsx)
// ========================================
"use client"

import { useState } from "react"
import { serverLoadingMiddleware } from "@/src/utils/services/server-loading-middleware"
import { createDocument } from "@/services/document.service"

export function DocumentForm() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    const result = await serverLoadingMiddleware(
      "Document created!",
      "Failed to create document",
      () => createDocument(data),
      setLoading
    )

    if (!result?.hasError) {
      console.log("Success:", result.response.data)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit({ title: "Test", content: "Content" })
    }}>
      <button disabled={loading}>
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  )
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/utils/services/api.ts` | API request functions |
| `src/utils/services/tryAndResponde.ts` | Response wrapper interface |
| `src/utils/services/server-loading-middleware.ts` | Client-side middleware |
| `src/utils/services/poling.tsx` | Polling component |
| `src/contexts/auth/services/auth.services.ts` | Auth utilities |
| `src/contexts/loading/LoadingStore.ts` | Global loading state |

---

## Example Implementations

Complete working examples are available in:

- `src/contexts/documents/services/documents.service.ts` - Server actions
- `src/contexts/documents/components/document-form-example.tsx` - Form with middleware
- `src/contexts/documents/components/document-processor-example.tsx` - Polling example
- `src/contexts/documents/components/complete-workflow-example.tsx` - All utilities together

---

## Troubleshooting

### Issue: "API base URL not configured"
**Solution:** Set `NEXT_PUBLIC_API_CORE_URL` in your `.env.local` file.

### Issue: Toast not showing
**Solution:** The toast system is built-in. Make sure you're using the correct import path.

### Issue: Authentication errors
**Solution:** Check that:
1. Access token is set in cookies as `nextauth.accessToken`
2. Backend is returning 401 for invalid tokens
3. `signOutCleanup()` is properly configured

### Issue: Polling never stops
**Solution:** Ensure your `polingRule` function eventually returns `true` and set a reasonable `maxCount`.

---

## Best Practices

1. **Always wrap server actions** with `tryCatchResponse`
2. **Always use `serverLoadingMiddleware`** when calling server actions from client
3. **Set reasonable polling limits** (maxCount and timeout)
4. **Handle errors gracefully** - don't rely only on toasts
5. **Keep server actions focused** - one action, one responsibility

---

For detailed recipes and more examples, see `PROJECT_STRUCTURE.md` lines 183-1004.









