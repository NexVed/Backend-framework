#!/usr/bin/env node
/**
 * Backend Framework CLI
 * Interactive project scaffolding tool
 */
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const DATABASE_CHOICES = [
    { name: 'Supabase (Cloud PostgreSQL)', value: 'supabase' },
    { name: 'NeonDB (Serverless PostgreSQL)', value: 'neondb' },
    { name: 'Firebase (Firestore)', value: 'firebase' },
    { name: 'MongoDB (Local/Atlas)', value: 'mongodb' },
    { name: 'MySQL (Local)', value: 'mysql' },
    { name: 'PostgreSQL (Local)', value: 'postgresql' },
];
async function main() {
    console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 Backend Framework                               ║
║   Create production-ready Node.js backends easily    ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: 'my-backend-app',
            validate: (input) => {
                if (/^[a-z0-9-_]+$/.test(input))
                    return true;
                return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
            },
        },
        {
            type: 'list',
            name: 'language',
            message: 'Language:',
            choices: [
                { name: 'TypeScript (Recommended)', value: 'typescript' },
                { name: 'JavaScript', value: 'javascript' },
            ],
            default: 'typescript',
        },
        {
            type: 'checkbox',
            name: 'databases',
            message: 'Select databases (space to select, enter to confirm):',
            choices: DATABASE_CHOICES,
            validate: (input) => {
                if (input.length === 0) {
                    return 'Please select at least one database';
                }
                return true;
            },
        },
        {
            type: 'confirm',
            name: 'enableAuth',
            message: 'Enable authentication (JWT)?',
            default: true,
        },
        {
            type: 'confirm',
            name: 'enableCache',
            message: 'Enable caching?',
            default: true,
        },
        {
            type: 'list',
            name: 'cacheDriver',
            message: 'Cache driver:',
            choices: [
                { name: 'In-Memory (simple, single instance)', value: 'memory' },
                { name: 'Redis (distributed, production)', value: 'redis' },
            ],
            default: 'memory',
            when: (answers) => answers.enableCache,
        },
        {
            type: 'list',
            name: 'orm',
            message: 'ORM preference:',
            choices: [
                { name: 'Prisma (Type-safe, migrations)', value: 'prisma' },
                { name: 'Drizzle (Lightweight, SQL-like)', value: 'drizzle' },
                { name: 'None (Use raw adapters)', value: 'none' },
            ],
            default: 'prisma',
        },
    ]);
    await createProject(answers);
}
async function createProject(config) {
    const projectPath = path.join(process.cwd(), config.projectName);
    const templatePath = path.join(TEMPLATES_DIR, 'express', config.language);
    console.log('\n📦 Creating project...\n');
    // Check if directory exists
    if (await fs.pathExists(projectPath)) {
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `Directory ${config.projectName} already exists. Overwrite?`,
                default: false,
            },
        ]);
        if (!overwrite) {
            console.log('❌ Cancelled');
            process.exit(1);
        }
        await fs.remove(projectPath);
    }
    // Copy template
    await fs.copy(templatePath, projectPath);
    console.log('  ✅ Copied template files');
    // Update package.json
    await updatePackageJson(projectPath, config);
    console.log('  ✅ Updated package.json');
    // Update backend.config
    await updateBackendConfig(projectPath, config);
    console.log('  ✅ Updated backend.config');
    // Update .env.example
    await updateEnvExample(projectPath, config);
    console.log('  ✅ Updated .env.example');
    // Clean up unused files
    await cleanupUnusedFiles(projectPath, config);
    console.log('  ✅ Cleaned up unused files');
    // Create .gitignore
    await createGitignore(projectPath);
    console.log('  ✅ Created .gitignore');
    console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅ Project created successfully!                    ║
╚══════════════════════════════════════════════════════╝

  Next steps:

  1. cd ${config.projectName}
  2. npm install
  3. Copy .env.example to .env and configure
  4. npm run dev

  ${config.orm === 'prisma' ? `
  Prisma setup:
    npx prisma init
    npx prisma generate
  ` : ''}
  ${config.orm === 'drizzle' ? `
  Drizzle setup:
    Create your schema in db/schema.ts
    npm run drizzle:generate
  ` : ''}
  Happy coding! 🚀
  `);
}
async function updatePackageJson(projectPath, config) {
    const pkgPath = path.join(projectPath, 'package.json');
    const pkg = await fs.readJson(pkgPath);
    pkg.name = config.projectName;
    // Add selected database dependencies
    const dbDependencies = {
        supabase: '@supabase/supabase-js',
        neondb: '@neondatabase/serverless',
        firebase: 'firebase-admin',
        mongodb: 'mongodb',
        mysql: 'mysql2',
        postgresql: 'pg',
    };
    const dependencies = { ...pkg.dependencies };
    const devDependencies = { ...pkg.devDependencies };
    for (const db of config.databases) {
        const dep = dbDependencies[db];
        if (dep && pkg.optionalDependencies?.[dep]) {
            dependencies[dep] = pkg.optionalDependencies[dep];
        }
    }
    // Add ORM dependencies
    if (config.orm === 'prisma') {
        dependencies['@prisma/client'] = pkg.optionalDependencies?.['@prisma/client'] || '^5.7.0';
        devDependencies['prisma'] = pkg.optionalDependencies?.['prisma'] || '^5.7.0';
    }
    else if (config.orm === 'drizzle') {
        dependencies['drizzle-orm'] = pkg.optionalDependencies?.['drizzle-orm'] || '^0.29.0';
        devDependencies['drizzle-kit'] = pkg.optionalDependencies?.['drizzle-kit'] || '^0.20.0';
    }
    // Add Redis if selected
    if (config.enableCache && config.cacheDriver === 'redis') {
        dependencies['redis'] = pkg.optionalDependencies?.['redis'] || '^4.6.11';
    }
    // Add type definitions for selected databases
    const typesDeps = {
        pg: '@types/pg',
    };
    for (const db of config.databases) {
        const typeDep = typesDeps[dbDependencies[db]];
        if (typeDep) {
            devDependencies[typeDep] = '^8.10.9';
        }
    }
    pkg.dependencies = dependencies;
    pkg.devDependencies = devDependencies;
    delete pkg.optionalDependencies;
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}
async function updateBackendConfig(projectPath, config) {
    const ext = config.language === 'typescript' ? 'ts' : 'js';
    const configPath = path.join(projectPath, `backend.config.${ext}`);
    let content = await fs.readFile(configPath, 'utf-8');
    // Uncomment selected databases
    for (const db of config.databases) {
        const patterns = {
            supabase: /\/\/ supabase:[\s\S]*?\/\/ \},/g,
            neondb: /\/\/ neondb:[\s\S]*?\/\/ \},/g,
            firebase: /\/\/ firebase:[\s\S]*?\/\/ \},/g,
            mongodb: /\/\/ mongodb:[\s\S]*?\/\/ \},/g,
            mysql: /\/\/ mysql:[\s\S]*?\/\/ \},/g,
            postgresql: /\/\/ postgresql:[\s\S]*?\/\/ \},/g,
        };
        // Simple uncomment - remove leading //
        const dbConfig = getDbConfigBlock(db);
        if (content.includes(`// ${db}:`)) {
            content = content.replace(`// ${db}:`, `${db}:`);
        }
    }
    // Set default database
    if (config.databases.length > 0) {
        content = content.replace(/default: '[^']*'/, `default: '${config.databases[0]}'`);
    }
    // Update auth setting
    content = content.replace(/auth:\s*\{[\s\S]*?enabled:\s*(true|false)/, `auth: {\n    enabled: ${config.enableAuth}`);
    // Update cache settings
    content = content.replace(/cache:\s*\{[\s\S]*?enabled:\s*(true|false)/, `cache: {\n    enabled: ${config.enableCache}`);
    if (config.enableCache && config.cacheDriver) {
        content = content.replace(/driver:\s*'[^']*'/, `driver: '${config.cacheDriver}'`);
    }
    // Update ORM setting
    content = content.replace(/provider:\s*'[^']*'/, `provider: '${config.orm}'`);
    await fs.writeFile(configPath, content);
}
function getDbConfigBlock(db) {
    const configs = {
        supabase: `supabase: {
        url: process.env.SUPABASE_URL!,
        anonKey: process.env.SUPABASE_ANON_KEY!,
      },`,
        neondb: `neondb: {
        connectionString: process.env.NEON_DATABASE_URL!,
        pooled: true,
      },`,
        firebase: `firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      },`,
        mongodb: `mongodb: {
        uri: process.env.MONGODB_URI!,
        dbName: process.env.MONGODB_DB_NAME,
      },`,
        mysql: `mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER!,
        password: process.env.MYSQL_PASSWORD!,
        database: process.env.MYSQL_DATABASE!,
      },`,
        postgresql: `postgresql: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production',
      },`,
    };
    return configs[db] || '';
}
async function updateEnvExample(projectPath, config) {
    const envPath = path.join(projectPath, '.env.example');
    let content = await fs.readFile(envPath, 'utf-8');
    // No major changes needed - env.example already has all options
    // Just add a note about selected databases
    const selectedNote = `
# ============================================
# SELECTED DATABASES: ${config.databases.join(', ')}
# Configure the environment variables below
# ============================================
`;
    content = content.replace('# DATABASE PROVIDERS', `# DATABASE PROVIDERS${selectedNote}`);
    await fs.writeFile(envPath, content);
}
async function cleanupUnusedFiles(projectPath, config) {
    // Remove unused ORM files
    if (config.orm !== 'prisma') {
        await fs.remove(path.join(projectPath, 'orm', 'prisma.ts')).catch(() => { });
        await fs.remove(path.join(projectPath, 'orm', 'prisma.js')).catch(() => { });
    }
    if (config.orm !== 'drizzle') {
        await fs.remove(path.join(projectPath, 'orm', 'drizzle.ts')).catch(() => { });
        await fs.remove(path.join(projectPath, 'orm', 'drizzle.js')).catch(() => { });
    }
    // Remove Redis cache if not selected
    if (!config.enableCache || config.cacheDriver !== 'redis') {
        await fs.remove(path.join(projectPath, 'cache', 'redis.ts')).catch(() => { });
        await fs.remove(path.join(projectPath, 'cache', 'redis.js')).catch(() => { });
    }
    // Remove unused database adapters
    const allDatabases = ['supabase', 'neondb', 'firebase', 'mongodb', 'mysql', 'postgresql'];
    const adapterDir = path.join(projectPath, 'database', 'adapters');
    for (const db of allDatabases) {
        if (!config.databases.includes(db)) {
            await fs.remove(path.join(adapterDir, `${db}.ts`)).catch(() => { });
            await fs.remove(path.join(adapterDir, `${db}.js`)).catch(() => { });
        }
    }
}
async function createGitignore(projectPath) {
    const gitignore = `# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage
coverage/

# Prisma
prisma/migrations/

# Drizzle
drizzle/
`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
}
main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
