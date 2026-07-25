import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupWebSocket } from "./websocket/socketManager.js";
import { startInvoiceScheduler } from "./services/invoiceScheduler.js";
import routes from "./routes/index.js";
import { initializeDatabase } from "./config/database.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("combined"));

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const dbStatus = dbStateMap[dbState] ?? "unknown";
  const isHealthy = dbState === 1;

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? "ok" : "degraded",
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Service temporarily unavailable — database reconnecting. Please retry in a moment.",
    });
  }
  next();
});

app.use("/api", routes);

setupWebSocket(io);
app.set("io", io);

app.use(errorHandler);

const startServer = async () => {
  try {
    await initializeDatabase();

    startInvoiceScheduler();

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export { io };
