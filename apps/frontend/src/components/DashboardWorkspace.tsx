import { useEffect, useMemo, useState } from "react";

import { appointmentService } from "../services/appointment-service";
import { patientService } from "../services/patient-service";
import { Appointment, AppointmentStatus } from "../types/appointment";
import { AuthSession } from "../types/auth";
import { Patient, PatientGender } from "../types/patient";

type DashboardNavigationTarget = "patients" | "appointments";

interface DashboardWorkspaceProps {
  session: AuthSession;
  onNavigate: (module: DashboardNavigationTarget) => void;
}

const emptyAppointmentFilters = {
  patientId: "",
  providerId: "",
  status: "ALL" as const,
  startDate: "",
  endDate: "",
};

const statusClassNames: Record<AppointmentStatus, string> = {
  SCHEDULED: "border-cyan-200 bg-cyan-50 text-cyan-800",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-800",
  NO_SHOW: "border-orange-200 bg-orange-50 text-orange-800",
};

const genderClassNames: Record<PatientGender, string> = {
  FEMALE: "border-pink-200 bg-pink-50 text-pink-800",
  MALE: "border-blue-200 bg-blue-50 text-blue-800",
  OTHER: "border-slate-200 bg-slate-100 text-slate-700",
};

const getTodayKey = (): string => new Date().toISOString().slice(0, 10);

const getTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getInitials = (patient: Patient): string =>
  `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase() || "PT";

const formatAppointmentTime = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatStatusLabel = (status: string): string => status.replace("_", " ");

const StatIcon = ({ name }: { name: "patients" | "today" | "pending" | "completed" }): JSX.Element => {
  const commonProps = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "patients":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M16 11a4 4 0 1 0-8 0" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    case "today":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <path d="M4 9h16" />
          <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "pending":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M12 6v6l4 2" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "completed":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M5 12h14" />
        </svg>
      );
  }
};

export const DashboardWorkspace = ({
  onNavigate,
  session,
}: DashboardWorkspaceProps): JSX.Element => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientTotal, setPatientTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardData = useMemo(() => {
    const todayKey = getTodayKey();
    const activePatients = patients.filter((patient) => patient.isActive);
    const todaysAppointments = appointments
      .filter((appointment) => appointment.dateTime.slice(0, 10) === todayKey)
      .sort((first, second) => getTimestamp(first.dateTime) - getTimestamp(second.dateTime));
    const recentPatients = [...activePatients]
      .sort((first, second) => getTimestamp(second.createdAt) - getTimestamp(first.createdAt))
      .slice(0, 5);

    return {
      metrics: {
        totalPatients: patientTotal || activePatients.length,
        todayAppointments: todaysAppointments.length,
        pendingAppointments: appointments.filter((appointment) => appointment.status === "SCHEDULED").length,
        completedToday: todaysAppointments.filter((appointment) => appointment.status === "COMPLETED").length,
      },
      recentPatients,
      todaysAppointments,
    };
  }, [appointments, patientTotal, patients]);

  const loadDashboard = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [patientResult, appointmentResult] = await Promise.all([
        patientService.list({ search: "", page: 1, limit: 100 }, session),
        appointmentService.list(emptyAppointmentFilters, session.accessToken),
      ]);

      setPatients(patientResult.patients);
      setPatientTotal(patientResult.pagination?.total ?? patientResult.patients.length);
      setAppointments(appointmentResult.appointments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const statCards = [
    {
      label: "Total Patients",
      value: dashboardData.metrics.totalPatients,
      icon: "patients" as const,
      tone: "text-blue-700 bg-blue-50 border-blue-100",
    },
    {
      label: "Today's Appointments",
      value: dashboardData.metrics.todayAppointments,
      icon: "today" as const,
      tone: "text-cyan-700 bg-cyan-50 border-cyan-100",
    },
    {
      label: "Pending Appointments",
      value: dashboardData.metrics.pendingAppointments,
      icon: "pending" as const,
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    },
    {
      label: "Completed Today",
      value: dashboardData.metrics.completedToday,
      icon: "completed" as const,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Care dashboard
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Welcome back, {session.user.firstName}.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Today's patient flow, scheduling load, and recent record activity.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
            onClick={() => onNavigate("patients")}
            type="button"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Add Patient
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
            onClick={() => onNavigate("appointments")}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M7 3v4" />
              <path d="M17 3v4" />
              <path d="M4 9h16" />
              <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
            </svg>
            Book Appointment
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article className="rounded-xl border border-slate-200 bg-white p-4" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {isLoading ? "-" : card.value}
                </p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.tone}`}>
                <StatIcon name={card.icon} />
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Recent Patients</h3>
              <p className="mt-1 text-sm text-slate-500">Five newest active records</p>
            </div>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              onClick={() => onNavigate("patients")}
              type="button"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading && dashboardData.recentPatients.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">Loading recent patients...</p>
            ) : null}

            {!isLoading && dashboardData.recentPatients.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No active patients are available yet.</p>
            ) : null}

            {dashboardData.recentPatients.map((patient) => (
              <article className="grid gap-3 px-4 py-4 sm:grid-cols-[48px_1fr_110px]" key={patient.id}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
                  {getInitials(patient)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{patient.mrn}</p>
                </div>
                <div className="flex items-center sm:justify-end">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${genderClassNames[patient.gender]}`}>
                    {patient.gender}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Today's Appointments</h3>
              <p className="mt-1 text-sm text-slate-500">Scheduled care for the current day</p>
            </div>
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              onClick={() => onNavigate("appointments")}
              type="button"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading && dashboardData.todaysAppointments.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">Loading today's appointments...</p>
            ) : null}

            {!isLoading && dashboardData.todaysAppointments.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No appointments are scheduled for today.</p>
            ) : null}

            {dashboardData.todaysAppointments.map((appointment) => (
              <article className="grid gap-3 px-4 py-4 md:grid-cols-[76px_1fr_120px]" key={appointment.id}>
                <p className="text-sm font-semibold text-slate-950">
                  {formatAppointmentTime(appointment.dateTime)}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {appointment.patientName ?? appointment.patientId}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{formatStatusLabel(appointment.type)}</p>
                </div>
                <div className="flex items-center md:justify-end">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[appointment.status]}`}>
                    {formatStatusLabel(appointment.status)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};
