import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertVehicleSchema, insertParkingSessionSchema, insertExitRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Vehicle routes
  app.post('/api/vehicles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vehicleData = insertVehicleSchema.parse({ ...req.body, userId });
      
      // Check if user already has a vehicle
      const existingVehicle = await storage.getVehicleByUserId(userId);
      if (existingVehicle) {
        return res.status(400).json({ message: "User already has a registered vehicle" });
      }

      // Check if plate is already registered
      const existingPlate = await storage.getVehicleByPlate(vehicleData.plate);
      if (existingPlate) {
        return res.status(400).json({ message: "Vehicle plate already registered" });
      }

      const vehicle = await storage.createVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.get('/api/vehicles/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vehicle = await storage.getVehicleByUserId(userId);
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.get('/api/vehicles/qr/:qrCode', isAuthenticated, async (req, res) => {
    try {
      const { qrCode } = req.params;
      const vehicle = await storage.getVehicleByQRCode(decodeURIComponent(qrCode));
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle by QR:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  // Parking session routes
  app.post('/api/parking-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userVehicle = await storage.getVehicleByUserId(userId);
      
      if (!userVehicle) {
        return res.status(400).json({ message: "User must register a vehicle first" });
      }

      const sessionData = insertParkingSessionSchema.parse({
        ...req.body,
        blockedVehicleId: userVehicle.id,
      });

      const session = await storage.createParkingSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating parking session:", error);
      res.status(500).json({ message: "Failed to create parking session" });
    }
  });

  app.get('/api/parking-sessions/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userVehicle = await storage.getVehicleByUserId(userId);
      
      if (!userVehicle) {
        return res.json(null);
      }

      const session = await storage.getActiveParkingSession(userVehicle.id);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  // Exit request routes
  app.post('/api/exit-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userVehicle = await storage.getVehicleByUserId(userId);
      
      if (!userVehicle) {
        return res.status(400).json({ message: "User must register a vehicle first" });
      }

      const activeSession = await storage.getActiveParkingSession(userVehicle.id);
      if (!activeSession) {
        return res.status(400).json({ message: "No active parking session found" });
      }

      const requestData = insertExitRequestSchema.parse({
        parkingSessionId: activeSession.id,
      });

      const exitRequest = await storage.createExitRequest(requestData);
      
      // Notify blocking vehicle via WebSocket
      broadcastToUser(activeSession.blockingVehicleId, {
        type: 'EXIT_REQUEST',
        data: {
          requestId: exitRequest.id,
          sessionId: activeSession.id,
          blockedVehicle: userVehicle,
        }
      });

      res.json(exitRequest);
    } catch (error) {
      console.error("Error creating exit request:", error);
      res.status(500).json({ message: "Failed to create exit request" });
    }
  });

  app.patch('/api/exit-requests/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      
      await storage.respondToExitRequest(id, response);
      res.json({ success: true });
    } catch (error) {
      console.error("Error responding to exit request:", error);
      res.status(500).json({ message: "Failed to respond to exit request" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const userConnections = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req: any) => {
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'AUTH' && data.userId) {
          userConnections.set(data.userId, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove connection from map
      for (const [userId, connection] of userConnections.entries()) {
        if (connection === ws) {
          userConnections.delete(userId);
          break;
        }
      }
    });
  });

  function broadcastToUser(vehicleId: string, message: any) {
    // Find the user connection by vehicle ID (this would need to be enhanced)
    for (const [userId, ws] of userConnections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  return httpServer;
}
