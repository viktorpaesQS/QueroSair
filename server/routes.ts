import { Express } from "express";

export async function registerRoutes(app: Express) {
  // Rota de teste
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong 🏓" });
  });

  // Aqui no futuro podes adicionar outras rotas
  // ex: app.use("/api/users", usersRouter);

  return app;
}
