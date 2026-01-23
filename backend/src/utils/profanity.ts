// Lazy load bad-words to avoid ES module compatibility issues
let filterInstance: any = null;

async function getFilter() {
  if (!filterInstance) {
    // Dynamic import to avoid ES module issues at startup
    const badWordsModule = await import('bad-words');
    const Filter = (badWordsModule as any).default || badWordsModule;
    filterInstance = new (Filter as any)();
  }
  return filterInstance;
}

export async function validateUsername(username: string): Promise<{ valid: boolean; error?: string }> {
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

  // Check for profanity (lazy loaded)
  try {
    const filter = await getFilter();
    if (filter.isProfane(username)) {
      return { valid: false, error: 'Username contains inappropriate content' };
    }
  } catch (err) {
    // If bad-words fails to load, skip profanity check but log the error
    console.error('Failed to load profanity filter:', err);
    // Continue without profanity check rather than blocking the request
  }

  return { valid: true };
}
