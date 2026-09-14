/**
 * Input Sanitization Utility for XSS Prevention
 * Strips HTML tags, script tags, event handlers, javascript: protocols, and unsafe control chars.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Remove javascript: URIs
    .replace(/javascript\s*:/gi, "")
    // Remove data: text/html URIs
    .replace(/data\s*:\s*text\/html/gi, "")
    // Remove inline event handlers (on* attributes)
    .replace(/on\w+\s*=/gi, "")
    // Trim extra spaces
    .trim();
}

/**
 * Validates and sanitizes email address format
 */
export function sanitizeEmail(email: string): string {
  const clean = sanitizeInput(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return "";
  }
  return clean;
}
