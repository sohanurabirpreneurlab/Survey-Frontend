import { apiRequest, apiRequestWithMeta } from "../../lib/api";
import type { TrashEntityType, TrashItem, TrashList } from "./trash.types";

export const listTrashRequest = async (
  token: string,
  params: { entityType: TrashEntityType | "all"; limit: number; page: number; query: string }
): Promise<TrashList> => {
  const search = new URLSearchParams({
    limit: String(params.limit),
    page: String(params.page),
    type: params.entityType
  });
  if (params.query.trim()) search.set("q", params.query.trim());
  const response = await apiRequestWithMeta<TrashItem[]>(`/admin/trash?${search.toString()}`, { token });
  return {
    items: response.data,
    pagination: response.meta.pagination as TrashList["pagination"]
  };
};

export const restoreTrashItemRequest = (token: string, entityType: TrashEntityType, id: string) =>
  apiRequest<null>(`/admin/trash/${entityType}/${id}/restore`, { method: "POST", token });

export const permanentlyDeleteTrashItemRequest = (token: string, entityType: TrashEntityType, id: string) =>
  apiRequest<null>(`/admin/trash/${entityType}/${id}`, { method: "DELETE", token });
