import {
  users,
  courts,
  reservations,
  maintenancePeriods,
  type User,
  type InsertUser,
  type Court,
  type InsertCourt,
  type Reservation,
  type InsertReservation,
  type UpdateReservation,
  type ReservationWithDetails,
  type MaintenancePeriod,
  type InsertMaintenancePeriod,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, ne } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function generateId(): string {
  return randomBytes(16).toString("hex");
}

// Interface for storage operations
export interface IStorage {
  // User operations - for local authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Court operations
  getCourts(): Promise<Court[]>;
  getCourt(id: number): Promise<Court | undefined>;
  createCourt(court: InsertCourt): Promise<Court>;
  updateCourt(id: number, data: Partial<Court>): Promise<Court | undefined>;
  
  // Reservation operations
  getReservations(filters?: {
    userId?: string;
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
  getCourtAvailability(courtId: number, date: string): Promise<{ startTime: string; endTime: string; type?: 'reservation' | 'maintenance'; maintenanceType?: string }[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(userId: string): Promise<{ totalReservations: number; lastReservation?: string }>;
  checkUserHasActiveReservations(userId: string): Promise<boolean>;
  
  // Maintenance operations
  getMaintenancePeriods(filters?: { courtId?: number; date?: string }): Promise<MaintenancePeriod[]>;
  createMaintenancePeriod(maintenance: InsertMaintenancePeriod): Promise<MaintenancePeriod>;
  updateMaintenancePeriod(id: number, data: Partial<MaintenancePeriod>): Promise<MaintenancePeriod | undefined>;
  deleteMaintenancePeriod(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - for local authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }



  async createUser(userData: InsertUser): Promise<User> {
    // Generate a unique ID for the user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Hash password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: userId,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    // If password is provided, hash it
    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }
    
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Check if user has active reservations
      const hasActiveReservations = await this.checkUserHasActiveReservations(id);
      if (hasActiveReservations) {
        throw new Error("Cannot delete user with active reservations");
      }

      // Delete all past reservations associated with this user
      await db.delete(reservations).where(eq(reservations.userId, id));
      
      // Then delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async checkUserHasActiveReservations(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get all reservations for this user that are either:
    // 1. On a future date, OR
    // 2. On today's date but with a future start time
    const activeReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, userId),
          eq(reservations.status, "confirmed")
        )
      );

    // Filter for truly active reservations (future date or future time today)
    const futureReservations = activeReservations.filter(reservation => {
      if (reservation.date > today) {
        return true; // Future date
      }
      if (reservation.date === today && reservation.startTime > currentTime) {
        return true; // Today but future time
      }
      return false; // Past reservation
    });

    return futureReservations.length > 0;
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
    userId?: string;
    courtId?: number;
    date?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ReservationWithDetails[]> {
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

    const baseQuery = db
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

    const results = conditions.length > 0 
      ? await baseQuery.where(and(...conditions)).orderBy(desc(reservations.date), desc(reservations.startTime))
      : await baseQuery.orderBy(desc(reservations.date), desc(reservations.startTime));
    
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
    // Check reservation conflicts
    const reservationConditions = [
      eq(reservations.courtId, courtId),
      eq(reservations.date, date),
      eq(reservations.status, "confirmed"),
    ];

    if (excludeId) {
      reservationConditions.push(ne(reservations.id, excludeId));
    }

    const reservationConflicts = await db
      .select()
      .from(reservations)
      .where(and(...reservationConditions));

    const hasReservationConflict = reservationConflicts.some(conflict => {
      const conflictStart = conflict.startTime;
      const conflictEnd = conflict.endTime;
      
      // Check for time overlap
      return (
        (startTime >= conflictStart && startTime < conflictEnd) ||
        (endTime > conflictStart && endTime <= conflictEnd) ||
        (startTime <= conflictStart && endTime >= conflictEnd)
      );
    });

    // Check maintenance conflicts - query maintenance periods that include this date
    const maintenanceConflicts = await db
      .select()
      .from(maintenancePeriods)
      .where(
        and(
          eq(maintenancePeriods.courtId, courtId),
          lte(maintenancePeriods.startDate, date),
          gte(maintenancePeriods.endDate, date)
        )
      );

    const hasMaintenanceConflict = maintenanceConflicts.some(conflict => {
      const conflictStart = conflict.startTime;
      const conflictEnd = conflict.endTime;

      // Check for time overlap
      return (
        (startTime >= conflictStart && startTime < conflictEnd) ||
        (endTime > conflictStart && endTime <= conflictEnd) ||
        (startTime <= conflictStart && endTime >= conflictEnd)
      );
    });

    return hasReservationConflict || hasMaintenanceConflict;
  }

  async getCourtAvailability(courtId: number, date: string): Promise<{ startTime: string; endTime: string; type?: 'reservation' | 'maintenance' }[]> {
    // Get reserved slots from reservations
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

    // Get maintenance periods that include this date
    const maintenanceSlots = await db
      .select({
        startTime: maintenancePeriods.startTime,
        endTime: maintenancePeriods.endTime,
        maintenanceType: maintenancePeriods.type,
      })
      .from(maintenancePeriods)
      .where(
        and(
          eq(maintenancePeriods.courtId, courtId),
          lte(maintenancePeriods.startDate, date),
          gte(maintenancePeriods.endDate, date)
        )
      )
      .orderBy(asc(maintenancePeriods.startTime));

    // Combine both types of unavailable slots
    const unavailableSlots = [
      ...reservedSlots.map(slot => ({ ...slot, type: 'reservation' as const, maintenanceType: undefined })),
      ...maintenanceSlots.map(slot => ({ ...slot, type: 'maintenance' as const, maintenanceType: slot.maintenanceType }))
    ].sort((a, b) => a.startTime.localeCompare(b.startTime));

    return unavailableSlots;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(userId: string): Promise<{ totalReservations: number; lastReservation?: string }> {
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

  // Maintenance operations
  async getMaintenancePeriods(filters?: { courtId?: number; date?: string }): Promise<MaintenancePeriod[]> {
    const conditions = [];

    if (filters?.courtId) {
      conditions.push(eq(maintenancePeriods.courtId, filters.courtId));
    }

    // If date is provided, find maintenance periods that include this date
    if (filters?.date) {
      conditions.push(lte(maintenancePeriods.startDate, filters.date));
      conditions.push(gte(maintenancePeriods.endDate, filters.date));
    }

    return await db
      .select()
      .from(maintenancePeriods)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(maintenancePeriods.startDate), asc(maintenancePeriods.startTime));
  }

  async createMaintenancePeriod(maintenance: InsertMaintenancePeriod): Promise<MaintenancePeriod> {
    const [period] = await db.insert(maintenancePeriods).values(maintenance).returning();
    return period;
  }

  async updateMaintenancePeriod(id: number, data: Partial<MaintenancePeriod>): Promise<MaintenancePeriod | undefined> {
    const [period] = await db
      .update(maintenancePeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenancePeriods.id, id))
      .returning();
    return period;
  }

  async deleteMaintenancePeriod(id: number): Promise<boolean> {
    const result = await db.delete(maintenancePeriods).where(eq(maintenancePeriods.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
