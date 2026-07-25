class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
    const response = {
      success: true,
      message,
      statusCode,
    };

    if (data !== null) {
      response.data = data;
    }

    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static paginated(res, data, pagination, message = 'Success') {
    return this.success(res, data, message, 200, { pagination });
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      statusCode,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static validationError(res, errors) {
    return this.error(res, 'Validation Error', 422, errors);
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  static serverError(res, message = 'Internal Server Error') {
    return this.error(res, message, 500);
  }
}

export default ApiResponse;