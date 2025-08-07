import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plate: varchar("plate").notNull().unique(),
  vehicleType: varchar("vehicle_type").notNull(), // 'car' or 'motorcycle'
  color: varchar("color").notNull(),
  qrCode: text("qr_code").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parking sessions table
export const parkingSessions = pgTable("parking_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockedVehicleId: varchar("blocked_vehicle_id").notNull().references(() => vehicles.id),
  blockingVehicleId: varchar("blocking_vehicle_id").references(() => vehicles.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Exit requests table
export const exitRequests = pgTable("exit_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parkingSessionId: varchar("parking_session_id").notNull().references(() => parkingSessions.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  response: varchar("response"), // 'moving', 'wait_5min', etc.
  isResolved: boolean("is_resolved").default(false),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  blockedSessions: many(parkingSessions, {
    relationName: "blockedVehicle",
  }),
  blockingSessions: many(parkingSessions, {
    relationName: "blockingVehicle",
  }),
}));

export const parkingSessionsRelations = relations(parkingSessions, ({ one, many }) => ({
  blockedVehicle: one(vehicles, {
    fields: [parkingSessions.blockedVehicleId],
    references: [vehicles.id],
    relationName: "blockedVehicle",
  }),
  blockingVehicle: one(vehicles, {
    fields: [parkingSessions.blockingVehicleId],
    references: [vehicles.id],
    relationName: "blockingVehicle",
  }),
  exitRequests: many(exitRequests),
}));

export const exitRequestsRelations = relations(exitRequests, ({ one }) => ({
  parkingSession: one(parkingSessions, {
    fields: [exitRequests.parkingSessionId],
    references: [parkingSessions.id],
  }),
}));

// Insert schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  qrCode: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParkingSessionSchema = createInsertSchema(parkingSessions).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertExitRequestSchema = createInsertSchema(exitRequests).omit({
  id: true,
  requestedAt: true,
  respondedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type ParkingSession = typeof parkingSessions.$inferSelect;
export type InsertParkingSession = z.infer<typeof insertParkingSessionSchema>;
export type ExitRequest = typeof exitRequests.$inferSelect;
export type InsertExitRequest = z.infer<typeof insertExitRequestSchema>;
