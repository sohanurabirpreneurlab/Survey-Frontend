export const trashKeys = {
  all: ["trash"] as const,
  list: (filters: Record<string, string | number>) => ["trash", "list", filters] as const
};
