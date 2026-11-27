/**
 * Request validation middleware using Zod schemas
 * Formats errors as specified in Blueprint Section 7.1 & 13.1:
 * HTTP 422:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Validation failed",
 *     "details": [
 *       { "field": "name", "message": "Name must be between 2 and 50 characters" }
 *     ]
 *   }
 * }
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });

    // Replace request fields with cleaned/parsed fields (e.g. trimmed, lower-cased)
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (err) {
    if (err.errors) {
      const details = err.errors.map((e) => ({
        field: e.path[e.path.length - 1] || e.path.join('.'),
        message: e.message,
      }));

      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
    }

    next(err);
  }
};

export default validate;
