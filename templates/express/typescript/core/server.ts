import express from "express";
import cors from "cors";
import { loadRoutes } from "./router";

export function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Load file-based routes
  loadRoutes(app);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}
