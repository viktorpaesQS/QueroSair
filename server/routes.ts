import { Express } from "express";

export function registerRoutes(app: Express) {
  // ping simples
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong 🏓" });
  });

  // health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  return app;
}
