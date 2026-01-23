// @ts-ignore - bad-words has incorrect type definitions
import Filter from 'bad-words';

const filter = new (Filter as any)();

export function validateUsername(username: string): { valid: boolean; error?: string } {
  // Check length
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username must be no more than 20 characters long' };
  }

  // Check for valid characters (alphanumeric, underscores, hyphens)
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check for profanity
  if (filter.isProfane(username)) {
    return { valid: false, error: 'Username contains inappropriate content' };
  }

  return { valid: true };
}
