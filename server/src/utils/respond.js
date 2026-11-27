/**
 * Standard success response envelope as defined in Blueprint section 7.1
 * Format: { "success": true, "data": { ... } }
 */
export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}
