/* eslint-disable no-console */
/**
 * logger.js
 * Application Logger
 * Used to suppress noisy console logs in production while keeping them in development.
 */

// Toggle to true to see info/warn logs
const IS_DEV = false;

export const logger = {
  info: (...args) => {
    if (IS_DEV) console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    // We always want to log critical errors
    console.error(...args);
  },
};
/* eslint-enable no-console */
