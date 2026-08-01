import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Card } from "../components/ui/card";
import { useAuth } from "../features/auth/use-auth";
import { listAuditLogsRequest } from "../features/admin/admin.api";
import { adminKeys } from "../features/admin/admin.keys";
import { formatDateTime } from "../features/surveys/surveys.utils";
import { adminTw, pageTw } from "../lib/page-tailwind";

export const AuditLogsPage = () => {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get("action") ?? "";
  const targetType = searchParams.get("targetType") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const logsQuery = useQuery({
    enabled: Boolean(token),
    queryFn: () => listAuditLogsRequest(token, { action: action || undefined, limit: 20, page, targetType: targetType || undefined }),
    queryKey: adminKeys.auditLogs({ action, page, targetType })
  });

  return (
    <div className={pageTw.page}>
      <section className={pageTw.hero}>
        <div>
          <h1>Audit Logs</h1>
          <p>Immutable records of admin operations.</p>
        </div>
      </section>
      <Card className={adminTw.filterCard}>
        <div className={adminTw.filterGrid}>
          <label className={adminTw.selectField}>
            <span className={adminTw.fieldLabel}>Action</span>
            <select className={adminTw.select} onChange={(event) => setSearchParams({ action: event.target.value, page: "1", targetType })} value={action}>
              <option value="">All</option>
              <option value="USER_APPROVED">USER_APPROVED</option>
              <option value="USER_REJECTED">USER_REJECTED</option>
              <option value="USER_SUSPENDED">USER_SUSPENDED</option>
              <option value="USER_REACTIVATED">USER_REACTIVATED</option>
              <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
              <option value="MEMBERSHIP_CREATED">MEMBERSHIP_CREATED</option>
            </select>
          </label>
          <label className={adminTw.selectField}>
            <span className={adminTw.fieldLabel}>Target type</span>
            <select className={adminTw.select} onChange={(event) => setSearchParams({ action, page: "1", targetType: event.target.value })} value={targetType}>
              <option value="">All</option>
              <option value="user">User</option>
              <option value="organization">Organization</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className={pageTw.surfaceCard}>
        {logsQuery.data?.items.map((log) => (
          <div className={adminTw.listRow} key={log.id}>
            <div>
              <strong>{log.action}</strong>
              <p>
                {log.actorName ?? "System"} • {log.targetType} • {log.targetLabel ?? log.targetId ?? "n/a"}
              </p>
            </div>
            <span>{formatDateTime(log.createdAt) ?? log.createdAt}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};
