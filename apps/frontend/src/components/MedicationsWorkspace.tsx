import { FormEvent, useEffect, useMemo, useState } from "react";

import { medicationService } from "../services/medication-service";
import { patientService } from "../services/patient-service";
import { AuthSession, UserRole } from "../types/auth";
import {
  Medication,
  MedicationFilters,
  MedicationFormPayload,
  MedicationStatus,
} from "../types/medication";
import { Patient } from "../types/patient";

interface MedicationsWorkspaceProps {
  session: AuthSession;
}

interface PatientOption {
  id: string;
  name: string;
  mrn: string;
  allergies: string[];
}

type MedicationFormState = MedicationFormPayload;

const prescribingRoles: UserRole[] = ["ADMIN", "DOCTOR"];
const todayDate = (): string => new Date().toISOString().slice(0, 10);

const initialFilters: MedicationFilters = {
  patientId: "",
  status: "ACTIVE",
};

const createMedicationForm = (): MedicationFormState => ({
  name: "",
  dosage: "",
  frequency: "",
  route: "Oral",
  startDate: todayDate(),
  notes: "",
});

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const statusClassNames: Record<MedicationStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DISCONTINUED: "border-slate-200 bg-slate-100 text-slate-700",
};

const medicationRoutes = ["Oral", "Topical", "Inhalation", "Injection", "Sublingual", "Other"];

const toPatientOption = (patient: Patient): PatientOption => ({
  id: patient.id,
  name: `${patient.firstName} ${patient.lastName}`.trim(),
  mrn: patient.mrn,
  allergies: patient.allergies,
});

const validateMedicationForm = (form: MedicationFormState): string | null => {
  if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim() || !form.route.trim()) {
    return "Complete medication name, dosage, frequency, and route.";
  }

  if (!form.startDate || Number.isNaN(new Date(`${form.startDate}T00:00:00.000Z`).getTime())) {
    return "Start date must be valid.";
  }

  if (form.endDate && new Date(form.startDate).getTime() > new Date(form.endDate).getTime()) {
    return "End date must be on or after the start date.";
  }

  if (form.notes && form.notes.length > 2000) {
    return "Notes must be 2000 characters or fewer.";
  }

  return null;
};

const buildMedicationPayload = (form: MedicationFormState): MedicationFormPayload => ({
  name: form.name.trim(),
  dosage: form.dosage.trim(),
  frequency: form.frequency.trim(),
  route: form.route.trim(),
  startDate: form.startDate,
  endDate: form.endDate || undefined,
  notes: form.notes?.trim() || undefined,
});

export const MedicationsWorkspace = ({ session }: MedicationsWorkspaceProps): JSX.Element => {
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [filters, setFilters] = useState<MedicationFilters>(initialFilters);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [prescriptionForm, setPrescriptionForm] = useState<MedicationFormState>(() => createMedicationForm());
  const [discontinueReasons, setDiscontinueReasons] = useState<Record<string, string>>({});
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingMedications, setIsLoadingMedications] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingMedicationId, setUpdatingMedicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canPrescribe = prescribingRoles.includes(session.user.role);
  const selectedPatient = patientOptions.find((patient) => patient.id === filters.patientId);

  const metrics = useMemo(
    () => ({
      total: medications.length,
      active: medications.filter((medication) => medication.status === "ACTIVE").length,
      warnings: medications.filter((medication) => medication.allergyWarnings.length > 0).length,
    }),
    [medications],
  );

  const loadMedications = async (nextFilters = filters): Promise<void> => {
    if (!nextFilters.patientId) {
      setMedications([]);
      return;
    }

    setIsLoadingMedications(true);
    setError(null);

    try {
      const result = await medicationService.list(nextFilters.patientId, nextFilters, session);
      setMedications(result.medications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load medications.");
    } finally {
      setIsLoadingMedications(false);
    }
  };

  const loadPatientOptions = async (): Promise<void> => {
    setIsLoadingPatients(true);
    setError(null);

    try {
      const result = await patientService.list({ search: "", page: 1, limit: 100 }, session);
      const nextPatientOptions = result.patients.filter((patient) => patient.isActive).map(toPatientOption);
      const nextPatientId = filters.patientId || nextPatientOptions[0]?.id || "";

      setPatientOptions(nextPatientOptions);
      setFilters((currentFilters) => ({
        ...currentFilters,
        patientId: nextPatientOptions.some((patient) => patient.id === nextPatientId)
          ? nextPatientId
          : nextPatientOptions[0]?.id ?? "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    void loadPatientOptions();
  }, []);

  useEffect(() => {
    void loadMedications(filters);
  }, [filters.patientId, filters.status]);

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void loadMedications(filters);
  };

  const handlePrescriptionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!filters.patientId) {
      setError("Select a patient before prescribing.");
      return;
    }

    const validationError = validateMedicationForm(prescriptionForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const medication = await medicationService.create(
        filters.patientId,
        buildMedicationPayload(prescriptionForm),
        session,
      );
      const warningSuffix = medication.allergyWarnings.length > 0 ? " Allergy warning generated." : "";

      setSuccess(`Medication prescribed.${warningSuffix}`);
      setPrescriptionForm(createMedicationForm());
      await loadMedications(filters);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not prescribe medication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscontinue = async (medication: Medication): Promise<void> => {
    setError(null);
    setSuccess(null);
    setUpdatingMedicationId(medication.id);

    try {
      await medicationService.update(
        medication.id,
        {
          status: "DISCONTINUED",
          discontinueReason: discontinueReasons[medication.id]?.trim() || undefined,
        },
        session,
      );
      setSuccess("Medication discontinued.");
      setDiscontinueReasons((currentReasons) => ({
        ...currentReasons,
        [medication.id]: "",
      }));
      await loadMedications(filters);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not discontinue medication.");
    } finally {
      setUpdatingMedicationId(null);
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Visible medications</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.active}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Allergy warnings</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.warnings}</p>
          </div>
        </div>

        <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleFilterSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700">
              Patient
              <select
                className={fieldClassName}
                disabled={isLoadingPatients || patientOptions.length === 0}
                onChange={(event) =>
                  setFilters((currentFilters) => ({ ...currentFilters, patientId: event.target.value }))
                }
                value={filters.patientId}
              >
                {patientOptions.length === 0 ? <option value="">No active patients available</option> : null}
                {patientOptions.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name || patient.mrn} - {patient.mrn}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                className={fieldClassName}
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    status: event.target.value as MedicationFilters["status"],
                  }))
                }
                value={filters.status}
              >
                <option value="ACTIVE">Active</option>
                <option value="DISCONTINUED">Discontinued</option>
                <option value="ALL">All</option>
              </select>
            </label>

            <button
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              disabled={isLoadingMedications}
              type="submit"
            >
              {isLoadingMedications ? "Refreshing..." : "Refresh"}
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
            <h2 className="text-base font-semibold text-slate-950">Medication List</h2>
            {isLoadingMedications ? <span className="text-sm text-slate-500">Loading...</span> : null}
          </div>

          <div className="divide-y divide-slate-200">
            {medications.length === 0 && !isLoadingMedications ? (
              <p className="px-4 py-8 text-sm text-slate-500">No medications match the current filters.</p>
            ) : null}

            {medications.map((medication) => (
              <article className="grid gap-4 px-4 py-4 xl:grid-cols-[1fr_240px]" key={medication.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{medication.name}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[medication.status]}`}>
                      {medication.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {medication.dosage} - {medication.frequency} - {medication.route}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Started {medication.startDate}
                    {medication.endDate ? ` - Ended ${medication.endDate}` : ""}
                    {medication.prescribedByName ? ` - Prescribed by ${medication.prescribedByName}` : ""}
                  </p>
                  {medication.notes ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">{medication.notes}</p>
                  ) : null}
                  {medication.allergyWarnings.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {medication.allergyWarnings.join(", ")}
                    </div>
                  ) : null}
                  {medication.discontinueReason ? (
                    <p className="mt-2 text-sm text-slate-500">Reason: {medication.discontinueReason}</p>
                  ) : null}
                </div>

                {canPrescribe && medication.status === "ACTIVE" ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      Discontinue reason
                      <input
                        className={fieldClassName}
                        maxLength={500}
                        onChange={(event) =>
                          setDiscontinueReasons((currentReasons) => ({
                            ...currentReasons,
                            [medication.id]: event.target.value,
                          }))
                        }
                        value={discontinueReasons[medication.id] ?? ""}
                      />
                    </label>
                    <button
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      disabled={updatingMedicationId === medication.id}
                      onClick={() => void handleDiscontinue(medication)}
                      type="button"
                    >
                      {updatingMedicationId === medication.id ? "Saving..." : "Discontinue"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-base font-semibold text-slate-950">Prescribe Medication</h2>
        {selectedPatient ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">{selectedPatient.name}</p>
            <p className="mt-1 text-sm text-slate-500">{selectedPatient.mrn}</p>
            <p className="mt-2 text-sm text-slate-600">
              Allergies: {selectedPatient.allergies.join(", ") || "None recorded"}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Select a patient to prescribe medication.</p>
        )}

        {!canPrescribe ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Nurses can view medication history, but prescribing and discontinuation are limited to doctors and admins.
          </p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handlePrescriptionSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Medication
              <input
                className={fieldClassName}
                onChange={(event) => setPrescriptionForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Medication name"
                value={prescriptionForm.name}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm font-medium text-slate-700">
                Dosage
                <input
                  className={fieldClassName}
                  onChange={(event) => setPrescriptionForm((current) => ({ ...current, dosage: event.target.value }))}
                  placeholder="10 mg"
                  value={prescriptionForm.dosage}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Frequency
                <input
                  className={fieldClassName}
                  onChange={(event) => setPrescriptionForm((current) => ({ ...current, frequency: event.target.value }))}
                  placeholder="Once daily"
                  value={prescriptionForm.frequency}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm font-medium text-slate-700">
                Route
                <select
                  className={fieldClassName}
                  onChange={(event) => setPrescriptionForm((current) => ({ ...current, route: event.target.value }))}
                  value={prescriptionForm.route}
                >
                  {medicationRoutes.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Start date
                <input
                  className={fieldClassName}
                  onChange={(event) => setPrescriptionForm((current) => ({ ...current, startDate: event.target.value }))}
                  type="date"
                  value={prescriptionForm.startDate}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                className={`${fieldClassName} min-h-24 resize-y`}
                maxLength={2000}
                onChange={(event) => setPrescriptionForm((current) => ({ ...current, notes: event.target.value }))}
                value={prescriptionForm.notes}
              />
            </label>

            <button
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              disabled={isSubmitting || !selectedPatient}
              type="submit"
            >
              {isSubmitting ? "Prescribing..." : "Prescribe medication"}
            </button>
          </form>
        )}
      </aside>
    </section>
  );
};
