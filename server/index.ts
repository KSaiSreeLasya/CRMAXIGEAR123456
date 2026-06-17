import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { handleDemo } from "./routes/demo";
import { handleCreateAdminEmployee } from "./routes/admin-setup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/admin/setup-employee", handleCreateAdminEmployee);

  // Serve static files from public directory (robots.txt, sitemap.xml, etc.)
  const publicDir = path.join(__dirname, "../public");
  app.use(express.static(publicDir));

  // Serve static files from the SPA build directory
  const spaDir = path.join(__dirname, "../dist/spa");
  app.use(express.static(spaDir));

  // SPA fallback: serve index.html for all non-API routes
  // This allows React Router to handle client-side routing
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(spaDir, "index.html"));
  });

  return app;
}
