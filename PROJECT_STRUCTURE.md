# Project Structure

This document provides an overview of the project structure based on the SLC SaaS Boilerplate architecture.

## Directory Overview

```
src/
├── app/                          # Next.js App Router
│   ├── (marketing)/             # Public marketing pages
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing page
│   │   └── pricing/
│   │       └── page.tsx
│   ├── (app)/                   # Authenticated app pages
│   │   ├── layout.tsx           # App layout with sidebar & theme toggle
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── billing/
│   │       └── page.tsx
│   ├── api/                     # API routes & webhooks
│   │   ├── health/
│   │   │   └── route.ts         # Health check endpoint
│   │   └── clerk/
│   │       └── webhook/
│   │           └── route.ts
│   ├── globals.css
│   └── layout.tsx               # Root layout with providers
│
├── components/
│   ├── layout/                  # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── theme-toggle.tsx     # Dark/light mode toggle
│   ├── nav/
│   │   └── main-nav.tsx         # Main navigation component
│   ├── providers/
│   │   └── theme-provider.tsx   # Theme provider wrapper
│   └── ui/                      # shadcn/ui components
│
├── contexts/                    # Feature contexts (vertical slices)
│   └── generic/                 # Example context
│       ├── GenericStore.ts      # Vanilla Zustand store (PascalCase)
│       ├── data/
│       │   ├── generic-mocks.ts
│       │   └── generic-validation.ts
│       ├── models/
│       │   └── generic.ts       # Zod schemas
│       ├── services/
│       │   └── generic.service.ts  # Server Actions
│       ├── components/
│       │   └── generic-example.tsx
│       └── utils/
│           └── generic-helpers.ts
│
├── emails/
│   └── templates/               # React email templates
│       ├── welcome-email.tsx
│       ├── trial-started-email.tsx
│       ├── trial-ending-email.tsx
│       └── payment-failed-email.tsx
│
├── hooks/                       # Cross-cutting React hooks
│   └── use-auth-redirect.ts
│
├── lib/                         # App-level utilities
│   ├── email.ts                 # Email sending functions
│   ├── utils.ts                 # General utilities
│   └── validators/
│       └── user.ts              # User validation schemas
│
├── types/                       # Global TypeScript types
│   ├── api.ts
│   ├── env.d.ts
│   └── user.ts
│
├── utils/                       # Global utility functions
│   ├── fetcher.ts               # API fetching utilities
│   └── format-date.ts           # Date formatting utilities
│
└── middleware.ts                # Next.js middleware (Clerk auth)
```

## Architecture Principles

### 1. Feature-Context Architecture

Each feature is organized as a self-contained "context" with:
- **Store**: Vanilla Zustand store for state management
- **Data**: Mock data and validation messages
- **Models**: Zod schemas for type-safe validation
- **Services**: Server Actions for API calls
- **Components**: Feature-specific UI components
- **Utils**: Feature-specific utility functions

### 2. Naming Conventions

- **Files**: kebab-case (e.g., `user-profile.tsx`)
- **Zustand Stores**: PascalCase (e.g., `GenericStore.ts`)
- **Context files**: `contextname-description.ts(x)` (e.g., `generic-validation.ts`)

### 3. State Management

- **Vanilla Zustand**: Stores live outside React
- **Selective subscriptions**: Components subscribe only to needed state
- **No Provider hell**: Direct store access without nesting

### 4. Data Fetching

- **Server Actions**: Use `'use server'` directive
- **BFF Pattern**: Browser never holds secrets
- **Type-safe**: Zod validation on inputs/outputs

### 5. Styling

- **Tailwind CSS v4**
- **shadcn/ui components**
- **Flexbox over Grid** (project convention)
- **Dark/Light mode** via next-themes

## Adding a New Context

To add a new feature context (e.g., `products`):

1. Create the directory structure:
```bash
mkdir -p src/contexts/products/{data,models,services,components,utils}
```

2. Create the Zustand store (`ProductsStore.ts`):
```typescript
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

interface ProductsState {
  // Your state here
}

export const productsStore = createStore<ProductsState>((set) => ({
  // Initial state and actions
}))

export const useProducts = <T,>(selector: (state: ProductsState) => T): T => {
  return useStore(productsStore, selector)
}
```

3. Add models, services, components as needed
4. Import and use in your pages

## Key Files

- `src/app/layout.tsx` - Root layout with ClerkProvider and ThemeProvider
- `src/app/(app)/layout.tsx` - Authenticated app layout with sidebar
- `src/contexts/generic/GenericStore.ts` - Example Zustand store pattern
- `src/lib/email.ts` - Email sending utilities with Resend
- `src/middleware.ts` - Authentication middleware
- `package.json` - Dependencies and scripts

## Environment Variables

See `.env.example` for required environment variables:
- `RESEND_API_KEY` - For sending emails
- `NEXT_PUBLIC_APP_URL` - Application base URL

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Resend Documentation](https://resend.com/docs)


# Services Utilities - Usage Guide 🧰

This guide provides detailed recipes for using each service utility in the application. These utilities help you handle API requests, loading states, error handling, and polling operations consistently across the application.

---

## Table of Contents
1. [api.ts - API Request Utilities](#1-apits---api-request-utilities)
2. [tryAndResponde.ts - Service Response Wrapper](#2-tryandrespondets---service-response-wrapper)
3. [server-loading-middleware.ts - Server Response Handler](#3-server-loading-middlewarets---server-response-handler)
4. [poling.tsx - Polling Component](#4-polingtsx---polling-component)

---

## 1. api.ts - API Request Utilities

### Overview
Provides three main functions for making HTTP requests to your backend API with automatic error handling and authentication management.

### Functions

#### `authenticatedRequest(url, options)`
Makes authenticated API requests using the access token from cookies.

**Parameters:**
- `url` (string): Endpoint path starting with "/" (e.g., "/users/profile")
- `options` (RequestInit): Optional fetch options (method, body, headers, etc.)

**Returns:**
- JSON object if response is JSON
- Text string for non-JSON responses

**Throws:**
- Error if API URL not configured
- Error if endpoint doesn't start with "/"
- AuthTokenError on 401 (triggers sign out)
- Error with API error message on other failures

**Recipe Example:**

```typescript
"use server";

import { authenticatedRequest } from "@/utils/services/api";

// GET request
export async function getUserProfile() {
  return await authenticatedRequest("/users/me");
}

// POST request with body
export async function updateUserProfile(data: any) {
  return await authenticatedRequest("/users/me", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// PUT request
export async function uploadDocument(documentData: any) {
  return await authenticatedRequest("/documents/upload", {
    method: "PUT",
    body: JSON.stringify(documentData),
  });
}
```

---

#### `notAuthenticatedRequest(url, options)`
Makes unauthenticated API requests (e.g., login, register, public endpoints).

**Parameters:**
- `url` (string): Endpoint path starting with "/"
- `options` (RequestInit): Optional fetch options

**Returns:**
- JSON object or text string

**Recipe Example:**

```typescript
"use server";

import { notAuthenticatedRequest } from "@/utils/services/api";

// Login endpoint
export async function loginUser(email: string, password: string) {
  return await notAuthenticatedRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Public data endpoint
export async function getPublicContent() {
  return await notAuthenticatedRequest("/public/content");
}
```

---

#### `deleteApi(url, options)`
Makes authenticated DELETE requests.

**Parameters:**
- `url` (string): Endpoint path starting with "/"
- `options` (RequestInit): Optional fetch options

**Returns:**
- void (no return value)

**Recipe Example:**

```typescript
"use server";

import { deleteApi } from "@/utils/services/api";

export async function deleteDocument(documentId: string) {
  await deleteApi(`/documents/${documentId}`);
}

export async function removeUserFromTeam(userId: string, teamId: string) {
  await deleteApi(`/teams/${teamId}/members/${userId}`);
}
```

---

### Important Notes:
- All functions are server-side only (`"use server"`)
- Requires `NEXT_PUBLIC_API_CORE_URL` environment variable
- Automatically handles authentication tokens from cookies
- Automatically signs out user on 401 errors
- Always sets `Content-Type: application/json` header

---

## 2. tryAndResponde.ts - Service Response Wrapper

### Overview
Provides a standardized response structure and try-catch wrapper for server actions, ensuring consistent error handling across the application.

### Interface: `ServiceResponse<T>`

**Properties:**
- `message` (string): Status or error message
- `response` (T): The actual response data
- `details?` (any): Optional additional details
- `status?` (number): Optional HTTP status code
- `hasError` (boolean): Indicates if an error occurred

---

### Function: `tryCatchResponse(name, method)`

Wraps your server action with automatic error handling and standardized response format.

**Parameters:**
- `name` (string): Descriptive name for logging
- `method` (() => Promise<ServiceResponse<any>>): Your async function to execute

**Returns:**
- ServiceResponse object with either success data or error information

**Recipe Example:**

```typescript
"use server";

import { tryCatchResponse } from "@/utils/services/tryAndResponde";
import ServiceResponse from "@/utils/services/tryAndResponde";
import { authenticatedRequest } from "@/utils/services/api";

// Example 1: Simple data fetch
export async function fetchUserData(userId: string): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Fetch User Data", async () => {
    const data = await authenticatedRequest(`/users/${userId}`);
    return {
      response: data,
      hasError: false,
      message: "Success",
    };
  });
}

// Example 2: Create operation
export async function createProject(projectData: any): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Create Project", async () => {
    const result = await authenticatedRequest("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
    
    return {
      response: result,
      hasError: false,
      message: "Project created successfully",
    };
  });
}

// Example 3: Complex operation with validation
export async function processPayment(paymentData: any): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Process Payment", async () => {
    // Your business logic here
    const validation = await authenticatedRequest("/payments/validate", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
    
    if (!validation.valid) {
      return {
        response: null,
        hasError: true,
        message: "Payment validation failed",
        details: validation.errors,
      };
    }
    
    const result = await authenticatedRequest("/payments/process", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
    
    return {
      response: result,
      hasError: false,
      message: "Payment processed successfully",
    };
  });
}
```

---

### How It Works:
1. Logs the operation start with the provided name
2. Executes your method
3. On success: Returns normalized success response
4. On error: Catches exception and returns error response with message
5. Always returns ServiceResponse structure for consistent handling

---

## 3. server-loading-middleware.ts - Server Response Handler

### Overview
Client-side middleware that handles ServiceResponse objects from server actions. It manages loading states, displays toast notifications, and handles various error formats (Firebase errors, BadRequest exceptions, JSON validation errors).

### Function: `serverLoadingMiddleware(successMessage, errorMessage, method, setLoading, options)`

**Parameters:**
- `successMessage` (string): Toast title on success
- `errorMessage` (string): Toast title on error (may be overridden by specific errors)
- `method` (() => Promise<ServiceResponse<any>>): Your server action wrapped with tryCatchResponse
- `setLoading` (function): State setter or function to control loading state
- `options?` (object): Optional configuration
  - `dontShowSuccessMessage?` (boolean): Skip success toast
  - `dontShowErrorMessage?` (boolean): Skip error toast
  - `successDescription?` (string): Additional success message details

**Returns:**
- ServiceResponse object from your method

**Recipe Example:**

```typescript
"use client";

import { useState } from "react";
import { serverLoadingMiddleware } from "@/utils/services/server-loading-middleware";
import { createProject } from "@/actions/projects"; // Your server action

export function CreateProjectForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await serverLoadingMiddleware(
      "Projeto criado com sucesso!", // Success message
      "Erro ao criar projeto", // Error message
      () => createProject(formData), // Your server action
      setLoading, // Loading state setter
      {
        successDescription: "Você já pode começar a trabalhar nele",
        dontShowSuccessMessage: false,
      }
    );
    
    if (!result?.hasError) {
      // Handle success (e.g., redirect, reset form)
      console.log("Project created:", result.response);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Project name"
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Criando..." : "Criar Projeto"}
      </button>
    </form>
  );
}
```

---

### Advanced Recipe: Silent Error Handling

```typescript
"use client";

import { useState } from "react";
import { serverLoadingMiddleware } from "@/utils/services/server-loading-middleware";
import { checkAvailability } from "@/actions/validation";

export function UsernameChecker() {
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const checkUsername = async () => {
    const result = await serverLoadingMiddleware(
      "Disponível!",
      "Username não disponível",
      () => checkAvailability(username),
      setChecking,
      {
        dontShowErrorMessage: true, // Don't show error toast
      }
    );
    
    // Handle result manually
    setAvailable(!result?.hasError);
  };

  return (
    <div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={checkUsername}
      />
      {checking && <span>Verificando...</span>}
      {available !== null && (
        <span>{available ? "✓ Disponível" : "✗ Não disponível"}</span>
      )}
    </div>
  );
}
```

---

### Error Handling Features:
1. **Firebase Auth Errors**: Automatically translates Firebase error codes to user-friendly messages
2. **BadRequest Exceptions**: Extracts clean error messages from backend exceptions
3. **JSON Validation Errors**: Parses and displays field validation errors
4. **Generic Errors**: Fallback handling for unexpected errors
5. **Global Loading Tracking**: Integrates with LoadingStore for app-wide loading indicators

---

## 4. poling.tsx - Polling Component

### Overview
A React component that repeatedly calls a function at intervals until a condition is met or maximum attempts are reached. Useful for checking status updates, waiting for async processes to complete, or monitoring changes.

### Component Props

**Required:**
- `polingFunction` (() => Promise<any>): Function to call repeatedly
- `polingRule` ((content: any) => boolean): Condition to check - returns true when polling should stop successfully
- `onSucceed` ((content: any) => void): Callback when polling succeeds
- `setIsPoling` (function): State setter to control polling
- `isPoling` (boolean): Whether polling is active

**Optional:**
- `beforePolingMethod?` (() => Promise<any>): Runs once before first poll
- `onError?` (() => void): Callback when max attempts reached without success
- `maxCount?` (number): Maximum polling attempts (default: 10)
- `timeout?` (number): Milliseconds between polls (default: 3000)

---

### Recipe Example: Document Processing Status

```typescript
"use client";

import { useState } from "react";
import Poling from "@/utils/services/poling";
import { checkDocumentStatus, startDocumentProcessing } from "@/actions/documents";

export function DocumentProcessor({ documentId }: { documentId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");

  const startProcessing = () => {
    setIsProcessing(true);
    setStatus("processing");
  };

  return (
    <div>
      <button onClick={startProcessing} disabled={isProcessing}>
        Processar Documento
      </button>
      
      {status === "processing" && <p>Processando...</p>}
      {status === "completed" && <p>✓ Concluído!</p>}
      {status === "error" && <p>✗ Erro no processamento</p>}

      <Poling
        // Start the processing on first poll
        beforePolingMethod={async () => {
          await startDocumentProcessing(documentId);
        }}
        
        // Check status every 3 seconds
        polingFunction={async () => {
          const result = await checkDocumentStatus(documentId);
          return result.response.data;
        }}
        
        // Stop when status is "completed"
        polingRule={(content) => {
          return content?.status === "completed";
        }}
        
        // Handle success
        onSucceed={(content) => {
          console.log("Processing completed:", content);
          setStatus("completed");
        }}
        
        // Handle failure (max attempts reached)
        onError={() => {
          console.log("Processing timeout");
          setStatus("error");
        }}
        
        isPoling={isProcessing}
        setIsPoling={setIsProcessing}
        maxCount={20} // Try 20 times
        timeout={3000} // Every 3 seconds
      />
    </div>
  );
}
```

---

### Recipe Example: Payment Verification

```typescript
"use client";

import { useState } from "react";
import Poling from "@/utils/services/poling";
import { verifyPaymentStatus } from "@/actions/payments";

export function PaymentVerification({ orderId }: { orderId: string }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  const checkPayment = () => {
    setIsVerifying(true);
  };

  return (
    <div>
      <button onClick={checkPayment}>Verificar Pagamento</button>
      
      {isVerifying && <div>Aguardando confirmação do pagamento...</div>}
      
      {paymentStatus === "confirmed" && (
        <div>✓ Pagamento confirmado!</div>
      )}

      <Poling
        polingFunction={async () => {
          const result = await verifyPaymentStatus(orderId);
          return result.response.data;
        }}
        
        polingRule={(content) => {
          // Stop if payment is confirmed or failed
          return ["confirmed", "failed"].includes(content?.status);
        }}
        
        onSucceed={(content) => {
          setPaymentStatus(content.status);
          if (content.status === "confirmed") {
            // Redirect to success page, etc.
          }
        }}
        
        onError={() => {
          setPaymentStatus("timeout");
          // Show error message
        }}
        
        isPoling={isVerifying}
        setIsPoling={setIsVerifying}
        maxCount={30} // 30 attempts
        timeout={2000} // Every 2 seconds = 1 minute total
      />
    </div>
  );
}
```

---

### Recipe Example: Simple Polling Without Before Method

```typescript
"use client";

import { useState } from "react";
import Poling from "@/utils/services/poling";
import { getServerHealth } from "@/actions/health";

export function ServerHealthMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [serverStatus, setServerStatus] = useState<"online" | "offline">("offline");

  return (
    <div>
      <button onClick={() => setIsMonitoring(!isMonitoring)}>
        {isMonitoring ? "Parar Monitoramento" : "Monitorar Servidor"}
      </button>
      
      <div>Status: {serverStatus}</div>

      <Poling
        polingFunction={async () => {
          const result = await getServerHealth();
          return result.response.data;
        }}
        
        polingRule={(content) => {
          // Consider success if server is healthy
          return content?.status === "healthy";
        }}
        
        onSucceed={(content) => {
          setServerStatus("online");
        }}
        
        onError={() => {
          setServerStatus("offline");
        }}
        
        isPoling={isMonitoring}
        setIsPoling={setIsMonitoring}
        maxCount={5}
        timeout={5000} // Check every 5 seconds
      />
    </div>
  );
}
```

---

### How Polling Works:
1. When `isPoling` becomes true, polling starts
2. Runs `beforePolingMethod` once (if provided) before first poll
3. Calls `polingFunction` and passes result to `polingRule`
4. If `polingRule` returns true: Calls `onSucceed` and stops
5. If max attempts reached without success: Calls `onError` and stops
6. Otherwise: Waits for `timeout` ms and repeats from step 3
7. Automatically cleans up timeouts on unmount

---

## Complete Flow Example: All Services Together

Here's a complete example showing how all these services work together:

```typescript
// ==========================================
// FILE: actions/orders.ts (Server Action)
// ==========================================
"use server";

import { tryCatchResponse } from "@/utils/services/tryAndResponde";
import ServiceResponse from "@/utils/services/tryAndResponde";
import { authenticatedRequest } from "@/utils/services/api";

export async function createOrder(orderData: any): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Create Order", async () => {
    const result = await authenticatedRequest("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
    
    return {
      response: result,
      hasError: false,
      message: "Order created successfully",
    };
  });
}

export async function checkOrderStatus(orderId: string): Promise<ServiceResponse<any>> {
  return tryCatchResponse("Check Order Status", async () => {
    const result = await authenticatedRequest(`/orders/${orderId}/status`);
    
    return {
      response: result,
      hasError: false,
      message: "Status retrieved",
    };
  });
}

// ==========================================
// FILE: components/OrderForm.tsx (Client Component)
// ==========================================
"use client";

import { useState } from "react";
import { serverLoadingMiddleware } from "@/utils/services/server-loading-middleware";
import Poling from "@/utils/services/poling";
import { createOrder, checkOrderStatus } from "@/actions/orders";

export function OrderForm() {
  const [loading, setLoading] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [orderData, setOrderData] = useState({
    product: "",
    quantity: 1,
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await serverLoadingMiddleware(
      "Pedido criado com sucesso!",
      "Erro ao criar pedido",
      () => createOrder(orderData),
      setLoading,
      {
        successDescription: "Acompanhando processamento...",
      }
    );
    
    if (!result?.hasError) {
      setOrderId(result.response.data.id);
      setTrackingOrder(true); // Start polling
    }
  };

  return (
    <div>
      <form onSubmit={handleCreateOrder}>
        <input
          value={orderData.product}
          onChange={(e) => setOrderData({ ...orderData, product: e.target.value })}
          placeholder="Produto"
          disabled={loading}
        />
        <input
          type="number"
          value={orderData.quantity}
          onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) })}
          disabled={loading}
        />
        <button type="submit" disabled={loading || trackingOrder}>
          {loading ? "Criando..." : "Criar Pedido"}
        </button>
      </form>

      {trackingOrder && (
        <div>
          <p>Processando pedido...</p>
          <Poling
            polingFunction={async () => {
              const result = await checkOrderStatus(orderId);
              return result.response.data;
            }}
            
            polingRule={(content) => {
              return content?.status === "processed";
            }}
            
            onSucceed={(content) => {
              console.log("Order processed:", content);
              // Show success, redirect, etc.
            }}
            
            onError={() => {
              console.log("Order processing timeout");
            }}
            
            isPoling={trackingOrder}
            setIsPoling={setTrackingOrder}
            maxCount={15}
            timeout={3000}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Server Actions Pattern
```typescript
"use server";
import { tryCatchResponse } from "@/utils/services/tryAndResponde";
import { authenticatedRequest } from "@/utils/services/api";

// ✅ Always wrap server actions with tryCatchResponse
export async function myServerAction(data: any) {
  return tryCatchResponse("My Action", async () => {
    const result = await authenticatedRequest("/endpoint", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return {
      response: result,
      hasError: false,
      message: "Success",
    };
  });
}
```

### 2. Client Component Pattern
```typescript
"use client";
import { serverLoadingMiddleware } from "@/utils/services/server-loading-middleware";

// ✅ Always use serverLoadingMiddleware for calling server actions
const result = await serverLoadingMiddleware(
  "Sucesso!",
  "Erro",
  () => myServerAction(data),
  setLoading
);
```

### 3. Polling Pattern
```typescript
// ✅ Only poll when necessary and set appropriate limits
<Poling
  maxCount={20} // Reasonable limit
  timeout={3000} // Not too frequent
  onError={() => {
    // Always handle errors
  }}
  {...otherProps}
/>
```

---

## Environment Setup

Make sure you have the following environment variable configured:

```bash
NEXT_PUBLIC_API_CORE_URL=https://your-api-url.com
```

---

## Common Patterns Summary

| Task | Use | Pattern |
|------|-----|---------|
| Make authenticated API call | `authenticatedRequest` | Server action with `tryCatchResponse` wrapper |
| Make public API call | `notAuthenticatedRequest` | Server action with `tryCatchResponse` wrapper |
| Delete resource | `deleteApi` | Server action |
| Call server action from client | `serverLoadingMiddleware` | Wrap server action call |
| Wait for async process | `Poling` | Component with status checking |
| Standardize responses | `tryCatchResponse` | Wrap all server actions |

---

## Troubleshooting

### Issue: "API base URL not configured"
**Solution:** Set the `NEXT_PUBLIC_API_CORE_URL` environment variable.

### Issue: Toast notifications not showing
**Solution:** Ensure you have the toast provider configured in your app layout.

### Issue: Polling never stops
**Solution:** Check that your `polingRule` function eventually returns true, and set an appropriate `maxCount`.

### Issue: Authentication errors
**Solution:** Verify that cookies are properly set and the access token is valid.

---

## Questions?

These utilities are designed to work together to create a consistent, error-handled, and user-friendly data flow in your application. Follow the recipes above and adapt them to your specific use cases!

