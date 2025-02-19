/**
 * @fileoverview Date and time utility functions for the Random Word Generator application
 * @version 1.0.0
 * @package dayjs ^1.11.0
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(duration);

/**
 * Formats game time in seconds to MM:SS format with proper zero-padding
 * @param seconds - Number of seconds to format
 * @returns Formatted time string in MM:SS format
 * @throws {Error} If seconds is negative or not a number
 */
export const formatGameTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    throw new Error('Invalid seconds value provided');
  }

  // Handle overflow by capping at 59:59
  const cappedSeconds = Math.min(seconds, 3599);
  
  const minutes = Math.floor(cappedSeconds / 60);
  const remainingSeconds = Math.floor(cappedSeconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param milliseconds - Duration in milliseconds
 * @returns Human readable duration string
 * @throws {Error} If milliseconds is negative or not a number
 */
export const formatDuration = (milliseconds: number): string => {
  if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
    throw new Error('Invalid milliseconds value provided');
  }

  const duration = dayjs.duration(milliseconds);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (seconds > 0 && hours === 0) { // Only show seconds if less than an hour
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.length > 0 ? parts.join(' ') : '0 seconds';
};

/**
 * Formats a date using the specified format string
 * @param date - Date to format (Date object, timestamp, or date string)
 * @param format - Format string (dayjs format)
 * @returns Formatted date string
 * @throws {Error} If date is invalid or format is not provided
 */
export const formatDate = (date: Date | string | number, format: string): string => {
  if (!format) {
    throw new Error('Format string must be provided');
  }

  const parsedDate = dayjs(date);
  
  if (!parsedDate.isValid()) {
    throw new Error('Invalid date provided');
  }

  try {
    return parsedDate.format(format);
  } catch (error) {
    throw new Error(`Error formatting date: ${error.message}`);
  }
};

/**
 * Calculates and formats relative time from now
 * @param date - Date to compare (Date object, timestamp, or date string)
 * @returns Human readable relative time string
 * @throws {Error} If date is invalid
 */
export const getRelativeTime = (date: Date | string | number): string => {
  const parsedDate = dayjs(date);
  
  if (!parsedDate.isValid()) {
    throw new Error('Invalid date provided');
  }

  const diffInSeconds = Math.abs(parsedDate.diff(dayjs(), 'second'));
  
  if (diffInSeconds < 30) {
    return 'just now';
  }

  return parsedDate.fromNow();
};

/**
 * Calculates the average of an array of time durations
 * @param durations - Array of durations in milliseconds
 * @returns Average duration in milliseconds
 * @throws {Error} If durations array is empty or contains invalid values
 */
export const calculateAverageTime = (durations: number[]): number => {
  if (!Array.isArray(durations) || durations.length === 0) {
    throw new Error('Invalid or empty durations array provided');
  }

  const validDurations = durations.filter(
    duration => typeof duration === 'number' && 
    !isNaN(duration) && 
    duration >= 0
  );

  if (validDurations.length === 0) {
    throw new Error('No valid durations found in array');
  }

  const sum = validDurations.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / validDurations.length);
};