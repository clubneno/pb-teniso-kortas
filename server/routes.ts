import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertReservationSchema, updateReservationSchema, insertCourtSchema, registerSchema, loginSchema } from "@shared/schema";
import { emailService } from "./services/emailService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

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
          await emailService.sendReservationCancellation(user!, existingReservation);
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
    <loc>https://pbtenisokortas.lt/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  });

  // SEO - Robots.txt
  app.get("/robots.txt", (req, res) => {
    const robots = `User-agent: *
Allow: /
Allow: /auth

Disallow: /dashboard
Disallow: /admin
Disallow: /api/

Sitemap: https://pbtenisokortas.lt/sitemap.xml`;
    
    res.set('Content-Type', 'text/plain');
    res.send(robots);
  });

  const httpServer = createServer(app);
  return httpServer;
}
