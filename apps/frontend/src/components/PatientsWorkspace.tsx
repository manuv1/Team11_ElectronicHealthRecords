import { FormEvent, useEffect, useMemo, useState } from "react";

import { patientService } from "../services/patient-service";
import {
  BloodType,
  CreatePatientRequest,
  Patient,
  PatientFilters,
  PatientGender,
  UpdatePatientRequest,
  bloodTypes,
  patientGenders,
} from "../types/patient";
import { AuthSession } from "../types/auth";

interface PatientsWorkspaceProps {
  session: AuthSession;
}

type PatientFormState = Omit<CreatePatientRequest, "allergies"> & {
  allergies: string;
};

const initialFilters: PatientFilters = {
  search: "",
  page: 1,
  limit: 10,
};

const initialPatientForm: PatientFormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "FEMALE",
  email: "",
  phone: "",
  address: "",
  bloodType: undefined,
  allergies: "",
};

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const parseAllergies = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toPatientForm = (patient: Patient): PatientFormState => ({
  firstName: patient.firstName,
  lastName: patient.lastName,
  dateOfBirth: patient.dateOfBirth,
  gender: patient.gender,
  email: patient.email ?? "",
  phone: patient.phone ?? "",
  address: patient.address ?? "",
  bloodType: patient.bloodType,
  allergies: patient.allergies.join(", "),
});

const buildPayload = (form: PatientFormState): CreatePatientRequest => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  dateOfBirth: form.dateOfBirth,
  gender: form.gender,
  email: form.email?.trim() || undefined,
  phone: form.phone?.trim() || undefined,
  address: form.address?.trim() || undefined,
  bloodType: form.bloodType,
  allergies: parseAllergies(form.allergies),
});

const getAge = (dateOfBirth: string): number => {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getMonth() - birthDate.getUTCMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getUTCDate())) {
    age -= 1;
  }

  return age;
};

const validatePatientForm = (form: PatientFormState): string | null => {
  if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth || !form.gender) {
    return "Complete first name, last name, date of birth, and gender.";
  }

  const birthDate = new Date(`${form.dateOfBirth}T00:00:00.000Z`);

  if (Number.isNaN(birthDate.getTime())) {
    return "Date of birth must be valid.";
  }

  if (birthDate > new Date()) {
    return "Date of birth cannot be in the future.";
  }

  if (birthDate < new Date("1900-01-01T00:00:00.000Z")) {
    return "Date of birth must be on or after 1900-01-01.";
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return "Use a valid email address.";
  }

  return null;
};

export const PatientsWorkspace = ({ session }: PatientsWorkspaceProps): JSX.Element => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filters, setFilters] = useState<PatientFilters>(initialFilters);
  const [registrationForm, setRegistrationForm] = useState<PatientFormState>(initialPatientForm);
  const [editForm, setEditForm] = useState<PatientFormState>(initialPatientForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const patientMetrics = useMemo(
    () => ({
      visible: patients.length,
      allergies: patients.filter((patient) => patient.allergies.length > 0).length,
      activeProfile: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "None",
    }),
    [patients, selectedPatient],
  );

  const loadPatients = async (nextFilters = filters): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await patientService.list(nextFilters, session);
      setPatients(result.patients);

      if (!selectedPatient && result.patients.length > 0) {
        setSelectedPatient(result.patients[0]);
        setEditForm(toPatientForm(result.patients[0]));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load patients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients(initialFilters);
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    void loadPatients(nextFilters);
  };

  const handleSelectPatient = async (patientId: string): Promise<void> => {
    setError(null);
    setSuccess(null);

    try {
      const patient = await patientService.get(patientId, session);
      setSelectedPatient(patient);
      setEditForm(toPatientForm(patient));
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Could not open patient profile.");
    }
  };

  const handleCreatePatient = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validatePatientForm(registrationForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const patient = await patientService.create(buildPayload(registrationForm), session);
      setSuccess("Patient created successfully.");
      setRegistrationForm(initialPatientForm);
      setSelectedPatient(patient);
      setEditForm(toPatientForm(patient));
      await loadPatients({ ...filters, page: 1 });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePatient = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedPatient) {
      return;
    }

    setError(null);
    setSuccess(null);

    const validationError = validatePatientForm(editForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildPayload(editForm) as UpdatePatientRequest;

    setIsSubmitting(true);

    try {
      const patient = await patientService.update(selectedPatient.id, payload, session);
      setSuccess("Patient updated.");
      setSelectedPatient(patient);
      setEditForm(toPatientForm(patient));
      await loadPatients(filters);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivatePatient = async (): Promise<void> => {
    if (!selectedPatient) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await patientService.deactivate(selectedPatient.id, session);
      setSuccess("Patient deactivated.");
      setSelectedPatient(null);
      await loadPatients(filters);
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Could not deactivate patient.");
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Visible patients</p>
            <p className="mt-2 text-2xl font-semibold">{patientMetrics.visible}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Allergy records</p>
            <p className="mt-2 text-2xl font-semibold">{patientMetrics.allergies}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Open profile</p>
            <p className="mt-2 truncate text-lg font-semibold">{patientMetrics.activeProfile}</p>
          </div>
        </div>

        <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleSearchSubmit}>
          <label className="text-sm font-medium text-slate-700" htmlFor="patient-search">
            Search patients
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              id="patient-search"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Name, MRN, or date of birth"
              value={filters.search}
            />
            <button
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              type="submit"
            >
              Search
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
            <h2 className="text-base font-semibold text-slate-950">Patient Directory</h2>
            {isLoading ? <span className="text-sm text-slate-500">Loading...</span> : null}
          </div>
          <div className="divide-y divide-slate-200">
            {patients.length === 0 && !isLoading ? (
              <p className="px-4 py-8 text-sm text-slate-500">No patients found.</p>
            ) : null}

            {patients.map((patient) => (
              <button
                className={`grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_140px_130px] ${
                  selectedPatient?.id === patient.id ? "bg-cyan-50" : "bg-white"
                }`}
                key={patient.id}
                onClick={() => void handleSelectPatient(patient.id)}
                type="button"
              >
                <span>
                  <span className="block text-base font-semibold text-slate-950">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">{patient.mrn}</span>
                </span>
                <span className="text-sm text-slate-600">
                  {patient.gender} - {getAge(patient.dateOfBirth)} yrs
                </span>
                <span className="text-sm text-slate-600">{patient.dateOfBirth}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Register Patient</h2>
          <PatientForm
            form={registrationForm}
            isSubmitting={isSubmitting}
            onChange={setRegistrationForm}
            onSubmit={handleCreatePatient}
            submitLabel="Create patient"
          />
        </section>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-6 xl:self-start">
        <h2 className="text-base font-semibold text-slate-950">Patient Profile</h2>
        {selectedPatient ? (
          <>
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-950">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="mt-1 text-sm text-slate-500">{selectedPatient.mrn}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>DOB: {selectedPatient.dateOfBirth}</p>
                <p>Blood type: {selectedPatient.bloodType ?? "Not recorded"}</p>
                <p>Allergies: {selectedPatient.allergies.join(", ") || "None recorded"}</p>
              </div>
            </div>

            <PatientForm
              form={editForm}
              isSubmitting={isSubmitting}
              onChange={setEditForm}
              onSubmit={handleUpdatePatient}
              submitLabel="Update profile"
            />

            {session.user.role === "ADMIN" ? (
              <button
                className="mt-4 w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100"
                onClick={() => void handleDeactivatePatient()}
                type="button"
              >
                Deactivate patient
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Select a patient to view demographics and clinical summary.</p>
        )}
      </aside>
    </section>
  );
};

interface PatientFormProps {
  form: PatientFormState;
  isSubmitting: boolean;
  onChange: (form: PatientFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}

const PatientForm = ({
  form,
  isSubmitting,
  onChange,
  onSubmit,
  submitLabel,
}: PatientFormProps): JSX.Element => (
  <form className="mt-4 space-y-4" onSubmit={onSubmit}>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">
        First name
        <input
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, firstName: event.target.value })}
          value={form.firstName}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Last name
        <input
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, lastName: event.target.value })}
          value={form.lastName}
        />
      </label>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">
        Date of birth
        <input
          className={fieldClassName}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(event) => onChange({ ...form, dateOfBirth: event.target.value })}
          type="date"
          value={form.dateOfBirth}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Gender
        <select
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, gender: event.target.value as PatientGender })}
          value={form.gender}
        >
          {patientGenders.map((gender) => (
            <option key={gender} value={gender}>
              {gender}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
          type="email"
          value={form.email}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Phone
        <input
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          value={form.phone}
        />
      </label>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">
        Blood type
        <select
          className={fieldClassName}
          onChange={(event) =>
            onChange({
              ...form,
              bloodType: event.target.value ? (event.target.value as BloodType) : undefined,
            })
          }
          value={form.bloodType ?? ""}
        >
          <option value="">Not recorded</option>
          {bloodTypes.map((bloodType) => (
            <option key={bloodType} value={bloodType}>
              {bloodType}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Allergies
        <input
          className={fieldClassName}
          onChange={(event) => onChange({ ...form, allergies: event.target.value })}
          placeholder="Penicillin, Aspirin"
          value={form.allergies}
        />
      </label>
    </div>

    <label className="block text-sm font-medium text-slate-700">
      Address
      <textarea
        className={`${fieldClassName} min-h-20 resize-y`}
        maxLength={500}
        onChange={(event) => onChange({ ...form, address: event.target.value })}
        value={form.address}
      />
    </label>

    <button
      className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-100"
      disabled={isSubmitting}
      type="submit"
    >
      {isSubmitting ? "Saving..." : submitLabel}
    </button>
  </form>
);
