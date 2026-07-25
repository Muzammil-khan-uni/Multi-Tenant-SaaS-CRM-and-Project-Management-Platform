import rateLimit from "express-rate-limit";
import ApiResponse from "../utils/apiResponse.js";

export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = "Too many requests, please try again later",
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.tooManyRequests(res, message);
    },
  });
};

export const limiters = {
  global: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500, // raised from 100 — prevents legitimate retry traffic from locking users out
  }),

  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20, // raised from 10 — allows for normal multi-tab/multi-device usage
    message:
      "Too many authentication attempts, please try again after 15 minutes",
  }),

  api: createRateLimiter({
    windowMs: 1 * 60 * 1000,
    max: 120, // raised from 60
    message: "Too many API requests, please slow down",
  }),

  upload: createRateLimiter({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: "Too many upload attempts, please try again later",
  }),

  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: "Too many password reset attempts, please try again later",
  }),
};
