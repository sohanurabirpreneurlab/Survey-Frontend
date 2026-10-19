export type TrashEntityType = "survey" | "response" | "user" | "organization";

export type TrashItem = {
  deletedAt: string;
  deletedBy: string | null;
  deletedByLabel: string | null;
  deletionMetadata: Record<string, unknown>;
  entityType: TrashEntityType;
  id: string;
  label: string;
  organizationName: string | null;
  parentLabel: string | null;
};

export type TrashList = {
  items: TrashItem[];
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
};
