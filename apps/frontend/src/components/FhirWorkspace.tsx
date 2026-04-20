import { useEffect, useMemo, useState } from "react";

import { fhirService, FhirExportScope } from "../services/fhir-service";
import { patientService } from "../services/patient-service";
import { AuthSession } from "../types/auth";
import { FhirBundle } from "../types/fhir";
import { Patient } from "../types/patient";

interface FhirWorkspaceProps {
  session: AuthSession;
}

const resourceToneClassNames: Record<string, string> = {
  Patient: "border-blue-200 bg-blue-50 text-blue-800",
  Observation: "border-cyan-200 bg-cyan-50 text-cyan-800",
  MedicationStatement: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const getResourceType = (resource: unknown): string => {
  if (resource && typeof resource === "object" && "resourceType" in resource) {
    return String((resource as { resourceType?: unknown }).resourceType ?? "Resource");
  }

  return "Resource";
};

const getResourceTitle = (resource: unknown): string => {
  if (!resource || typeof resource !== "object") {
    return "FHIR resource";
  }

  const record = resource as Record<string, unknown>;

  if (record.resourceType === "Patient") {
    const names = Array.isArray(record.name) ? record.name : [];
    const firstName = names[0] as { text?: string } | undefined;

    return firstName?.text ?? String(record.id ?? "Patient");
  }

  if (record.resourceType === "Observation") {
    const code = record.code as { text?: string } | undefined;

    return code?.text ?? String(record.id ?? "Observation");
  }

  if (record.resourceType === "MedicationStatement") {
    const medication = record.medicationCodeableConcept as { text?: string } | undefined;

    return medication?.text ?? String(record.id ?? "Medication");
  }

  return String(record.id ?? "FHIR resource");
};

export const FhirWorkspace = ({ session }: FhirWorkspaceProps): JSX.Element => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [scope, setScope] = useState<FhirExportScope>("record");
  const [bundle, setBundle] = useState<FhirBundle | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  const resourceCounts = useMemo(() => {
    const counts = new Map<string, number>();

    bundle?.entry.forEach((entry) => {
      const resourceType = getResourceType(entry.resource);
      counts.set(resourceType, (counts.get(resourceType) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
  }, [bundle]);

  const loadPatients = async (): Promise<void> => {
    setIsLoadingPatients(true);
    setError(null);

    try {
      const result = await patientService.list({ search: "", page: 1, limit: 100 }, session);
      const activePatients = result.patients.filter((patient) => patient.isActive);

      setPatients(activePatients);
      setSelectedPatientId((currentPatientId) =>
        currentPatientId && activePatients.some((patient) => patient.id === currentPatientId)
          ? currentPatientId
          : activePatients[0]?.id ?? "",
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const exportBundle = async (): Promise<void> => {
    if (!selectedPatientId) {
      setError("Select a patient before exporting FHIR resources.");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      setBundle(await fhirService.exportPatient(selectedPatientId, scope, session));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Could not export FHIR bundle.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-6 xl:self-start">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
          FHIR R4 Export
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Patient interoperability bundle
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Export a patient record as FHIR collection resources for integration review.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Patient
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              disabled={isLoadingPatients || patients.length === 0}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              value={selectedPatientId}
            >
              {patients.length === 0 ? <option value="">No active patients</option> : null}
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - {patient.mrn}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Export scope</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {[
                { id: "record", label: "Full record" },
                { id: "observations", label: "Labs only" },
              ].map((item) => (
                <button
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    scope === item.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                  key={item.id}
                  onClick={() => setScope(item.id as FhirExportScope)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isExporting || !selectedPatientId}
            onClick={() => void exportBundle()}
            type="button"
          >
            {isExporting ? "Exporting..." : "Export FHIR JSON"}
          </button>
        </div>

        {selectedPatient ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </p>
            <p className="mt-1 text-sm text-slate-500">{selectedPatient.mrn}</p>
            <p className="mt-1 text-sm text-slate-500">{selectedPatient.dateOfBirth}</p>
          </div>
        ) : null}
      </aside>

      <div className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Bundle Total</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{bundle?.total ?? 0}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Bundle Type</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{bundle?.type ?? "collection"}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Generated</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {bundle ? formatDateTime(bundle.timestamp) : "Not exported"}
            </p>
          </article>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-950">Resource Summary</h3>
            <p className="mt-1 text-sm text-slate-500">FHIR resources included in the current export.</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {resourceCounts.length === 0 ? (
              <p className="text-sm text-slate-500 sm:col-span-3">No FHIR bundle has been exported yet.</p>
            ) : null}
            {resourceCounts.map((item) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={item.label}>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-950">Bundle Resources</h3>
            <p className="mt-1 text-sm text-slate-500">Resource IDs and display names for review.</p>
          </div>
          <div className="divide-y divide-slate-200">
            {bundle?.entry.map((entry) => {
              const resourceType = getResourceType(entry.resource);

              return (
                <article className="grid gap-3 px-4 py-4 md:grid-cols-[160px_1fr]" key={entry.fullUrl}>
                  <div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      resourceToneClassNames[resourceType] ?? "border-slate-200 bg-slate-50 text-slate-700"
                    }`}>
                      {resourceType}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-950">
                      {getResourceTitle(entry.resource)}
                    </p>
                    <p className="mt-1 break-all text-sm text-slate-500">{entry.fullUrl}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-950">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-base font-semibold text-white">FHIR JSON</h3>
            <p className="mt-1 text-sm text-slate-400">Structured Bundle response from the API.</p>
          </div>
          <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-cyan-50">
            {bundle ? JSON.stringify(bundle, null, 2) : "Export a patient bundle to preview JSON."}
          </pre>
        </section>
      </div>
    </section>
  );
};
