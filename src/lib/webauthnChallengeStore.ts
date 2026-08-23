// This is a simple in-memory challenge store for demonstration purposes.
// In production, you would use a secure, persistent store like a database or session store.
export const challengeStore = new Map<string, { challenge: string, expires: number }>();

// Clean up expired challenges periodically (every hour)
setInterval(() => {
  const now = Date.now();
  challengeStore.forEach((value, key) => {
    if (value.expires < now) {
      challengeStore.delete(key);
    }
  });
}, 60 * 60 * 1000);