import { useEffect, useMemo, useState } from "react";

import { reportService } from "../services/report-service";
import { AuthSession } from "../types/auth";
import { OperationalReport, ReportActivityItem, ReportBreakdownItem } from "../types/report";

interface ReportsWorkspaceProps {
  session: AuthSession;
}

const metricLabels: Array<{
  key: keyof OperationalReport["metrics"];
  label: string;
  helper: string;
  tone: string;
}> = [
  {
    key: "totalPatients",
    label: "Active Patients",
    helper: "Registered care population",
    tone: "border-blue-100 bg-blue-50 text-blue-800",
  },
  {
    key: "todaysAppointments",
    label: "Today's Appointments",
    helper: "Scheduled for the current day",
    tone: "border-cyan-100 bg-cyan-50 text-cyan-800",
  },
  {
    key: "abnormalLabResults",
    label: "Abnormal Labs",
    helper: "Results requiring clinical review",
    tone: "border-rose-100 bg-rose-50 text-rose-800",
  },
  {
    key: "activeMedications",
    label: "Active Medications",
    helper: "Current prescriptions",
    tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  {
    key: "pendingLabResults",
    label: "Pending Labs",
    helper: "Ordered or in progress",
    tone: "border-amber-100 bg-amber-50 text-amber-800",
  },
  {
    key: "allergyWarnings",
    label: "Allergy Warnings",
    helper: "Medication safety flags",
    tone: "border-orange-100 bg-orange-50 text-orange-800",
  },
];

const toneClassNames: Record<ReportActivityItem["tone"], string> = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const BreakdownList = ({
  items,
  title,
}: {
  items: ReportBreakdownItem[];
  title: string;
}): JSX.Element => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{item.label.replace("_", " ")}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const ReportsWorkspace = ({ session }: ReportsWorkspaceProps): JSX.Element => {
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(
    () =>
      metricLabels.map((metric) => ({
        ...metric,
        value: report?.metrics[metric.key] ?? 0,
      })),
    [report],
  );

  const loadReport = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      setReport(await reportService.getOperational(session));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Operational reports
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Clinical workload and safety snapshot
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Generated from patient, appointment, lab result, and medication workflows.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isLoading}
          onClick={() => void loadReport()}
          type="button"
        >
          {isLoading ? "Refreshing..." : "Refresh report"}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article className="rounded-xl border border-slate-200 bg-white p-4" key={metric.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {isLoading && !report ? "-" : metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{metric.helper}</p>
              </div>
              <span className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${metric.tone}`}>
                Live
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <BreakdownList items={report?.appointmentStatusCounts ?? []} title="Appointment Status" />
        <BreakdownList items={report?.labStatusCounts ?? []} title="Lab Status" />
        <BreakdownList items={report?.medicationStatusCounts ?? []} title="Medication Status" />
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-950">Recent Activity</h3>
          <p className="mt-1 text-sm text-slate-500">
            Latest reportable patient, lab, and medication events.
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          {isLoading && !report ? (
            <p className="px-4 py-8 text-sm text-slate-500">Loading report activity...</p>
          ) : null}
          {report && report.recentActivity.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">No report activity is available yet.</p>
          ) : null}
          {report?.recentActivity.map((item) => (
            <article className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_170px_92px]" key={item.id}>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
              </div>
              <p className="text-sm text-slate-500 md:text-right">{formatDateTime(item.occurredAt)}</p>
              <div className="flex md:justify-end">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClassNames[item.tone]}`}>
                  {item.tone}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};
