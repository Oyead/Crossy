// src/lib/utils.ts

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param fn The function to debounce.
 * @param delay The delay in milliseconds.
 * @returns A debounced version of the function.
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Format a date to a string in YYYY-MM-DD format.
 * @param date The date to format.
 * @returns Formatted date string.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Simple deep merge for plain objects.
 * @param target The target object.
 * @param source The source object to merge into target.
 * @returns The merged object.
 */
export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output as T & U;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}