import ApiResponse from "../utils/apiResponse.js";
import mongoose from "mongoose";

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("ERROR 💥:", {
      message: err.message,
      statusCode,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      body: req.body,
      params: req.params,
      query: req.query,
    });
  }

  // Mongoose bad ObjectId
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `Duplicate value for '${field}': '${value}'. Please use another value.`;
    errors = { [field]: `${field} already exists` };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your token has expired. Please log in again.";
  }

  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File too large. Maximum size is 10MB.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files. Maximum is 5 files.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected file field: ${err.field}`;
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Cloudinary errors
  if (err.http_code) {
    statusCode = 400;
    message = "File upload failed. Please try again.";
  }

  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Something went wrong. Please try again later.";
  }

  return ApiResponse.error(res, message, statusCode, errors);
};

export const notFound = (req, res, next) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
