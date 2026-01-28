/**
 * File-based Router
 */

const fs = require('fs');
const path = require('path');

const METHOD_MAP = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    PATCH: 'patch',
    DELETE: 'delete',
};

/**
 * Converts folder path to Express route path
 * users/[id] -> /users/:id
 */
function toRoutePath(apiDir, dir) {
    return (
        '/api' +
        dir
            .replace(apiDir, '')
            .replace(/\\/g, '/')
            .replace(/\[([^\]]+)\]/g, ':$1')
    );
}

/**
 * Load routes from app/api directory
 * @param {import('express').Express} app
 */
function loadRoutes(app) {
    const apiDir = path.join(process.cwd(), 'app', 'api');

    if (!fs.existsSync(apiDir)) {
        console.warn(`API directory not found at ${apiDir}, skipping route registration`);
        return;
    }

    walk(apiDir);

    function walk(dir) {
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);

            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
                continue;
            }

            if (file !== 'route.js') continue;

            const routeModule = require(fullPath);
            const routePath = toRoutePath(apiDir, dir);

            Object.keys(METHOD_MAP).forEach((methodKey) => {
                const handler = routeModule[methodKey];
                if (!handler) return;

                const expressMethod = METHOD_MAP[methodKey];

                app[expressMethod](
                    routePath,
                    async (req, res, next) => {
                        try {
                            await handler(req, res, next);
                        } catch (err) {
                            next(err);
                        }
                    }
                );

                console.log(`✅ ${methodKey} ${routePath}`);
            });
        }
    }
}

module.exports = { loadRoutes };
