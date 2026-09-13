import { useCallback, useEffect, useState } from "react";
import { userRepository } from "@/features/users/services/userRepository";
import type { User, UserFormValues } from "@/types";

/**
 * Feature-level hook that owns the Users list state and exposes the CRUD
 * operations UsersPage/UserDetailsPage need. Pages never import
 * userRepository directly.
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userRepository
      .list()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load users. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const addUser = useCallback(
    async (values: UserFormValues) => {
      const created = await userRepository.create(values);
      refresh();
      return created;
    },
    [refresh],
  );

  const editUser = useCallback(
    async (id: string, values: UserFormValues) => {
      const updated = await userRepository.update(id, values);
      refresh();
      return updated;
    },
    [refresh],
  );

  const setUserStatus = useCallback(
    async (id: string, status: User["status"]) => {
      const updated = await userRepository.setStatus(id, status);
      refresh();
      return updated;
    },
    [refresh],
  );

  const removeUser = useCallback(
    async (id: string) => {
      await userRepository.remove(id);
      refresh();
    },
    [refresh],
  );

  return { users, isLoading, error, refresh, addUser, editUser, setUserStatus, removeUser };
}
