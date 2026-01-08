import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

// Domain restriction middleware - only allow access from custom domain
app.use((req, res, next) => {
  const host = req.get('host');
  const allowedDomains = ['pbtenisokortas.lt', 'www.pbtenisokortas.lt'];

  // Allow localhost, Vercel preview URLs, and development domains
  if (process.env.NODE_ENV === 'development' ||
      host?.includes('localhost') ||
      host?.includes('127.0.0.1') ||
      host?.includes('.vercel.app')) {
    return next();
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
    const newHost = host.substring(4);
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

      console.log(logLine);
    }
  });

  next();
});

// Register routes
let routesInitialized = false;
let initPromise: Promise<void> | null = null;

async function initRoutes() {
  if (!routesInitialized && !initPromise) {
    initPromise = (async () => {
      await registerRoutes(app);
      routesInitialized = true;
    })();
  }
  if (initPromise) {
    await initPromise;
  }
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export for Vercel serverless
export default async function handler(req: Request, res: Response) {
  await initRoutes();
  return app(req, res);
}
