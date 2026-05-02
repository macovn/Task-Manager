import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';
import slugify from 'slugify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a URL-friendly slug from a string
 */
export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'vi',
    remove: /[*+~.()'"!:@]/g
  });
}

/**
 * Strict sanitization using DOMPurify
 * Blocks all tags and attributes
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // If we are in a browser environment
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
    }).trim();
  }

  // Fallback for non-browser environments if needed (though mostly used in client)
  return input
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .trim();
}
