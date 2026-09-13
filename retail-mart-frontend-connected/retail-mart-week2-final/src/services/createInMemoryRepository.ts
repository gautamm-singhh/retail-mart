/**
 * In-memory repository interface and fallback provider for offline test suites.
 */
export interface InMemoryRepository<T extends { id: string }> {
  list: () => T[];
  getById: (id: string) => T | undefined;
  create: (item: T) => T;
  update: (id: string, changes: Partial<T>) => T | undefined;
  remove: (id: string) => void;
}

export function createInMemoryRepository<T extends { id: string }>(
  initialData: T[],
): InMemoryRepository<T> {
  let records: T[] = [...initialData];

  return {
    list: () => records,
    getById: (id) => records.find((record) => record.id === id),
    create: (item) => {
      records = [item, ...records];
      return item;
    },
    update: (id, changes) => {
      let updated: T | undefined;
      records = records.map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...changes };
        return updated;
      });
      return updated;
    },
    remove: (id) => {
      records = records.filter((record) => record.id !== id);
    },
  };
}
