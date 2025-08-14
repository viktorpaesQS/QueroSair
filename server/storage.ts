import {
  users,
  vehicles,
  parkingSessions,
  exitRequests,
  pushSubscriptions,
  messages,
  type User,
  type UpsertUser,
  type Vehicle,
  type InsertVehicle,
  type ParkingSession,
  type InsertParkingSession,
  type ExitRequest,
  type InsertExitRequest,
  type PushSubscription,
  type InsertPushSubscription,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Vehicle operations
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getVehicleByUserId(userId: string): Promise<Vehicle | undefined>;
  getVehicleByQRCode(qrCode: string): Promise<Vehicle | undefined>;
  getVehicleByPlate(plate: string): Promise<Vehicle | undefined>;
  
  // Parking session operations
  createParkingSession(session: InsertParkingSession): Promise<ParkingSession>;
  getActiveParkingSession(blockedVehicleId: string): Promise<ParkingSession | undefined>;
  resolveParkingSession(sessionId: string): Promise<void>;
  
  // Exit request operations
  createExitRequest(request: InsertExitRequest): Promise<ExitRequest>;
  getExitRequestsBySessionId(sessionId: string): Promise<ExitRequest[]>;
  respondToExitRequest(requestId: string, response: string, responseMessage?: string): Promise<void>;
  
  // Push notification operations
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(userId: string, endpoint: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByExitRequestId(exitRequestId: string): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const qrCode = `quero-sair://${randomUUID()}`;
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        ...vehicleData,
        qrCode,
      })
      .returning();
    return vehicle;
  }

  async getVehicleByUserId(userId: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.userId, userId), eq(vehicles.isActive, true)));
    return vehicle;
  }

  async getVehicleByQRCode(qrCode: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.qrCode, qrCode), eq(vehicles.isActive, true)));
    return vehicle;
  }

  async getVehicleByPlate(plate: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.plate, plate), eq(vehicles.isActive, true)));
    return vehicle;
  }

  async createParkingSession(sessionData: InsertParkingSession): Promise<ParkingSession> {
    const [session] = await db
      .insert(parkingSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getActiveParkingSession(blockedVehicleId: string): Promise<ParkingSession | undefined> {
    const [session] = await db
      .select()
      .from(parkingSessions)
      .where(
        and(
          eq(parkingSessions.blockedVehicleId, blockedVehicleId),
          eq(parkingSessions.isActive, true)
        )
      );
    return session;
  }

  async resolveParkingSession(sessionId: string): Promise<void> {
    await db
      .update(parkingSessions)
      .set({
        isActive: false,
        resolvedAt: new Date(),
      })
      .where(eq(parkingSessions.id, sessionId));
  }

  async createExitRequest(requestData: InsertExitRequest): Promise<ExitRequest> {
    const [request] = await db
      .insert(exitRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getExitRequestsBySessionId(sessionId: string): Promise<ExitRequest[]> {
    return await db
      .select()
      .from(exitRequests)
      .where(eq(exitRequests.parkingSessionId, sessionId))
      .orderBy(desc(exitRequests.requestedAt));
  }

  async respondToExitRequest(requestId: string, response: string, responseMessage?: string): Promise<void> {
    await db
      .update(exitRequests)
      .set({
        response,
        responseMessage,
        respondedAt: new Date(),
        isResolved: true,
      })
      .where(eq(exitRequests.id, requestId));
  }

  // Push notification operations
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete existing subscription for this user and endpoint if exists
    await db
      .delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, subscription.userId),
        eq(pushSubscriptions.endpoint, subscription.endpoint)
      ));

    const [newSubscription] = await db
      .insert(pushSubscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessagesByExitRequestId(exitRequestId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.exitRequestId, exitRequestId))
      .orderBy(messages.timestamp);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, messageId));
  }
}

export const storage = new DatabaseStorage();
