import {
  users,
  courts,
  reservations,
  type User,
  type InsertUser,
  type Court,
  type InsertCourt,
  type Reservation,
  type InsertReservation,
  type UpdateReservation,
  type ReservationWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - for local authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Court operations
  getCourts(): Promise<Court[]>;
  getCourt(id: number): Promise<Court | undefined>;
  createCourt(court: InsertCourt): Promise<Court>;
  updateCourt(id: number, data: Partial<Court>): Promise<Court | undefined>;
  
  // Reservation operations
  getReservations(filters?: {
    userId?: number;
    courtId?: number;
    date?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReservationWithDetails[]>;
  getReservation(id: number): Promise<ReservationWithDetails | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, data: UpdateReservation): Promise<Reservation | undefined>;
  deleteReservation(id: number): Promise<boolean>;
  
  // Check for conflicts
  checkReservationConflict(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean>;
  
  // Get availability for a specific date and court
  getCourtAvailability(courtId: number, date: string): Promise<{ startTime: string; endTime: string }[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(userId: number): Promise<{ totalReservations: number; lastReservation?: string }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - for local authentication
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Court operations
  async getCourts(): Promise<Court[]> {
    return await db.select().from(courts).where(eq(courts.isActive, true)).orderBy(asc(courts.id));
  }

  async getCourt(id: number): Promise<Court | undefined> {
    const [court] = await db.select().from(courts).where(eq(courts.id, id));
    return court;
  }

  async createCourt(court: InsertCourt): Promise<Court> {
    const [newCourt] = await db.insert(courts).values(court).returning();
    return newCourt;
  }

  async updateCourt(id: number, data: Partial<Court>): Promise<Court | undefined> {
    const [court] = await db
      .update(courts)
      .set(data)
      .where(eq(courts.id, id))
      .returning();
    return court;
  }

  // Reservation operations
  async getReservations(filters: {
    userId?: number;
    courtId?: number;
    date?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ReservationWithDetails[]> {
    let query = db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        courtId: reservations.courtId,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        totalPrice: reservations.totalPrice,
        status: reservations.status,
        notes: reservations.notes,
        createdAt: reservations.createdAt,
        updatedAt: reservations.updatedAt,
        user: users,
        court: courts,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .innerJoin(courts, eq(reservations.courtId, courts.id));

    const conditions: any[] = [];

    if (filters.userId) {
      conditions.push(eq(reservations.userId, filters.userId));
    }
    if (filters.courtId) {
      conditions.push(eq(reservations.courtId, filters.courtId));
    }
    if (filters.date) {
      conditions.push(eq(reservations.date, filters.date));
    }
    if (filters.status) {
      conditions.push(eq(reservations.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(reservations.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(reservations.date, filters.endDate));
    }

    let finalQuery = query;
    if (conditions.length > 0) {
      finalQuery = query.where(and(...conditions));
    }

    const results = await finalQuery.orderBy(desc(reservations.date), desc(reservations.startTime));
    
    return results.map(result => ({
      ...result,
      user: result.user,
      court: result.court,
    }));
  }

  async getReservation(id: number): Promise<ReservationWithDetails | undefined> {
    const [result] = await db
      .select({
        id: reservations.id,
        userId: reservations.userId,
        courtId: reservations.courtId,
        date: reservations.date,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        totalPrice: reservations.totalPrice,
        status: reservations.status,
        notes: reservations.notes,
        createdAt: reservations.createdAt,
        updatedAt: reservations.updatedAt,
        user: users,
        court: courts,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .innerJoin(courts, eq(reservations.courtId, courts.id))
      .where(eq(reservations.id, id));

    if (!result) return undefined;

    return {
      ...result,
      user: result.user,
      court: result.court,
    };
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const [newReservation] = await db.insert(reservations).values(reservation).returning();
    return newReservation;
  }

  async updateReservation(id: number, data: UpdateReservation): Promise<Reservation | undefined> {
    const [reservation] = await db
      .update(reservations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return reservation;
  }

  async deleteReservation(id: number): Promise<boolean> {
    const result = await db.delete(reservations).where(eq(reservations.id, id));
    return (result.rowCount || 0) > 0;
  }

  async checkReservationConflict(
    courtId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<boolean> {
    const conditions = [
      eq(reservations.courtId, courtId),
      eq(reservations.date, date),
      eq(reservations.status, "confirmed"),
    ];

    if (excludeId) {
      conditions.push(ne(reservations.id, excludeId));
    }

    const conflicts = await db
      .select()
      .from(reservations)
      .where(and(...conditions));

    return conflicts.some(conflict => {
      const conflictStart = conflict.startTime;
      const conflictEnd = conflict.endTime;
      
      // Check for time overlap
      return (
        (startTime >= conflictStart && startTime < conflictEnd) ||
        (endTime > conflictStart && endTime <= conflictEnd) ||
        (startTime <= conflictStart && endTime >= conflictEnd)
      );
    });
  }

  async getCourtAvailability(courtId: number, date: string): Promise<{ startTime: string; endTime: string }[]> {
    const reservedSlots = await db
      .select({
        startTime: reservations.startTime,
        endTime: reservations.endTime,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.courtId, courtId),
          eq(reservations.date, date),
          eq(reservations.status, "confirmed")
        )
      )
      .orderBy(asc(reservations.startTime));

    return reservedSlots;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(userId: number): Promise<{ totalReservations: number; lastReservation?: string }> {
    const userReservations = await db
      .select({
        date: reservations.date,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.date));

    return {
      totalReservations: userReservations.length,
      lastReservation: userReservations[0]?.date,
    };
  }
}

export const storage = new DatabaseStorage();
