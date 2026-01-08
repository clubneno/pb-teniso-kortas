import express, { type Request, Response, NextFunction } from "express";

const app = express();

// Simple health check that doesn't require any dependencies
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Domain restriction middleware
app.use((req, res, next) => {
  const host = req.get('host');
  const allowedDomains = ['pbtenisokortas.lt', 'www.pbtenisokortas.lt'];

  if (process.env.NODE_ENV === 'development' ||
      host?.includes('localhost') ||
      host?.includes('127.0.0.1') ||
      host?.includes('.vercel.app')) {
    return next();
  }

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

// Register routes with error capturing
let routesInitialized = false;
let initPromise: Promise<void> | null = null;
let initError: Error | null = null;

async function initRoutes() {
  if (initError) {
    throw initError;
  }
  
  if (!routesInitialized && !initPromise) {
    initPromise = (async () => {
      try {
        console.log("Starting route initialization...");
        
        // Import routes module
        console.log("Importing routes module...");
        const routesModule = await import("./routes.js");
        console.log("Routes module imported:", Object.keys(routesModule));
        
        const { registerRoutes } = routesModule;
        console.log("registerRoutes function found");
        
        await registerRoutes(app);
        routesInitialized = true;
        console.log("Routes initialized successfully");
      } catch (error) {
        console.error("Failed to initialize routes:", error);
        console.error("Error stack:", (error as Error).stack);
        initError = error as Error;
        throw error;
      }
    })();
  }
  if (initPromise) {
    await initPromise;
  }
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Express error handler:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message, error: String(err) });
});

// Export for Vercel serverless
export default async function handler(req: Request, res: Response) {
  // Health check doesn't need routes
  if (req.url === '/api/health' || req.url?.startsWith('/api/health?')) {
    return app(req, res);
  }
  
  try {
    await initRoutes();
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ 
      message: "Server initialization failed", 
      error: String(error),
      stack: (error as Error).stack 
    });
  }
}
