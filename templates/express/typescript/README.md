# Express TypeScript Backend Template

A modern, production-ready Express.js backend template with TypeScript, featuring file-based routing, multiple database adapters, authentication, caching, and middleware out of the box.

## ✨ Features

- 🚀 **Express 5** - Latest Express with async/await support
- 📁 **File-based Routing** - Next.js-style API routes in `app/api/`
- 🔐 **Authentication** - JWT tokens, password hashing, session management
- 🗄️ **Multi-Database Support** - Supabase, NeonDB, Firebase, MongoDB, MySQL, PostgreSQL
- 🧩 **ORM Integration** - Prisma and Drizzle ORM support
- ⚡ **Caching** - Memory and Redis caching adapters
- 🛡️ **Middleware** - Auth, rate limiting, validation, error handling, logging
- 📝 **TypeScript** - Full type safety throughout

## 📦 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and JWT secret.

### 3. Configure Backend

Edit `backend.config.ts` to customize:
- Server settings (port, CORS, body limit)
- Database provider (Supabase, Firebase, MongoDB, etc.)
- Authentication (JWT secret, expiry)
- Caching (memory or Redis)
- ORM (Prisma or Drizzle)

### 4. Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

## 📁 Project Structure

```
├── app/
│   ├── api/              # File-based API routes
│   │   ├── auth/         # Authentication endpoints
│   │   │   └── login/
│   │   │       └── route.ts   # POST /api/auth/login
│   │   └── [resource]/   # Your API resources
│   ├── models/           # Data models
│   └── validators/       # Request validation schemas
├── auth/                 # Authentication module
│   └── index.ts          # JWT, password hashing utilities
├── cache/                # Caching layer
│   ├── adapters/         # Memory, Redis adapters
│   └── index.ts          # Cache interface
├── core/                 # Core framework
│   ├── config.ts         # Configuration loader
│   └── router.ts         # File-based router
├── database/             # Database layer
│   ├── adapters/         # Database adapters
│   │   ├── supabase.ts
│   │   ├── neondb.ts
│   │   ├── firebase.ts
│   │   ├── mongodb.ts
│   │   ├── mysql.ts
│   │   └── postgresql.ts
│   └── index.ts          # Database interface
├── middleware/           # Express middleware
│   ├── auth.ts           # JWT authentication
│   ├── errorHandler.ts   # Error handling
│   ├── logging.ts        # Request logging
│   ├── rateLimit.ts      # Rate limiting
│   └── validation.ts     # Request validation
├── orm/                  # ORM integrations
├── utils/                # Utility functions
│   └── response.ts       # Standardized API responses
├── backend.config.ts     # Main configuration
├── server.ts             # Entry point
└── package.json
```

## 🗄️ Database Providers

Configure your database in `backend.config.ts`:

### Supabase (Default)
```typescript
database: {
    default: 'supabase',
    providers: {
        supabase: {
            url: process.env.SUPABASE_URL!,
            anonKey: process.env.SUPABASE_ANON_KEY!,
        },
    },
}
```

### NeonDB (Serverless PostgreSQL)
```typescript
database: {
    default: 'neondb',
    providers: {
        neondb: {
            connectionString: process.env.NEON_DATABASE_URL!,
            pooled: true,
        },
    },
}
```

### Firebase
```typescript
database: {
    default: 'firebase',
    providers: {
        firebase: {
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
        },
    },
}
```

### MongoDB
```typescript
database: {
    default: 'mongodb',
    providers: {
        mongodb: {
            uri: process.env.MONGODB_URI!,
            dbName: process.env.MONGODB_DB_NAME,
        },
    },
}
```

### MySQL / PostgreSQL
See `backend.config.ts` for full configuration options.

## 🔐 Authentication

The auth module (`auth/index.ts`) provides:

```typescript
import { 
    generateTokenPair,    // Generate access + refresh tokens
    verifyToken,          // Verify JWT token
    hashPassword,         // Hash password with bcrypt
    comparePassword,      // Compare password with hash
    generateRandomToken,  // Generate random tokens
    generateOTP,          // Generate one-time passwords
} from './auth';
```

### Protecting Routes

Use the auth middleware:

```typescript
import { requireAuth, requireRole } from './middleware/auth';

// Require authentication
app.get('/api/protected', requireAuth, handler);

// Require specific role
app.get('/api/admin', requireRole('admin'), handler);
```

## 📁 File-Based Routing

Create routes by adding files in `app/api/`:

| File Path | HTTP Method | Route |
|-----------|-------------|-------|
| `app/api/users/route.ts` | `GET` | `/api/users` |
| `app/api/users/route.ts` | `POST` | `/api/users` |
| `app/api/users/[id]/route.ts` | `GET` | `/api/users/:id` |
| `app/api/auth/login/route.ts` | `POST` | `/api/auth/login` |

### Route Handler Example

```typescript
// app/api/users/route.ts
import { Request, Response } from 'express';
import { success, badRequest } from '../../../utils/response';

export const GET = async (req: Request, res: Response) => {
    const users = await db.from('users').select('*');
    return success(res, users);
};

export const POST = async (req: Request, res: Response) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
        return badRequest(res, 'Name and email are required');
    }
    
    const user = await db.from('users').insert({ name, email });
    return success(res, user, 201);
};
```

## 🛡️ Middleware

### Rate Limiting

```typescript
import { rateLimit } from './middleware/rateLimit';

// 100 requests per 15 minutes
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

### Request Validation

```typescript
import { validate } from './middleware/validation';
import { z } from 'zod';

const userSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
});

app.post('/api/users', validate(userSchema), handler);
```

## ⚡ Caching

```typescript
import cache from './cache';

// Set cache
await cache.set('key', { data: 'value' }, 3600); // TTL in seconds

// Get cache
const data = await cache.get('key');

// Delete cache
await cache.delete('key');
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests with Vitest |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run drizzle:generate` | Generate Drizzle migrations |
| `npm run drizzle:push` | Push Drizzle schema |
| `npm run drizzle:studio` | Open Drizzle Studio |

## 🌍 Environment Variables

See `.env.example` for all available options:

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No |
| `JWT_SECRET` | JWT signing secret | **Yes** |
| `CORS_ORIGIN` | Allowed CORS origins | No |
| `SUPABASE_URL` | Supabase project URL | If using Supabase |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | If using Supabase |
| `REDIS_URL` | Redis connection URL | If using Redis cache |

## 📝 License

MIT
