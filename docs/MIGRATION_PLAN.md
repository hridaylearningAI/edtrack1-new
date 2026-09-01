# Student Management System - Standalone Migration Plan

## 🎯 Goal
Migrate `edtec-student-management-system` from depending on `edtec-student-management-system-api` to being a standalone Next.js application with built-in API routes.

## 📊 Current State

### Frontend
- **Framework**: Next.js (App Router)
- **API Base URL**: `NEXT_PUBLIC_API_BASE_URL` → Points to external AWS Lambda API
- **Current API Routes**: 
  - `/api/consume-cross-app-token`
  - `/api/verify-auth`

### Backend (External API)
- **Framework**: Python/FastAPI (AWS Lambda)
- **Base URL**: `https://0fwtzye7h3.execute-api.us-east-1.amazonaws.com/dev/api`
- **Endpoints**: ~50+ endpoints across multiple modules

## 🔄 Migration Strategy

### Phase 1: Setup Infrastructure
1. Create shared library files:
   - `lib/api/supabase.ts` - Supabase client
   - `lib/api/auth.ts` - Authentication utilities
   - `lib/api/utils.ts` - Common utilities

2. Set up environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `CLERK_SECRET_KEY` (if using Clerk)
   - `RESEND_API_KEY` (for emails)
   - `STRIPE_SECRET_KEY` (for payments)

### Phase 2: Migrate Core Endpoints

#### Authentication (`/api/auth/*`)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/check-user`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/setup-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

#### Students (`/api/students/*`)
- `GET /api/students`
- `GET /api/students/[id]`
- `POST /api/students`
- `PUT /api/students/[id]`
- `DELETE /api/students/[id]`
- `GET /api/students/search`

#### Courses (`/api/courses/*`)
- `GET /api/courses`
- `GET /api/courses/[id]`
- `POST /api/courses`
- `PUT /api/courses/[id]`
- `DELETE /api/courses/[id]`

#### Enrollments (`/api/enrollments/*`)
- `GET /api/enrollments`
- `GET /api/enrollments/[id]`
- `POST /api/enrollments`
- `PUT /api/enrollments/[id]`
- `DELETE /api/enrollments/[id]`

#### Documents (`/api/documents/*`)
- `GET /api/documents`
- `GET /api/documents/[id]`
- `POST /api/documents`
- `PUT /api/documents/[id]`
- `DELETE /api/documents/[id]`

#### Payments & Purchases (`/api/payments/*`, `/api/purchases/*`)
- `POST /api/payments/create-intent`
- `POST /api/payments/confirm`
- `GET /api/purchases`
- `GET /api/purchases/[id]`

### Phase 3: Update Frontend
1. Update `lib/api.ts` to use `/api` instead of external URL
2. Update `lib/auth.ts` to use local API
3. Update all hooks and services
4. Remove `NEXT_PUBLIC_API_BASE_URL` dependency (or set to `/api`)

### Phase 4: Testing & Deployment
1. Test all endpoints locally
2. Update environment variables
3. Deploy to Vercel
4. Verify production deployment

## 📁 File Structure

```
edtec-student-management-system/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── check-user/route.ts
│       │   ├── send-otp/route.ts
│       │   ├── verify-otp/route.ts
│       │   ├── setup-password/route.ts
│       │   ├── me/route.ts
│       │   └── logout/route.ts
│       ├── students/
│       │   ├── route.ts (GET, POST)
│       │   ├── [id]/route.ts (GET, PUT, DELETE)
│       │   └── search/route.ts
│       ├── courses/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── enrollments/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── documents/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── payments/
│       │   ├── create-intent/route.ts
│       │   └── confirm/route.ts
│       └── purchases/
│           ├── route.ts
│           └── [id]/route.ts
├── lib/
│   └── api/
│       ├── supabase.ts
│       ├── auth.ts
│       └── utils.ts
└── .env.local (environment variables)
```

## 🔑 Key Differences from Portfolio Migration

1. **Next.js API Routes** instead of Cloudflare Workers
   - Built-in support, no external service needed
   - Uses `app/api` directory structure
   - Route handlers are `route.ts` files

2. **Python → TypeScript/Node.js**
   - Need to convert Python logic to TypeScript
   - Use Supabase JS client instead of Python client
   - Use Node.js libraries (e.g., `bcryptjs` for password hashing)

3. **Same Database**
   - Both use Supabase
   - Same schema and tables
   - Can reuse database logic patterns

## ✅ Benefits

- ✅ No external API dependency
- ✅ Faster (no network latency)
- ✅ Easier debugging (all code in one repo)
- ✅ Better TypeScript integration
- ✅ Unified deployment (frontend + backend together)
- ✅ No AWS Lambda costs
- ✅ Vercel serverless functions (free tier: 100GB-hours/month)

## 🚀 Next Steps

1. Start with authentication endpoints (most critical)
2. Then migrate students, courses, enrollments
3. Finally migrate documents, payments, purchases
4. Update frontend to use local routes
5. Test thoroughly
6. Deploy

