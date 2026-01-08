import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Domain restriction middleware - only allow access from custom domain
app.use((req, res, next) => {
  const host = req.get('host');
  const allowedDomains = ['pbtenisokortas.lt', 'www.pbtenisokortas.lt'];
  
  // Allow localhost and development domains for development
  if (process.env.NODE_ENV === 'development' || 
      host?.includes('localhost') || 
      host?.includes('127.0.0.1')) {
    return next();
  }
  
  // Redirect from .replit.app to custom domain
  if (host && host.endsWith('.replit.app')) {
    return res.redirect(301, `https://pbtenisokortas.lt${req.originalUrl}`);
  }
  
  // Check if host is in allowed domains
  if (!host || !allowedDomains.includes(host)) {
    return res.redirect(301, `https://pbtenisokortas.lt${req.originalUrl}`);
  }
  
  next();
});

// Handle www subdomain redirect
app.use((req, res, next) => {
  const host = req.get('host');
  if (host && host.startsWith('www.')) {
    const newHost = host.substring(4); // Remove 'www.'
    const protocol = req.get('x-forwarded-proto') || 'https';
    return res.redirect(301, `${protocol}://${newHost}${req.originalUrl}`);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(app);

  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
