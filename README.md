# Backend Framework

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Express-5.0-lightgrey.svg" alt="Express">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

A production-ready Node.js backend framework with **multi-database support**, **file-based routing**, and a **developer-first experience**. Think Next.js, but for backends.

## ✨ Features

- 🔌 **Multi-Database Support** - Supabase, NeonDB, Firebase, MongoDB, MySQL, PostgreSQL
- 📁 **File-Based Routing** - Next.js-style API routes
- 🔐 **Authentication** - JWT tokens, password hashing, role-based access
- 💾 **Caching** - In-memory and Redis support
- 🛡️ **Middleware** - Rate limiting, validation, error handling, logging
- 🔄 **ORM Integration** - Prisma and Drizzle support
- 📝 **TypeScript & JavaScript** - Full support for both
- ⚡ **Zero-Config Defaults** - Works out of the box

## 🚀 Quick Start

### Using CLI (Recommended)

```bash
npx @nexved/backend-framework
```

This will launch an interactive CLI to scaffold your project:

- Choose project name
- Select language (TypeScript/JavaScript)
- Pick databases (multi-select)
- Configure authentication
- Set up caching
- Choose ORM (Prisma/Drizzle/None)

### Manual Setup

```bash
# Clone the template
git clone https://github.com/NexVed/Backend-framework.git my-app
cd my-app/templates/express/typescript

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development
npm run dev
```

## 📁 Project Structure

```
my-app/
├── app/
│   └── api/              # File-based routes
│       ├── health/
│       │   └── route.ts  # GET /api/health
│       └── users/
│           ├── route.ts  # GET/POST /api/users
│           └── [id]/
│               └── route.ts  # GET/PUT/DELETE /api/users/:id
├── auth/                 # Authentication module
├── cache/                # Caching (memory/redis)
├── core/                 # Server & config
├── database/             # Database adapters
│   └── adapters/         # Provider implementations
├── middleware/           # Express middleware
├── orm/                  # Prisma/Drizzle integration
├── utils/                # Response helpers, logger
├── backend.config.ts     # Framework configuration
├── server.ts             # Entry point
└── package.json
```

## 📝 File-Based Routing

Create routes by adding files in `app/api/`:

```typescript
// app/api/users/route.ts
export const GET = (req, res) => {
  res.json({ users: [] });
};

export const POST = async (req, res) => {
  const { name, email } = req.body;
  // Create user...
  res.status(201).json({ id: '1', name, email });
};
```

Dynamic routes use brackets:

```typescript
// app/api/users/[id]/route.ts
export const GET = (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'User' });
};

export const DELETE = (req, res) => {
  const { id } = req.params;
  // Delete user...
  res.status(204).send();
};
```

## ⚙️ Configuration

Edit `backend.config.ts` to configure your app:

```typescript
import { defineConfig } from './core/config';

export default defineConfig({
  server: {
    port: 3000,
    cors: { origin: '*', credentials: true },
  },

  database: {
    default: 'supabase',
    providers: {
      supabase: {
        url: process.env.SUPABASE_URL!,
        anonKey: process.env.SUPABASE_ANON_KEY!,
      },
      mongodb: {
        uri: process.env.MONGODB_URI!,
        dbName: 'myapp',
      },
    },
  },

  auth: {
    enabled: true,
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: '7d',
    },
  },

  cache: {
    enabled: true,
    driver: 'memory', // or 'redis'
    ttl: 3600,
  },
});
```

## 🔌 Database Usage

### Using Database Manager

```typescript
import { db } from './database';

// Use default database
const data = await db.default().from('users').select();

// Use specific provider
const supabase = db.supabase();
const { data: users } = await supabase.from('users').select('*');

// MongoDB
const mongodb = db.mongodb();
const users = await mongodb.collection('users').find({});

// PostgreSQL
const pg = db.postgresql();
const result = await pg.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Health Check

```typescript
const health = await db.healthCheck();
// { supabase: true, mongodb: true, postgresql: false }
```

## 🔐 Authentication

### Protect Routes

```typescript
import { requireAuth, requireRole } from './middleware/auth';

// Require authentication
app.get('/api/profile', requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

// Require specific role
app.delete('/api/admin', requireAuth(), requireRole('admin'), (req, res) => {
  // Only admins can access
});
```

### Generate Tokens

```typescript
import { generateToken, generateTokenPair, hashPassword, comparePassword } from './auth';

// Hash password
const hash = await hashPassword('mypassword');

// Verify password
const isValid = await comparePassword('mypassword', hash);

// Generate JWT
const token = await generateToken({ id: user.id, email: user.email });

// Generate access + refresh tokens
const { accessToken, refreshToken, expiresIn } = await generateTokenPair({ id: user.id });
```

## 💾 Caching

```typescript
import { cache, cacheKey, cachePatterns } from './cache';

// Simple cache
cache.set('user:1', userData, 3600); // TTL in seconds
const user = cache.get('user:1');

// Cache-aside pattern
const user = await cachePatterns.getOrSet(
  cacheKey.entity('user', userId),
  () => fetchUserFromDB(userId),
  3600
);

// Invalidate on write
await cachePatterns.invalidateOnWrite(
  cacheKey.entity('user', userId),
  () => updateUser(userId, data)
);
```

## 🛡️ Middleware

### Rate Limiting

```typescript
import { withRateLimit, strictRateLimit } from './middleware/rateLimit';

// Custom rate limit
app.use('/api', withRateLimit({ windowMs: 60000, max: 100 }));

// Strict limit for auth endpoints
app.post('/api/login', strictRateLimit(), loginHandler);
```

### Validation (Zod)

```typescript
import { validateBody, validateQuery, schemas } from './middleware/validation';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post('/api/users', 
  validateBody(createUserSchema),
  (req, res) => {
    // req.body is validated and typed
  }
);

// With pagination
app.get('/api/users',
  validateQuery(schemas.pagination),
  (req, res) => {
    const { page, limit } = req.query;
  }
);
```

## 📊 Response Helpers

```typescript
import { success, created, paginated, notFound, badRequest } from './utils/response';

// Success response
success(res, { user });
// { success: true, data: { user } }

// Created (201)
created(res, { id: '1', name: 'New User' });

// Paginated
paginated(res, users, { page: 1, limit: 10, total: 100, totalPages: 10 });
// { success: true, data: [...], meta: { page, limit, total, totalPages } }

// Errors
badRequest(res, 'Invalid input', { field: 'email' });
notFound(res, 'User');
// { success: false, error: 'Not Found', message: 'User not found' }
```

## 📝 Logging

```typescript
import { logger, createLogger } from './utils/logger';

logger.info('Server started', { port: 3000 });
logger.error('Database error', error, { userId: '123' });

// Child logger with context
const userLogger = logger.child({ userId: '123' });
userLogger.info('User action'); // Automatically includes userId
```

## 🗄️ ORM Integration

### Prisma

```typescript
import { prisma, connectPrisma, withTransaction } from './orm/prisma';

// Use Prisma client
const users = await prisma.user.findMany();

// With transaction
const result = await withTransaction(async (tx) => {
  const user = await tx.user.create({ data: { name: 'John' } });
  await tx.profile.create({ data: { userId: user.id } });
  return user;
});
```

### Drizzle

```typescript
import { initDrizzle, getDrizzle, eq, desc } from './orm/drizzle';
import { users } from './db/schema';

// Initialize with Neon
await initDrizzle('neon', process.env.DATABASE_URL!);

const db = getDrizzle();
const allUsers = await db.select().from(users).where(eq(users.active, true));
```

## 🌍 Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key

# Databases (configure as needed)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
MONGODB_URI=mongodb://localhost:27017
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Cache
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

## 📦 Supported Databases

| Database | Type | Package |
|----------|------|---------|
| Supabase | Cloud PostgreSQL | @supabase/supabase-js |
| NeonDB | Serverless PostgreSQL | @neondatabase/serverless |
| Firebase | Cloud Firestore | firebase-admin |
| MongoDB | NoSQL | mongodb |
| MySQL | SQL | mysql2 |
| PostgreSQL | SQL | pg |

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📄 License

MIT © NexVed
