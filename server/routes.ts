import type { Express } from "express";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertReservationSchema, updateReservationSchema, insertCourtSchema, registerSchema, loginSchema } from "../shared/schema";
import { emailService } from "./services/emailService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<void> {
  // Auth middleware
  setupAuth(app);

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public routes - no authentication required
  app.get('/api/courts', async (req, res) => {
    try {
      const courts = await storage.getCourts();
      res.json(courts);
    } catch (error) {
      console.error("Error fetching courts:", error);
      res.status(500).json({ message: "Failed to fetch courts" });
    }
  });

  app.get('/api/reservations/public', async (req, res) => {
    try {
      const { date, courtId } = req.query;
      const reservations = await storage.getReservations({
        date: date as string,
        courtId: courtId ? parseInt(courtId as string) : undefined,
        status: "confirmed"
      });
      
      // Return only basic info for public view (no user details)
      const publicReservations = reservations.map(r => ({
        id: r.id,
        courtId: r.courtId,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        court: r.court
      }));
      
      res.json(publicReservations);
    } catch (error) {
      console.error("Error fetching public reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.get('/api/courts/:courtId/availability', async (req, res) => {
    try {
      const courtId = parseInt(req.params.courtId);
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const reservedSlots = await storage.getCourtAvailability(courtId, date as string);
      res.json(reservedSlots);
    } catch (error) {
      console.error("Error fetching court availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Protected user routes
  app.get('/api/reservations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status, startDate, endDate } = req.query;
      
      const reservations = await storage.getReservations({
        userId,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching user reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.post('/api/reservations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Incoming reservation data:", req.body);
      console.log("User ID:", userId);
      
      const validatedData = insertReservationSchema.parse({
        ...req.body,
        userId,
      });

      // Validate reservation duration (max 120 minutes)
      const startTime = validatedData.startTime;
      const endTime = validatedData.endTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      if (durationMinutes > 120) {
        return res.status(400).json({ message: "Maksimalus rezervacijos laikas yra 120 minučių" });
      }

      if (durationMinutes % 30 !== 0) {
        return res.status(400).json({ message: "Rezervacijos trukmė turi būti 30 minučių kartotiniai" });
      }

      // Check for conflicts
      const hasConflict = await storage.checkReservationConflict(
        validatedData.courtId,
        validatedData.date,
        validatedData.startTime,
        validatedData.endTime
      );

      if (hasConflict) {
        return res.status(409).json({ message: "Time slot is already reserved" });
      }

      const reservation = await storage.createReservation(validatedData);
      const reservationWithDetails = await storage.getReservation(reservation.id);
      
      // Send confirmation email
      try {
        await emailService.sendReservationConfirmation(user, reservationWithDetails!);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
      
      res.status(201).json(reservationWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Reservation validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.put('/api/reservations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reservationId = parseInt(req.params.id);
      
      const existingReservation = await storage.getReservation(reservationId);
      if (!existingReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (existingReservation.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this reservation" });
      }

      const validatedData = updateReservationSchema.parse(req.body);
      
      // Check for conflicts if changing time/date/court
      if (validatedData.courtId || validatedData.date || validatedData.startTime || validatedData.endTime) {
        const hasConflict = await storage.checkReservationConflict(
          validatedData.courtId || existingReservation.courtId,
          validatedData.date || existingReservation.date,
          validatedData.startTime || existingReservation.startTime,
          validatedData.endTime || existingReservation.endTime,
          reservationId
        );

        if (hasConflict) {
          return res.status(409).json({ message: "Time slot is already reserved" });
        }
      }

      const updatedReservation = await storage.updateReservation(reservationId, validatedData);
      const reservationWithDetails = await storage.getReservation(reservationId);
      
      // Send update email
      const user = await storage.getUser(userId);
      try {
        await emailService.sendReservationUpdate(user!, reservationWithDetails!);
      } catch (emailError) {
        console.error("Failed to send update email:", emailError);
      }
      
      res.json(reservationWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating reservation:", error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  app.delete('/api/reservations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reservationId = parseInt(req.params.id);
      
      const existingReservation = await storage.getReservation(reservationId);
      if (!existingReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (existingReservation.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this reservation" });
      }

      const success = await storage.deleteReservation(reservationId);
      
      if (success) {
        // Send cancellation email
        const user = await storage.getUser(userId);
        try {
          await emailService.sendReservationCancellation({
            email: user!.email,
            firstName: user!.firstName || '',
            courtName: existingReservation.court.name,
            date: existingReservation.date,
            startTime: existingReservation.startTime,
            endTime: existingReservation.endTime,
            reason: 'Vartotojo sprendimu'
          });
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
        }
        
        res.json({ message: "Reservation cancelled successfully" });
      } else {
        res.status(404).json({ message: "Reservation not found" });
      }
    } catch (error) {
      console.error("Error deleting reservation:", error);
      res.status(500).json({ message: "Failed to delete reservation" });
    }
  });

  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phone } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        phone,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin routes
  app.get('/api/admin/reservations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status, startDate, endDate, courtId } = req.query;
      
      const reservations = await storage.getReservations({
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        courtId: courtId ? parseInt(courtId as string) : undefined,
      });
      
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching admin reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      
      // Get stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (u) => {
          const stats = await storage.getUserStats(u.id);
          return { ...u, ...stats };
        })
      );
      
      res.json(usersWithStats);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/reservations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reservationId = parseInt(req.params.id);
      const validatedData = updateReservationSchema.parse(req.body);
      
      const updatedReservation = await storage.updateReservation(reservationId, validatedData);
      const reservationWithDetails = await storage.getReservation(reservationId);
      
      res.json(reservationWithDetails);
    } catch (error) {
      console.error("Error updating admin reservation:", error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  app.delete('/api/admin/reservations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reservationId = parseInt(req.params.id);
      const success = await storage.deleteReservation(reservationId);
      
      if (success) {
        res.json({ message: "Reservation deleted successfully" });
      } else {
        res.status(404).json({ message: "Reservation not found" });
      }
    } catch (error) {
      console.error("Error deleting admin reservation:", error);
      res.status(500).json({ message: "Failed to delete reservation" });
    }
  });

  app.post('/api/admin/reservations', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Admin creating reservation:", req.body);
      
      const validatedData = insertReservationSchema.parse(req.body);

      // Check for conflicts
      const hasConflict = await storage.checkReservationConflict(
        validatedData.courtId,
        validatedData.date,
        validatedData.startTime,
        validatedData.endTime
      );

      if (hasConflict) {
        return res.status(409).json({ message: "Time slot is already reserved" });
      }

      const reservation = await storage.createReservation(validatedData);
      const reservationWithDetails = await storage.getReservation(reservation.id);
      
      // Send confirmation email
      const targetUser = await storage.getUser(validatedData.userId);
      if (targetUser) {
        try {
          await emailService.sendReservationConfirmation(targetUser, reservationWithDetails!);
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }
      }
      
      res.status(201).json(reservationWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Admin reservation validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating admin reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.post('/api/admin/courts', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertCourtSchema.parse(req.body);
      const court = await storage.createCourt(validatedData);
      
      res.status(201).json(court);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating court:", error);
      res.status(500).json({ message: "Failed to create court" });
    }
  });

  app.patch('/api/admin/courts/:courtId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courtId = parseInt(req.params.courtId);
      const updateData = req.body;

      // Validate only the fields that are being updated
      if (updateData.hourlyRate !== undefined) {
        const hourlyRateSchema = z.object({
          hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format")
        });
        hourlyRateSchema.parse({ hourlyRate: updateData.hourlyRate });
      }

      const updatedCourt = await storage.updateCourt(courtId, updateData);
      
      if (!updatedCourt) {
        return res.status(404).json({ message: "Court not found" });
      }

      res.json(updatedCourt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating court:", error);
      res.status(500).json({ message: "Failed to update court" });
    }
  });

  // Admin user creation
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName, phone, isAdmin } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create new user
      const newUser = await storage.createUser({
        email,
        password, // Will be hashed in storage.createUser
        firstName,
        lastName,
        phone: phone || null,
        isAdmin: isAdmin || false
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user
  app.patch('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { email, password, firstName, lastName, phone, isAdmin } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If email is being changed, check if new email is already in use
      if (email && email !== existingUser.email) {
        const emailInUse = await storage.getUserByEmail(email);
        if (emailInUse) {
          return res.status(400).json({ message: "User with this email already exists" });
        }
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, {
        email,
        password: password || undefined, // Only update password if provided
        firstName,
        lastName,
        phone: phone || null,
        isAdmin: isAdmin !== undefined ? isAdmin : existingUser.isAdmin
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Delete user
      try {
        const deleted = await storage.deleteUser(userId);
        if (!deleted) {
          return res.status(500).json({ message: "Failed to delete user" });
        }
        res.json({ message: "User deleted successfully" });
      } catch (deleteError: any) {
        if (deleteError.message === "Cannot delete user with active reservations") {
          return res.status(400).json({ 
            message: "Negalima pašalinti naudotojo su aktyviomis rezervacijomis. Palaukite, kol rezervacijos pasibaigs arba atšaukite jas." 
          });
        }
        throw deleteError;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // SEO - Sitemap XML
  app.get("/sitemap.xml", (req, res) => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pbtenisokortas.lt/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pbtenisokortas.lt/prisijungimas</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://pbtenisokortas.lt/savitarna</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // SEO - Robots.txt
  app.get("/robots.txt", (req, res) => {
    const robots = `User-agent: *
Allow: /
Allow: /prisijungimas

Disallow: /auth
Disallow: /dashboard
Disallow: /savitarna
Disallow: /admin
Disallow: /api/

Sitemap: https://pbtenisokortas.lt/sitemap.xml`;
    
    res.set('Content-Type', 'text/plain');
    res.send(robots);
  });

  // Maintenance periods routes (admin only)
  app.get("/api/admin/maintenance", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { courtId, date } = req.query;
      const filters: { courtId?: number; date?: string } = {};
      
      if (courtId) filters.courtId = parseInt(courtId as string);
      if (date) filters.date = date as string;
      
      const periods = await storage.getMaintenancePeriods(filters);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching maintenance periods:", error);
      res.status(500).json({ message: "Failed to fetch maintenance periods" });
    }
  });

  app.post("/api/admin/maintenance", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { courtId, startDate, endDate, startTime, endTime, type, description } = req.body;

      if (!courtId || !startDate || !endDate || !startTime || !endTime) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate type
      const maintenanceType = type || 'maintenance';
      if (!['maintenance', 'winter_season'].includes(maintenanceType)) {
        return res.status(400).json({ message: "Invalid maintenance type" });
      }

      // Find and cancel conflicting reservations within the date range
      const conflictingReservations = await storage.getReservations({
        courtId,
        startDate,
        endDate,
        status: 'confirmed'
      });

      const reservationsToCancel = conflictingReservations.filter(reservation => {
        // Check if maintenance period overlaps with reservation time
        return !(endTime <= reservation.startTime || startTime >= reservation.endTime);
      });

      // Cancellation reason based on type
      const cancellationReason = maintenanceType === 'winter_season'
        ? 'Žiemos sezonas - kortas uždarytas'
        : 'Korto techninės priežiūros darbai';

      // Cancel conflicting reservations
      for (const reservation of reservationsToCancel) {
        await storage.updateReservation(reservation.id, { status: 'cancelled' });

        // Send email notification about cancellation
        try {
          await emailService.sendReservationCancellation({
            email: reservation.user.email,
            firstName: reservation.user.firstName || '',
            courtName: reservation.court.name,
            date: reservation.date,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            reason: cancellationReason
          });
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
          // Continue with maintenance creation even if email fails
        }
      }

      const period = await storage.createMaintenancePeriod({
        courtId,
        startDate,
        endDate,
        startTime,
        endTime,
        type: maintenanceType,
        description
      });

      const response = {
        ...period,
        cancelledReservations: reservationsToCancel.length
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating maintenance period:", error);
      res.status(500).json({ message: "Failed to create maintenance period" });
    }
  });

  app.patch("/api/admin/maintenance/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Validate type if provided
      if (updates.type && !['maintenance', 'winter_season'].includes(updates.type)) {
        return res.status(400).json({ message: "Invalid maintenance type" });
      }

      const period = await storage.updateMaintenancePeriod(id, updates);
      if (!period) {
        return res.status(404).json({ message: "Maintenance period not found" });
      }

      res.json(period);
    } catch (error) {
      console.error("Error updating maintenance period:", error);
      res.status(500).json({ message: "Failed to update maintenance period" });
    }
  });

  app.delete("/api/admin/maintenance/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const deleted = await storage.deleteMaintenancePeriod(id);
      if (!deleted) {
        return res.status(404).json({ message: "Maintenance period not found" });
      }

      res.json({ message: "Maintenance period deleted successfully" });
    } catch (error) {
      console.error("Error deleting maintenance period:", error);
      res.status(500).json({ message: "Failed to delete maintenance period" });
    }
  });

  // Test email templates (admin only)
  app.post('/api/admin/test-email', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { type, email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email address required' });
      }

      const testUser = {
        firstName: 'Jonas',
        lastName: 'Jonaitis',
        email: email
      };

      const testReservation = {
        id: 999,
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:30',
        totalPrice: '15',
        court: { name: 'Kortas #PB' },
        status: 'confirmed'
      };

      switch (type) {
        case 'confirmation':
          await emailService.sendReservationConfirmation(testUser as any, testReservation as any);
          break;
        case 'update':
          await emailService.sendReservationUpdate(testUser as any, testReservation as any);
          break;
        case 'cancellation':
          await emailService.sendReservationCancellation({
            email: testUser.email,
            firstName: testUser.firstName,
            courtName: 'Kortas #PB',
            date: new Date().toISOString().split('T')[0],
            startTime: '14:00',
            endTime: '15:30',
            reason: 'Testavimo tikslais'
          });
          break;
        case 'maintenance':
          await emailService.sendMaintenanceNotification({
            email: testUser.email,
            firstName: testUser.firstName,
            courtName: 'Kortas #PB',
            date: new Date().toISOString().split('T')[0],
            startTime: '14:00',
            endTime: '15:30',
            description: 'Korto dangos atnaujinimas'
          });
          break;
        default:
          return res.status(400).json({ error: 'Invalid email type' });
      }

      res.json({ message: `Test email sent successfully to ${email}` });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });
}
