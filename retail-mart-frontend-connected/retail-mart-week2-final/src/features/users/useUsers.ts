import { useCallback, useEffect, useState } from "react";
import { userRepository } from "@/features/users/services/userRepository";
import { registerCacheClearer } from "@/services/api/cacheManager";
import type { User, UserFormValues } from "@/types";

interface UsersMemoryCache {
  data: User[] | null;
  timestamp: number;
  inFlight: Promise<User[]> | null;
  listeners: Set<(users: User[]) => void>;
}

const usersCache: UsersMemoryCache = {
  data: null,
  timestamp: 0,
  inFlight: null,
  listeners: new Set(),
};

export function clearUsersCache(): void {
  usersCache.data = null;
  usersCache.timestamp = 0;
  usersCache.inFlight = null;
}
registerCacheClearer(clearUsersCache);

/** Stale time: 60 seconds (data is returned instantly without waiting for network) */
const STALE_TIME_MS = 60 * 1000;

function notifyListeners(users: User[]) {
  usersCache.listeners.forEach((listener) => {
    try {
      listener(users);
    } catch {
      // Ignore listener error
    }
  });
}

export async function fetchUsersDeduplicated(force = false): Promise<User[]> {
  const isFresh = usersCache.data && Date.now() - usersCache.timestamp < STALE_TIME_MS;
  if (!force && isFresh) {
    return usersCache.data!;
  }

  // Deduplicate concurrent requests (e.g. Dashboard and UsersPage mounting together)
  if (usersCache.inFlight) {
    return usersCache.inFlight;
  }

  usersCache.inFlight = userRepository
    .list()
    .then((data) => {
      usersCache.data = data;
      usersCache.timestamp = Date.now();
      notifyListeners(data);
      return data;
    })
    .finally(() => {
      usersCache.inFlight = null;
    });

  return usersCache.inFlight;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>(() => usersCache.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !usersCache.data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleUpdate = (updatedUsers: User[]) => {
      if (!cancelled) {
        setUsers(updatedUsers);
        setIsLoading(false);
      }
    };

    usersCache.listeners.add(handleUpdate);

    const hasCachedData = Boolean(usersCache.data);
    if (!hasCachedData) {
      setIsLoading(true);
    }
    setError(null);

    fetchUsersDeduplicated(false)
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
        }
      })
      .catch(() => {
        if (!cancelled && !usersCache.data) {
          setError("We couldn't load users. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      usersCache.listeners.delete(handleUpdate);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUsersDeduplicated(true);
      setUsers(data);
    } catch {
      if (!usersCache.data) {
        setError("We couldn't load users. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addUser = useCallback(
    async (values: UserFormValues) => {
      const created = await userRepository.create(values);
      if (usersCache.data) {
        const nextUsers = [...usersCache.data, created];
        usersCache.data = nextUsers;
        usersCache.timestamp = Date.now();
        notifyListeners(nextUsers);
      } else {
        refresh();
      }
      return created;
    },
    [refresh],
  );

  const editUser = useCallback(
    async (id: string, values: UserFormValues) => {
      const updated = await userRepository.update(id, values);
      if (usersCache.data) {
        const nextUsers = usersCache.data.map((u) => (u.id === id ? { ...u, ...updated } : u));
        usersCache.data = nextUsers;
        usersCache.timestamp = Date.now();
        notifyListeners(nextUsers);
      } else {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  const setUserStatus = useCallback(
    async (id: string, status: User["status"]) => {
      const updated = await userRepository.setStatus(id, status);
      if (usersCache.data) {
        const nextUsers = usersCache.data.map((u) => (u.id === id ? { ...u, ...updated } : u));
        usersCache.data = nextUsers;
        usersCache.timestamp = Date.now();
        notifyListeners(nextUsers);
      } else {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  const removeUser = useCallback(
    async (id: string) => {
      await userRepository.remove(id);
      if (usersCache.data) {
        const nextUsers = usersCache.data.filter((u) => u.id !== id);
        usersCache.data = nextUsers;
        usersCache.timestamp = Date.now();
        notifyListeners(nextUsers);
      } else {
        refresh();
      }
    },
    [refresh],
  );

  return { users, isLoading, error, refresh, addUser, editUser, setUserStatus, removeUser };
}
