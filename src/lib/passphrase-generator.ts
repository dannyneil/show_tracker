import { generate } from 'random-words';

/**
 * Generate a random memorable passphrase with 4 words
 * Example: "elephant-sunset-compass-harmony"
 *
 * Uses the random-words library which provides a curated list
 * of common, memorable English words.
 */
export function generatePassphrase(): string {
  const words = generate({ exactly: 4, join: '-' });
  return words as string;
}

/**
 * Generate a passphrase with a random number suffix
 * Example: "elephant-sunset-compass-2024"
 */
export function generatePassphraseWithYear(): string {
  const currentYear = new Date().getFullYear();
  const words = generate({ exactly: 3, join: '-' });
  return `${words}-${currentYear}`;
}
