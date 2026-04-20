import { FormEvent, useEffect, useMemo, useState } from "react";

import { auditLogService } from "../services/audit-log-service";
import { AuditLog, AuditLogListQuery, AuditOutcome } from "../types/audit-log";
import { AuthSession } from "../types/auth";

interface AuditLogsWorkspaceProps {
  session: AuthSession;
}

const initialFilters: AuditLogListQuery = {
  search: "",
  action: "",
  resource: "",
  outcome: "ALL",
  userId: "",
  page: 1,
  limit: 25,
};

const outcomeLabels: Record<AuditOutcome | "ALL", string> = {
  ALL: "All outcomes",
  success: "Success",
  failure: "Failure",
};

const outcomeClassNames: Record<AuditOutcome, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failure: "border-rose-200 bg-rose-50 text-rose-800",
};

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const formatTimestamp = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatMetadata = (metadata: AuditLog["metadata"]): string => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No metadata";
  }

  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
};

export const AuditLogsWorkspace = ({ session }: AuditLogsWorkspaceProps): JSX.Element => {
  const [filters, setFilters] = useState<AuditLogListQuery>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogListQuery>(initialFilters);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const failures = auditLogs.filter((log) => log.outcome === "failure").length;
    const resources = new Set(auditLogs.map((log) => log.resource));

    return {
      visible: auditLogs.length,
      failures,
      resources: resources.size,
    };
  }, [auditLogs]);

  const loadAuditLogs = async (nextFilters = appliedFilters): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auditLogService.list(nextFilters, session);
      setAuditLogs(result.auditLogs);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load audit logs.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAuditLogs(initialFilters);
  }, []);

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextFilters = { ...filters, page: 1 };

    setAppliedFilters(nextFilters);
    void loadAuditLogs(nextFilters);
  };

  const handleResetFilters = (): void => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    void loadAuditLogs(initialFilters);
  };

  const handlePageChange = (page: number): void => {
    const nextFilters = { ...appliedFilters, page };

    setAppliedFilters(nextFilters);
    setFilters(nextFilters);
    void loadAuditLogs(nextFilters);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-5 py-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Visible events</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.visible}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Failures</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.failures}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Resources touched</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.resources}</p>
        </div>
      </div>

      <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleFilterSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-medium text-slate-700">
            Search
            <input
              className={fieldClassName}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Action, resource, user"
              value={filters.search ?? ""}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Action
            <input
              className={fieldClassName}
              onChange={(event) =>
                setFilters((current) => ({ ...current, action: event.target.value }))
              }
              placeholder="patient.update"
              value={filters.action ?? ""}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Resource
            <input
              className={fieldClassName}
              onChange={(event) =>
                setFilters((current) => ({ ...current, resource: event.target.value }))
              }
              placeholder="patient"
              value={filters.resource ?? ""}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Outcome
            <select
              className={fieldClassName}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  outcome: event.target.value as AuditLogListQuery["outcome"],
                }))
              }
              value={filters.outcome ?? "ALL"}
            >
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            User ID
            <input
              className={fieldClassName}
              onChange={(event) =>
                setFilters((current) => ({ ...current, userId: event.target.value }))
              }
              placeholder="usr_admin_001"
              value={filters.userId ?? ""}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
            type="submit"
          >
            Apply filters
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
            onClick={handleResetFilters}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
            disabled={isLoading}
            onClick={() => void loadAuditLogs(appliedFilters)}
            type="button"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">Audit Trail</h2>
          <p className="text-sm text-slate-500">
            {total} total event{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && auditLogs.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={6}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : null}
              {!isLoading && auditLogs.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={6}>
                    No audit events match the current filters.
                  </td>
                </tr>
              ) : null}
              {auditLogs.map((log) => (
                <tr className="align-top" key={log.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{log.action}</td>
                  <td className="px-4 py-4 text-slate-700">{log.resource}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        outcomeClassNames[log.outcome]
                      }`}
                    >
                      {outcomeLabels[log.outcome]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{log.userId ?? "system"}</td>
                  <td className="min-w-72 px-4 py-4 text-slate-600">
                    {formatMetadata(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {appliedFilters.page} of {Math.max(totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={appliedFilters.page <= 1 || isLoading}
              onClick={() => handlePageChange(appliedFilters.page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={appliedFilters.page >= totalPages || isLoading}
              onClick={() => handlePageChange(appliedFilters.page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
