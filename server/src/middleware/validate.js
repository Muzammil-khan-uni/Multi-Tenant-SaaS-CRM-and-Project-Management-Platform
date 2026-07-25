import { validationResult } from "express-validator";
import ApiResponse from "../utils/apiResponse.js";

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    return ApiResponse.validationError(res, formattedErrors);
  };
};

export const commonValidations = {
  objectId: (field, message = "Invalid ID format") => {
    return (req, res, next) => {
      const value = req.params[field] || req.body[field];
      if (value && !value.match(/^[0-9a-fA-F]{24}$/)) {
        return ApiResponse.badRequest(res, message);
      }
      next();
    };
  },

  required: (field, message = `${field} is required`) => {
    return (req, res, next) => {
      if (!req.body[field]) {
        return ApiResponse.badRequest(res, message);
      }
      next();
    };
  },

  email: (field = "email") => {
    return (req, res, next) => {
      const email = req.body[field];
      if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return ApiResponse.badRequest(res, "Invalid email format");
      }
      next();
    };
  },

  passwordStrength: (field = "password") => {
    return (req, res, next) => {
      const password = req.body[field];
      if (password) {
        const errors = [];
        if (password.length < 8)
          errors.push("Password must be at least 8 characters");
        if (!/[A-Z]/.test(password))
          errors.push("Password must contain uppercase letter");
        if (!/[a-z]/.test(password))
          errors.push("Password must contain lowercase letter");
        if (!/\d/.test(password)) errors.push("Password must contain a number");
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
          errors.push("Password must contain a special character");

        if (errors.length > 0) {
          return ApiResponse.badRequest(
            res,
            "Password requirements not met",
            errors,
          );
        }
      }
      next();
    };
  },
};
