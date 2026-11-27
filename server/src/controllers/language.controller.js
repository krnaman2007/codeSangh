import { LANGUAGES } from '../constants/languages.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/v1/languages (Endpoint #2)
 * Returns the language registry so client builds language dropdown and extension hints.
 * Access: Logged in (Blueprint Section 7.3)
 */
export const getLanguages = (req, res) => {
  return sendSuccess(res, { languages: LANGUAGES });
};
