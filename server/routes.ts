import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertVehicleSchema, insertParkingSessionSchema, insertExitRequestSchema, insertPushSubscriptionSchema, insertMessageSchema } from "@shared/schema";
import webpush from 'web-push';

// Configure web push (in production, these should come from environment)
webpush.setVapidDetails(
  'mailto:contact@querosair.app',
  'BMi4---c8fDLaxxMrJOEy4-S8i-xf5GQGA3LgYMBBxs7VMoCgalBFd0PEezzo6rHv81TKBvOtuGIoQQ4W_WdgpI',
  'qlyHpwzB-Te30Ge2_JnnEkMAha69_gjnHTgy_NKHvJU'
);

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
      if (activeSession.blockingVehicleId) {
        broadcastToUser(activeSession.blockingVehicleId, {
          type: 'EXIT_REQUEST',
          data: {
            requestId: exitRequest.id,
            sessionId: activeSession.id,
            blockedVehicle: userVehicle,
          }
        });
      }

      res.json(exitRequest);
    } catch (error) {
      console.error("Error creating exit request:", error);
      res.status(500).json({ message: "Failed to create exit request" });
    }
  });

  app.patch('/api/exit-requests/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response, responseMessage } = req.body;
      
      await storage.respondToExitRequest(id, response, responseMessage);
      res.json({ success: true });
    } catch (error) {
      console.error("Error responding to exit request:", error);
      res.status(500).json({ message: "Failed to respond to exit request" });
    }
  });

  // Push notification routes
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriptionData = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId,
      });
      
      const subscription = await storage.savePushSubscription(subscriptionData);
      res.json({ success: true, subscription });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint } = req.body;
      
      await storage.deletePushSubscription(userId, endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId,
      });
      
      const message = await storage.createMessage(messageData);
      
      // Send push notification to receiver
      try {
        const subscriptions = await storage.getPushSubscriptionsByUserId(messageData.receiverId);
        const pushPayload = JSON.stringify({
          title: 'Nova Mensagem - Quero Sair',
          body: messageData.content,
          data: {
            exitRequestId: messageData.exitRequestId,
            senderId,
          }
        });

        await Promise.all(
          subscriptions.map(sub =>
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, pushPayload)
            .catch(err => console.error('Push notification error:', err))
          )
        );
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/:exitRequestId', isAuthenticated, async (req: any, res) => {
    try {
      const { exitRequestId } = req.params;
      const messages = await storage.getMessagesByExitRequestId(exitRequestId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
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
      userConnections.forEach((connection, userId) => {
        if (connection === ws) {
          userConnections.delete(userId);
        }
      });
    });
  });

  function broadcastToUser(vehicleId: string, message: any) {
    // Find the user connection by vehicle ID (this would need to be enhanced)
    userConnections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
