import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as AppUser, forgotPasswordSchema } from "../shared/schema";
import { emailService } from "./services/emailService";

declare global {
  namespace Express {
    interface User extends AppUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle potential bcrypt format from old data
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    // For bcrypt format, we'll need to rehash with scrypt
    return false; // Force password reset for old users
  }
  
  const parts = stored.split(".");
  if (parts.length !== 2) {
    return false; // Invalid format
  }
  
  const [hashed, salt] = parts;
  if (!hashed || !salt) {
    return false; // Missing hash or salt
  }
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "El. paštas jau užimtas" });
      }

      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        isAdmin: false,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registracijos klaida" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // Handle both GET and POST logout requests
  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      // Destroy session and redirect to landing page
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: 'Logout error' });
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "Jei el. paštas egzistuoja, atkūrimo instrukcijos išsiųstos" });
      }

      // Generate reset token (simple implementation)
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Store reset token in memory temporarily
      // In production, this should be stored in database or Redis
      const resetData = {
        token: resetToken,
        userId: user.id,
        expires: resetExpiry
      };
      
      // Simple in-memory storage (for demonstration)
      (global as any).passwordResetTokens = (global as any).passwordResetTokens || new Map();
      (global as any).passwordResetTokens.set(resetToken, resetData);
      
      // Send email
      await emailService.sendPasswordReset(user, resetToken);
      
      res.json({ message: "Jei el. paštas egzistuoja, atkūrimo instrukcijos išsiųstos" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Slaptažodžio atkūrimo klaida" });
    }
  });

  // Validate reset token endpoint
  app.get("/api/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: "Netinkama nuoroda" });
      }

      // Check if token exists and is not expired
      const resetTokens = (global as any).passwordResetTokens || new Map();
      const resetData = resetTokens.get(token);
      
      if (!resetData) {
        return res.status(400).json({ valid: false, message: "Netinkama nuoroda" });
      }
      
      if (new Date() > resetData.expires) {
        // Clean up expired token
        resetTokens.delete(token);
        return res.status(400).json({ valid: false, message: "Nuorodos galiojimas pasibaigė" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({ valid: false, message: "Serverio klaida" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Netinkami duomenys" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Slaptažodis turi būti bent 6 simbolių" });
      }

      // Check if token exists and is not expired
      const resetTokens = (global as any).passwordResetTokens || new Map();
      const resetData = resetTokens.get(token);
      
      if (!resetData) {
        return res.status(400).json({ message: "Netinkama arba pasibaigusi nuoroda" });
      }
      
      if (new Date() > resetData.expires) {
        // Clean up expired token
        resetTokens.delete(token);
        return res.status(400).json({ message: "Nuorodos galiojimas pasibaigė" });
      }

      // Update user password using the existing updateUser method
      await storage.updateUser(resetData.userId, { password });
      
      // Clean up used token
      resetTokens.delete(token);
      res.json({ message: "Slaptažodis sėkmingai pakeistas" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Serverio klaida" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
