import fs from "fs";
import path from "path";
import { Express, Request, Response, NextFunction } from "express";
import { RouteExport } from "../types/middleware";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const METHOD_MAP: Record<string, HttpMethod> = {
  GET: "get",
  POST: "post",
  PUT: "put",
  PATCH: "patch",
  DELETE: "delete",
};

/**
 * Converts folder path to Express route path
 * users/[id] -> /users/:id
 */
function toRoutePath(apiDir: string, dir: string): string {
  const relativePath = dir.replace(apiDir, "");

  return (
    "/api" +
    dir
      .replace(apiDir, "")               // Remove apiDir prefix
      .replace(/\\/g, "/")                 // Windows support
      .replace(/\[([^\]]+)\]/g, ":$1")     // [id] → :id
  );
}

function normalizeHandlers(exported: RouteExport) {
  return Array.isArray(exported) ? exported : [exported];
}

export function loadRoutes(app: Express) {
  const apiDir = path.join(process.cwd(), "app", "api");

  if (!fs.existsSync(apiDir)) {
    console.warn(`API directory not found at ${apiDir}, skipping route registration`);
    return;
  }

  walk(apiDir);

  function walk(dir: string) {
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (file !== "route.ts") continue;

      const routeModule = require(fullPath);
      const routePath = toRoutePath(apiDir, dir);

      Object.keys(METHOD_MAP).forEach((methodKey) => {
        const handler = routeModule[methodKey];
        if (!handler) return;

        const expressMethod = METHOD_MAP[methodKey];

        app[expressMethod](
          routePath,
          async (req: Request, res: Response, next: NextFunction) => {
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
