/**
 * Shared utilities for both axios and fetch adapters
 */

const ABSOLUTE_URL_REGEX = /^([a-z][a-z\d+\-.]*:)?\/\//i;

/**
 * Check if URL is absolute
 */
export function isAbsoluteURL(url: string): boolean {
  return ABSOLUTE_URL_REGEX.test(url);
}

/**
 * Combine base URL with relative URL
 */
export function combineURLs(baseURL: string, relativeURL: string): string {
  if (!relativeURL) return baseURL;
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
}

/**
 * Get status text from status code
 */
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return statusTexts[status] || 'Unknown';
}
