// Centralized date formatting utilities

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format a date/timestamp to European format (DD.MM.YYYY)
 */
export function formatDate(date: Date | number | string): string {
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format a date/timestamp with short weekday (Mon DD.MM.YYYY)
 */
export function formatDateWithWeekday(date: Date | number | string): string {
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${weekday} ${day}.${month}`;
}

/**
 * Format a date/timestamp with full weekday (Monday DD.MM.YYYY)
 */
export function formatDateWithFullWeekday(date: Date | number | string): string {
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const weekday = WEEKDAYS_FULL[d.getDay()];
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${weekday} ${day}.${month}.${year}`;
}

/**
 * Format a date/timestamp to European format with time (DD.MM.YYYY HH:MM)
 */
export function formatDateTime(date: Date | number | string): string {
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const dateStr = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}
