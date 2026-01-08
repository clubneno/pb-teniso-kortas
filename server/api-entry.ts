import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes
let routesInitialized = false;
let initializationError: Error | null = null;

const initializeRoutes = async () => {
  if (routesInitialized) return;
  try {
    await registerRoutes(app);
    routesInitialized = true;
  } catch (error) {
    initializationError = error as Error;
    console.error("Failed to initialize routes:", error);
  }
};

// Start initialization immediately
initializeRoutes();

export default async function handler(req: any, res: any) {
  // Ensure routes are initialized
  if (!routesInitialized && !initializationError) {
    await initializeRoutes();
  }

  if (initializationError) {
    return res.status(500).json({ 
      error: "Server initialization failed", 
      message: initializationError.message 
    });
  }

  // Let Express handle the request
  return new Promise((resolve) => {
    app(req, res);
    res.on("finish", resolve);
  });
}
