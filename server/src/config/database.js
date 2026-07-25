import mongoose from "mongoose";

export const MONGOOSE_OPTIONS = {
  maxPoolSize: 50,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  waitQueueTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

export const configureMongoose = () => {
  mongoose.set("bufferCommands", false);
};

export const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, MONGOOSE_OPTIONS);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB initial connection error:", err);
    throw err;
  }
};

export const setupDatabaseEvents = () => {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn(
      "MongoDB disconnected — Mongoose will attempt to reconnect automatically",
    );
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });
};

export const initializeDatabase = async () => {
  configureMongoose();
  setupDatabaseEvents();
  await connectDatabase();
};
