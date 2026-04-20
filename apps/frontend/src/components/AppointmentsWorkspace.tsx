import { FormEvent, useEffect, useMemo, useState } from "react";

import { appointmentService } from "../services/appointment-service";
import { PatientsWorkspace } from "./PatientsWorkspace";
import { userAdminService } from "../services/user-admin-service";
import {
  Appointment,
  AppointmentBookingPayload,
  AppointmentFilters,
  AppointmentStatus,
  appointmentStatuses,
  appointmentTypes,
} from "../types/appointment";
import { AuthSession, AuthUser, UserRole, userRoles } from "../types/auth";

interface AppointmentsWorkspaceProps {
  session: AuthSession;
  onLogout: () => void;
}

const patientOptions = [
  { id: "pat_001", name: "Ava Sharma", mrn: "MRN-20260420-0001" },
  { id: "pat_002", name: "Noah Patel", mrn: "MRN-20260420-0002" },
];

const providerOptions = [
  { id: "prov_001", name: "Dr. Meera Rao" },
  { id: "prov_002", name: "Dr. James Smith" },
  { id: "prov_003", name: "Nurse Priya Menon" },
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  STAFF: "Staff",
};

const roleClassNames: Record<UserRole, string> = {
  ADMIN: "border-violet-200 bg-violet-50 text-violet-800",
  DOCTOR: "border-cyan-200 bg-cyan-50 text-cyan-800",
  NURSE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  STAFF: "border-slate-200 bg-slate-100 text-slate-700",
};

type NavigationIconName =
  | "dashboard"
  | "patients"
  | "appointments"
  | "labs"
  | "medications"
  | "reports"
  | "fhir"
  | "audit"
  | "users"
  | "settings";

type ActiveModule = "appointments" | "patients" | "users";

interface NavigationItem {
  id: string;
  label: string;
  status: "Active" | "Next";
  icon: NavigationIconName;
  roles?: UserRole[];
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    title: "Care Operations",
    items: [
      { id: "dashboard", label: "Dashboard", status: "Next", icon: "dashboard" },
      { id: "patients", label: "Patients", status: "Next", icon: "patients" },
      { id: "appointments", label: "Appointments", status: "Active", icon: "appointments" },
    ],
  },
  {
    title: "Clinical Workflows",
    items: [
      { id: "labs", label: "Lab Results", status: "Next", icon: "labs" },
      { id: "medications", label: "Medications", status: "Next", icon: "medications" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { id: "reports", label: "Reports", status: "Next", icon: "reports" },
      { id: "fhir", label: "FHIR Export", status: "Next", icon: "fhir" },
      { id: "audit", label: "Audit Logs", status: "Next", icon: "audit", roles: ["ADMIN"] },
      { id: "users", label: "User Admin", status: "Next", icon: "users", roles: ["ADMIN"] },
      { id: "settings", label: "Settings", status: "Next", icon: "settings" },
    ],
  },
];

const moduleHeaders: Record<ActiveModule, { title: string; description: string }> = {
  appointments: {
    title: "Appointments",
    description: "Scheduling, conflict checks, status updates, and cancellation workflow.",
  },
  patients: {
    title: "Patients",
    description: "Registration, search, profile view, updates, and allergy tracking.",
  },
  users: {
    title: "User Admin",
    description: "Assign roles to registered users from the available account list.",
  },
};

const initialFilters: AppointmentFilters = {
  patientId: "",
  providerId: "",
  status: "ALL",
  startDate: "",
  endDate: "",
};

const nextBusinessDayAt = (hour: number, minute = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);

  return date.toISOString().slice(0, 16);
};

const initialBookingForm: AppointmentBookingPayload = {
  patientId: patientOptions[0].id,
  providerId: providerOptions[0].id,
  dateTime: nextBusinessDayAt(9),
  duration: 30,
  type: "CHECKUP",
  notes: "",
};

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const isNavigationItemVisible = (item: NavigationItem, role: UserRole): boolean =>
  !item.roles || item.roles.includes(role);

const NavigationIcon = ({ name }: { name: NavigationIconName }): JSX.Element => {
  const commonProps = {
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M4 13h6V4H4v9Z" />
          <path d="M14 20h6v-9h-6v9Z" />
          <path d="M4 20h6v-3H4v3Z" />
          <path d="M14 7h6V4h-6v3Z" />
        </svg>
      );
    case "patients":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M16 11a4 4 0 1 0-8 0" />
          <path d="M5 21a7 7 0 0 1 14 0" />
          <path d="M19 8v4" />
          <path d="M21 10h-4" />
        </svg>
      );
    case "appointments":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <path d="M4 9h16" />
          <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
          <path d="m8 15 2 2 5-5" />
        </svg>
      );
    case "labs":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M9 3h6" />
          <path d="M10 3v5l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3" />
          <path d="M8 15h8" />
        </svg>
      );
    case "medications":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="m10 21 11-11a4 4 0 0 0-6-6L4 15a4 4 0 0 0 6 6Z" />
          <path d="m8 11 5 5" />
        </svg>
      );
    case "reports":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M6 20V4h9l3 3v13H6Z" />
          <path d="M14 4v4h4" />
          <path d="M9 14h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case "fhir":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
          <path d="M7 16h10" />
          <path d="M8 4c-4 4-4 12 0 16" />
          <path d="M16 4c4 4 4 12 0 16" />
        </svg>
      );
    case "audit":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
    case "users":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M3 21a6 6 0 0 1 12 0" />
          <path d="M17 8a3 3 0 0 1 0 6" />
          <path d="M18 21a5 5 0 0 0-3-4" />
        </svg>
      );
    case "settings":
      return (
        <svg aria-hidden="true" {...commonProps}>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3a7 7 0 0 0-1.7 1L5 6 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-1a7 7 0 0 0 1.7 1l.4 3h5l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.5L18.9 13a7 7 0 0 0 .1-1Z" />
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

const formatAppointmentDate = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const statusClassNames: Record<AppointmentStatus, string> = {
  SCHEDULED: "border-cyan-200 bg-cyan-50 text-cyan-800",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-800",
  NO_SHOW: "border-orange-200 bg-orange-50 text-orange-800",
};

const validateBookingForm = (form: AppointmentBookingPayload): string | null => {
  if (!form.patientId || !form.providerId || !form.dateTime || !form.type) {
    return "Complete the required appointment fields.";
  }

  const duration = Number(form.duration ?? 30);

  if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
    return "Duration must be between 15 and 240 minutes.";
  }

  if (new Date(form.dateTime).getTime() <= Date.now()) {
    return "Cannot book appointments in the past.";
  }

  if (form.notes && form.notes.length > 2000) {
    return "Notes must be 2000 characters or fewer.";
  }

  return null;
};

export const AppointmentsWorkspace = ({
  session,
  onLogout,
}: AppointmentsWorkspaceProps): JSX.Element => {
  const [activeModule, setActiveModule] = useState<ActiveModule>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [bookingForm, setBookingForm] = useState<AppointmentBookingPayload>(initialBookingForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedRolesByUserId, setSelectedRolesByUserId] = useState<Record<string, UserRole>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userAdminError, setUserAdminError] = useState<string | null>(null);
  const [userAdminSuccess, setUserAdminSuccess] = useState<string | null>(null);

  const appointmentMetrics = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    return {
      total: appointments.length,
      today: appointments.filter((appointment) => appointment.dateTime.slice(0, 10) === todayKey).length,
      scheduled: appointments.filter((appointment) => appointment.status === "SCHEDULED").length,
      completed: appointments.filter((appointment) => appointment.status === "COMPLETED").length,
    };
  }, [appointments]);

  const loadAppointments = async (nextFilters = filters): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await appointmentService.list(nextFilters, session.accessToken);
      setAppointments(result.appointments);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load appointments.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (): Promise<void> => {
    if (session.user.role !== "ADMIN") {
      return;
    }

    setIsLoadingUsers(true);
    setUserAdminError(null);

    try {
      const nextUsers = await userAdminService.list(session.accessToken);
      setUsers(nextUsers);
      setSelectedRolesByUserId(
        nextUsers.reduce<Record<string, UserRole>>((nextRoles, user) => {
          nextRoles[user.id] = user.role;

          return nextRoles;
        }, {}),
      );
    } catch (loadError) {
      setUserAdminError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load available users.",
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadAppointments(initialFilters);
  }, []);

  useEffect(() => {
    if (activeModule === "users") {
      void loadUsers();
    }
  }, [activeModule]);

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void loadAppointments(filters);
  };

  const handleResetFilters = (): void => {
    setFilters(initialFilters);
    void loadAppointments(initialFilters);
  };

  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateBookingForm(bookingForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await appointmentService.create(
        {
          ...bookingForm,
          duration: Number(bookingForm.duration ?? 30),
          notes: bookingForm.notes?.trim() || undefined,
        },
        session.accessToken,
      );
      setSuccess("Appointment booked.");
      setBookingForm(initialBookingForm);
      await loadAppointments(filters);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not book the appointment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    appointmentId: string,
    status: AppointmentStatus,
  ): Promise<void> => {
    setError(null);
    setSuccess(null);

    try {
      await appointmentService.updateStatus(appointmentId, { status }, session.accessToken);
      setSuccess("Appointment status updated.");
      await loadAppointments(filters);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Could not update appointment status.",
      );
    }
  };

  const handleCancel = async (appointmentId: string): Promise<void> => {
    setError(null);
    setSuccess(null);

    try {
      await appointmentService.cancel(appointmentId, session.accessToken);
      setSuccess("Appointment cancelled.");
      await loadAppointments(filters);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel appointment.",
      );
    }
  };

  const handleRoleAssignment = async (user: AuthUser): Promise<void> => {
    const nextRole = selectedRolesByUserId[user.id];

    if (!nextRole || nextRole === user.role) {
      return;
    }

    setUpdatingUserId(user.id);
    setUserAdminError(null);
    setUserAdminSuccess(null);

    try {
      const updatedUser = await userAdminService.assignRole(
        user.id,
        { role: nextRole },
        session.accessToken,
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser,
        ),
      );
      setSelectedRolesByUserId((currentRoles) => ({
        ...currentRoles,
        [updatedUser.id]: updatedUser.role,
      }));
      setUserAdminSuccess(`${updatedUser.firstName} ${updatedUser.lastName} is now ${roleLabels[updatedUser.role]}.`);
    } catch (roleError) {
      setUserAdminError(
        roleError instanceof Error
          ? roleError.message
          : "Could not update the user role.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-5 px-4 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                MedRecord EHR
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {session.user.firstName} {session.user.lastName}
              </p>
            </div>

            <nav aria-label="EHR modules" className="space-y-5">
              {navigationSections.map((section) => {
                const visibleItems = section.items.filter((item) =>
                  isNavigationItemVisible(item, session.user.role),
                );

                if (visibleItems.length === 0) {
                  return null;
                }

                return (
                  <div key={section.title}>
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {section.title}
                    </p>
                    <div className="mt-2 grid gap-1">
                      {visibleItems.map((item) => {
                        const isActive = item.id === activeModule;
                        const isEnabled = item.id === "appointments" || item.id === "patients" || item.id === "users";

                        return (
                          <button
                            aria-current={isActive ? "page" : undefined}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-cyan-100 ${
                              isActive
                                ? "bg-slate-950 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                            disabled={!isEnabled}
                            key={item.id}
                            onClick={() => {
                              if (isEnabled) {
                                setActiveModule(item.id as ActiveModule);
                              }
                            }}
                            title={item.label}
                            type="button"
                          >
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                isActive ? "bg-white/10 text-cyan-200" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <NavigationIcon name={item.icon} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isActive
                                  ? "bg-cyan-300 text-slate-950"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isActive ? "Active" : item.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Signed in role</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{session.user.role}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-950 md:text-3xl">
                  {moduleHeaders[activeModule].title}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {moduleHeaders[activeModule].description}
                </p>
              </div>
              <button
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                onClick={onLogout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </header>

          {activeModule === "patients" ? (
            <PatientsWorkspace session={session} />
          ) : activeModule === "appointments" ? (
          <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Visible appointments</p>
              <p className="mt-2 text-2xl font-semibold">{appointmentMetrics.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Today</p>
              <p className="mt-2 text-2xl font-semibold">{appointmentMetrics.today}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Scheduled</p>
              <p className="mt-2 text-2xl font-semibold">{appointmentMetrics.scheduled}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-2 text-2xl font-semibold">{appointmentMetrics.completed}</p>
            </div>
          </div>

          <form
            className="rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={handleFilterSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-sm font-medium text-slate-700">
                Patient
                <select
                  className={fieldClassName}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, patientId: event.target.value }))
                  }
                  value={filters.patientId}
                >
                  <option value="">All patients</option>
                  {patientOptions.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Provider
                <select
                  className={fieldClassName}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, providerId: event.target.value }))
                  }
                  value={filters.providerId}
                >
                  <option value="">All providers</option>
                  {providerOptions.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  className={fieldClassName}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as AppointmentFilters["status"],
                    }))
                  }
                  value={filters.status}
                >
                  <option value="ALL">All statuses</option>
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                From
                <input
                  className={fieldClassName}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, startDate: event.target.value }))
                  }
                  type="date"
                  value={filters.startDate}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                To
                <input
                  className={fieldClassName}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, endDate: event.target.value }))
                  }
                  type="date"
                  value={filters.endDate}
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
            </div>
          </form>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-950">Schedule</h2>
              {isLoading ? <span className="text-sm text-slate-500">Loading...</span> : null}
            </div>

            <div className="divide-y divide-slate-200">
              {appointments.length === 0 && !isLoading ? (
                <p className="px-4 py-8 text-sm text-slate-500">No appointments match the current filters.</p>
              ) : null}

              {appointments.map((appointment) => (
                <article
                  className="grid gap-4 px-4 py-4 xl:grid-cols-[180px_1fr_220px]"
                  key={appointment.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatAppointmentDate(appointment.dateTime)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.duration} min - {appointment.type.replace("_", " ")}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">
                        {appointment.patientName ?? appointment.patientId}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          statusClassNames[appointment.status]
                        }`}
                      >
                        {appointment.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {appointment.providerName ?? appointment.providerId}
                    </p>
                    {appointment.notes ? (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        {appointment.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                    <label className="sr-only" htmlFor={`status-${appointment.id}`}>
                      Update status
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                      disabled={appointment.status === "CANCELLED" || appointment.status === "COMPLETED"}
                      id={`status-${appointment.id}`}
                      onChange={(event) =>
                        void handleStatusChange(appointment.id, event.target.value as AppointmentStatus)
                      }
                      value={appointment.status}
                    >
                      {appointmentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      disabled={!["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(appointment.status)}
                      onClick={() => void handleCancel(appointment.id)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-base font-semibold text-slate-950">Book Appointment</h2>
          <form className="mt-4 space-y-4" onSubmit={handleBookingSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Patient
              <select
                className={fieldClassName}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, patientId: event.target.value }))
                }
                value={bookingForm.patientId}
              >
                {patientOptions.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - {patient.mrn}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Provider
              <select
                className={fieldClassName}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, providerId: event.target.value }))
                }
                value={bookingForm.providerId}
              >
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Date and time
              <input
                className={fieldClassName}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, dateTime: event.target.value }))
                }
                type="datetime-local"
                value={bookingForm.dateTime}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Duration
                <input
                  className={fieldClassName}
                  max={240}
                  min={15}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      duration: Number(event.target.value),
                    }))
                  }
                  step={15}
                  type="number"
                  value={bookingForm.duration}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Type
                <select
                  className={fieldClassName}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      type: event.target.value as AppointmentBookingPayload["type"],
                    }))
                  }
                  value={bookingForm.type}
                >
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                className={`${fieldClassName} min-h-24 resize-y`}
                maxLength={2000}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Reason for visit"
                value={bookingForm.notes}
              />
            </label>

            <button
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Booking..." : "Book appointment"}
            </button>
          </form>
        </aside>
          </section>
          ) : (
            <section className="mx-auto max-w-7xl px-5 py-6">
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Available Users</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Review registered accounts and assign the role they should use at login.
                    </p>
                  </div>
                  <button
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                    disabled={isLoadingUsers}
                    onClick={() => void loadUsers()}
                    type="button"
                  >
                    {isLoadingUsers ? "Refreshing..." : "Refresh users"}
                  </button>
                </div>

                {userAdminError ? (
                  <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {userAdminError}
                  </div>
                ) : null}

                {userAdminSuccess ? (
                  <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {userAdminSuccess}
                  </div>
                ) : null}

                <div className="divide-y divide-slate-200">
                  {users.length === 0 && !isLoadingUsers ? (
                    <p className="px-4 py-8 text-sm text-slate-500">
                      No users are available for role assignment yet.
                    </p>
                  ) : null}

                  {isLoadingUsers && users.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-slate-500">Loading available users...</p>
                  ) : null}

                  {users.map((user) => {
                    const selectedRole = selectedRolesByUserId[user.id] ?? user.role;
                    const isSelf = user.id === session.user.id;
                    const hasRoleChanged = selectedRole !== user.role;

                    return (
                      <article
                        className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_220px_120px]"
                        key={user.id}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">
                              {user.firstName} {user.lastName}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                roleClassNames[user.role]
                              }`}
                            >
                              {roleLabels[user.role]}
                            </span>
                            {isSelf ? (
                              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                                You
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 break-all text-sm text-slate-600">{user.email}</p>
                        </div>

                        <label className="text-sm font-medium text-slate-700">
                          Assign role
                          <select
                            className={fieldClassName}
                            onChange={(event) =>
                              setSelectedRolesByUserId((currentRoles) => ({
                                ...currentRoles,
                                [user.id]: event.target.value as UserRole,
                              }))
                            }
                            value={selectedRole}
                          >
                            {userRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex items-end">
                          <button
                            className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                            disabled={!hasRoleChanged || updatingUserId === user.id}
                            onClick={() => void handleRoleAssignment(user)}
                            type="button"
                          >
                            {updatingUserId === user.id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
