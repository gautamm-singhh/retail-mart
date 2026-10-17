type CacheClearer = () => void;

const cacheClearers = new Set<CacheClearer>();

/**
 * Register a callback that clears an entity cache.
 * Returns an unregister function.
 */
export function registerCacheClearer(clearer: CacheClearer): () => void {
  cacheClearers.add(clearer);
  return () => {
    cacheClearers.delete(clearer);
  };
}

/**
 * Clear all in-memory entity caches across the application.
 * Called on logout, user switch, token expiration, and test setup.
 */
export function clearAllEntityCaches(): void {
  cacheClearers.forEach((clearer) => {
    try {
      clearer();
    } catch {
      // Ignore errors in clearers
    }
  });
}
