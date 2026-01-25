import fs from "fs";
import path from "path";
import { Express, Router } from "express";

/**
 * Load all app/api/*
 * route.ts files and mount them automatically.
 */
export function loadRoutes(app: Express) {
  const apiDir = path.join(process.cwd(), "app", "api");

  if (!fs.existsSync(apiDir)) {
    console.warn("⚠️ app/api folder not found");
    return;
  }

  walk(apiDir);

  function walk(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (file === "route.ts") {
        const routeModule = require(fullPath);

        const router: Router = routeModule.default;
        if (!router) {
          throw new Error(`route.ts must export a default Express Router: ${fullPath}`);
        }

        // Convert folder path → URL
        const routePath =
          "/api" +
          dir
            .replace(apiDir, "")
            .replace(/\\/g, "/"); // Windows fix

        app.use(routePath, router);

        console.log(`✅ Route loaded: ${routePath}`);
      }
    }
  }
}
