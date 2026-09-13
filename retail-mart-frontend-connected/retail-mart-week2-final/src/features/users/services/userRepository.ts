import {
  fetchUsers,
  createUser,
  updateUser,
  setUserStatus as apiSetUserStatus,
  deleteUser,
} from "@/services/api/users";
import type { User, UserFormValues } from "@/types";

export const userRepository = {
  list: (): Promise<User[]> => fetchUsers(),
  create: (values: UserFormValues): Promise<User> => createUser(values),
  update: (id: string, values: UserFormValues): Promise<User> => updateUser(id, values),
  setStatus: (id: string, status: User["status"]): Promise<User> =>
    apiSetUserStatus(id, status),
  remove: (id: string): Promise<void> => deleteUser(id),
};
