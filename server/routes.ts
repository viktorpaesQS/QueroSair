import { Express } from "express";

export async function registerRoutes(app: Express) {
  // rota de teste
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong 🏓" });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  return app;
}
