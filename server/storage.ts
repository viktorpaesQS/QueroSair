import {
  users,
  vehicles,
  parkingSessions,
  exitRequests,
  type User,
  type UpsertUser,
  type Vehicle,
  type InsertVehicle,
  type ParkingSession,
  type InsertParkingSession,
  type ExitRequest,
  type InsertExitRequest,
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
  respondToExitRequest(requestId: string, response: string): Promise<void>;
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

  async respondToExitRequest(requestId: string, response: string): Promise<void> {
    await db
      .update(exitRequests)
      .set({
        response,
        respondedAt: new Date(),
        isResolved: true,
      })
      .where(eq(exitRequests.id, requestId));
  }
}

export const storage = new DatabaseStorage();
