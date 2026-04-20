import { FormEvent, useEffect, useMemo, useState } from "react";

import { labResultService } from "../services/lab-result-service";
import { patientService } from "../services/patient-service";
import { AuthSession, UserRole } from "../types/auth";
import {
  LabOrderFormPayload,
  LabResult,
  LabResultEntryPayload,
  LabResultFilters,
  LabResultStatus,
  labResultStatuses,
} from "../types/lab-result";
import { Patient } from "../types/patient";

interface LabResultsWorkspaceProps {
  session: AuthSession;
}

interface PatientOption {
  id: string;
  name: string;
  mrn: string;
}

type LabOrderFormState = LabOrderFormPayload;
type ResultEntryState = Required<Pick<LabResultEntryPayload, "result" | "unit" | "normalRange">> &
  Pick<LabResultEntryPayload, "isAbnormal" | "status" | "notes">;

const orderingRoles: UserRole[] = ["ADMIN", "DOCTOR"];
const resultEntryRoles: UserRole[] = ["ADMIN", "DOCTOR", "NURSE"];

const initialFilters: LabResultFilters = {
  patientId: "",
  status: "ALL",
  abnormal: "ALL",
};

const commonLabOrders = [
  { testName: "Complete Blood Count", testCode: "57021-8" },
  { testName: "Basic Metabolic Panel", testCode: "51990-0" },
  { testName: "Lipid Panel", testCode: "57698-3" },
  { testName: "Hemoglobin A1c", testCode: "4548-4" },
  { testName: "Thyroid Stimulating Hormone", testCode: "3016-3" },
];

const createLabOrderForm = (): LabOrderFormState => ({
  testName: commonLabOrders[0].testName,
  testCode: commonLabOrders[0].testCode,
  notes: "",
});

const createResultEntryState = (labResult?: LabResult): ResultEntryState => ({
  result: labResult?.result ?? "",
  unit: labResult?.unit ?? "",
  normalRange: labResult?.normalRange ?? "",
  isAbnormal: labResult?.isAbnormal ?? false,
  status: labResult?.status ?? "COMPLETED",
  notes: labResult?.notes ?? "",
});

const fieldClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const statusClassNames: Record<LabResultStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const toPatientOption = (patient: Patient): PatientOption => ({
  id: patient.id,
  name: `${patient.firstName} ${patient.lastName}`.trim(),
  mrn: patient.mrn,
});

const validateOrderForm = (form: LabOrderFormState): string | null => {
  if (!form.testName.trim() || !form.testCode.trim()) {
    return "Select or enter both a test name and a LOINC-style test code.";
  }

  if (!/^[A-Za-z0-9.-]+$/.test(form.testCode.trim())) {
    return "Test code must use a LOINC-style format.";
  }

  if (form.notes && form.notes.length > 2000) {
    return "Notes must be 2000 characters or fewer.";
  }

  return null;
};

const validateResultEntry = (form: ResultEntryState): string | null => {
  if (!form.status) {
    return "Choose a result status.";
  }

  if (form.status === "COMPLETED" && !form.result.trim()) {
    return "Completed lab results need a result value.";
  }

  if (form.result.length > 120) {
    return "Result must be 120 characters or fewer.";
  }

  if (form.unit.length > 40) {
    return "Unit must be 40 characters or fewer.";
  }

  if (form.normalRange.length > 80) {
    return "Normal range must be 80 characters or fewer.";
  }

  if (form.notes && form.notes.length > 2000) {
    return "Notes must be 2000 characters or fewer.";
  }

  return null;
};

const buildOrderPayload = (form: LabOrderFormState): LabOrderFormPayload => ({
  testName: form.testName.trim(),
  testCode: form.testCode.trim(),
  notes: form.notes?.trim() || undefined,
});

const buildResultPayload = (form: ResultEntryState): LabResultEntryPayload => ({
  result: form.result.trim() || undefined,
  unit: form.unit.trim() || undefined,
  normalRange: form.normalRange.trim() || undefined,
  isAbnormal: form.isAbnormal,
  status: form.status,
  notes: form.notes?.trim() || undefined,
});

export const LabResultsWorkspace = ({ session }: LabResultsWorkspaceProps): JSX.Element => {
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [filters, setFilters] = useState<LabResultFilters>(initialFilters);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [orderForm, setOrderForm] = useState<LabOrderFormState>(() => createLabOrderForm());
  const [selectedLabResultId, setSelectedLabResultId] = useState("");
  const [resultEntry, setResultEntry] = useState<ResultEntryState>(() => createResultEntryState());
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingLabResults, setIsLoadingLabResults] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canOrderLabs = orderingRoles.includes(session.user.role);
  const canEnterResults = resultEntryRoles.includes(session.user.role);
  const selectedPatient = patientOptions.find((patient) => patient.id === filters.patientId);
  const selectedLabResult = labResults.find((labResult) => labResult.id === selectedLabResultId);

  const metrics = useMemo(
    () => ({
      total: labResults.length,
      pending: labResults.filter((labResult) => labResult.status !== "COMPLETED").length,
      abnormal: labResults.filter((labResult) => labResult.isAbnormal).length,
    }),
    [labResults],
  );

  const loadLabResults = async (nextFilters = filters): Promise<void> => {
    if (!nextFilters.patientId) {
      setLabResults([]);
      setSelectedLabResultId("");
      return;
    }

    setIsLoadingLabResults(true);
    setError(null);

    try {
      const result = await labResultService.list(nextFilters.patientId, nextFilters, session);
      setLabResults(result.labResults);
      const nextSelectedId = result.labResults.some((labResult) => labResult.id === selectedLabResultId)
        ? selectedLabResultId
        : result.labResults[0]?.id ?? "";
      setSelectedLabResultId(nextSelectedId);
      setResultEntry(createResultEntryState(result.labResults.find((labResult) => labResult.id === nextSelectedId)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load lab results.");
    } finally {
      setIsLoadingLabResults(false);
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
    void loadLabResults(filters);
  }, [filters.patientId, filters.status, filters.abnormal]);

  const handleOrderSelect = (testName: string): void => {
    const selectedOrder = commonLabOrders.find((order) => order.testName === testName);

    setOrderForm((current) => ({
      ...current,
      testName,
      testCode: selectedOrder?.testCode ?? current.testCode,
    }));
  };

  const handleLabSelection = (labResultId: string): void => {
    const nextLabResult = labResults.find((labResult) => labResult.id === labResultId);

    setSelectedLabResultId(labResultId);
    setResultEntry(createResultEntryState(nextLabResult));
  };

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void loadLabResults(filters);
  };

  const handleOrderSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!filters.patientId) {
      setError("Select a patient before ordering a lab test.");
      return;
    }

    const validationError = validateOrderForm(orderForm);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsOrdering(true);

    try {
      await labResultService.create(filters.patientId, buildOrderPayload(orderForm), session);
      setSuccess("Lab test ordered.");
      setOrderForm(createLabOrderForm());
      await loadLabResults(filters);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not order the lab test.");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleResultSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedLabResult) {
      setError("Select a lab result before entering results.");
      return;
    }

    const validationError = validateResultEntry(resultEntry);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUpdating(true);

    try {
      await labResultService.update(selectedLabResult.id, buildResultPayload(resultEntry), session);
      setSuccess("Lab result updated.");
      await loadLabResults(filters);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the lab result.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Visible labs</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Open orders</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.pending}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Abnormal</p>
            <p className="mt-2 text-2xl font-semibold">{metrics.abnormal}</p>
          </div>
        </div>

        <form className="rounded-xl border border-slate-200 bg-white p-4" onSubmit={handleFilterSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_190px_170px_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700" htmlFor="lab-patient-filter">
              Patient
              <select
                className={fieldClassName}
                disabled={isLoadingPatients || patientOptions.length === 0}
                id="lab-patient-filter"
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

            <label className="text-sm font-medium text-slate-700" htmlFor="lab-status-filter">
              Status
              <select
                className={fieldClassName}
                id="lab-status-filter"
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    status: event.target.value as LabResultFilters["status"],
                  }))
                }
                value={filters.status}
              >
                <option value="ALL">All statuses</option>
                {labResultStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700" htmlFor="lab-abnormal-filter">
              Abnormal
              <select
                className={fieldClassName}
                id="lab-abnormal-filter"
                onChange={(event) =>
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    abnormal: event.target.value as LabResultFilters["abnormal"],
                  }))
                }
                value={filters.abnormal}
              >
                <option value="ALL">All results</option>
                <option value="true">Abnormal only</option>
                <option value="false">Normal only</option>
              </select>
            </label>

            <button
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              disabled={isLoadingLabResults}
              type="submit"
            >
              {isLoadingLabResults ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </form>

        {error ? (
          <div aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">Lab History</h2>
            {isLoadingLabResults ? <span className="text-sm text-slate-500">Loading...</span> : null}
          </div>

          <div className="divide-y divide-slate-200">
            {labResults.length === 0 && !isLoadingLabResults ? (
              <p className="px-4 py-8 text-sm text-slate-500">No lab results match the current filters.</p>
            ) : null}

            {labResults.map((labResult) => (
              <article className="grid gap-4 px-4 py-4 xl:grid-cols-[1fr_180px]" key={labResult.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{labResult.testName}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[labResult.status]}`}>
                      {labResult.status.replace("_", " ")}
                    </span>
                    {labResult.isAbnormal ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
                        Abnormal
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    LOINC {labResult.testCode} - Ordered {formatDateTime(labResult.orderedAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Result: {labResult.result || "Pending"}
                    {labResult.unit ? ` ${labResult.unit}` : ""}
                    {labResult.normalRange ? ` - Range ${labResult.normalRange}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Resulted {formatDateTime(labResult.resultedAt)}
                    {labResult.orderedByName ? ` - Ordered by ${labResult.orderedByName}` : ""}
                  </p>
                  {labResult.notes ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">{labResult.notes}</p>
                  ) : null}
                </div>

                {canEnterResults ? (
                  <div className="flex items-start xl:justify-end">
                    <button
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                      onClick={() => handleLabSelection(labResult.id)}
                      type="button"
                    >
                      {selectedLabResultId === labResult.id ? "Selected" : "Enter result"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Order Lab Test</h2>
          {selectedPatient ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{selectedPatient.name}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedPatient.mrn}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Select a patient to order a lab test.</p>
          )}

          {!canOrderLabs ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Lab ordering is limited to doctors and admins.
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleOrderSubmit}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-order-test">
                Test
                <select
                  className={fieldClassName}
                  id="lab-order-test"
                  onChange={(event) => handleOrderSelect(event.target.value)}
                  value={orderForm.testName}
                >
                  {commonLabOrders.map((order) => (
                    <option key={order.testCode} value={order.testName}>
                      {order.testName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-order-code">
                Test code
                <input
                  className={fieldClassName}
                  id="lab-order-code"
                  onChange={(event) => setOrderForm((current) => ({ ...current, testCode: event.target.value }))}
                  value={orderForm.testCode}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-order-notes">
                Notes
                <textarea
                  className={`${fieldClassName} min-h-24 resize-y`}
                  id="lab-order-notes"
                  maxLength={2000}
                  onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))}
                  value={orderForm.notes}
                />
              </label>

              <button
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                disabled={isOrdering || !selectedPatient}
                type="submit"
              >
                {isOrdering ? "Ordering..." : "Order lab"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Enter Result</h2>
          {selectedLabResult ? (
            <p className="mt-2 text-sm text-slate-600">
              {selectedLabResult.testName} - {selectedLabResult.testCode}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Select a lab order from history to enter results.</p>
          )}

          {!canEnterResults ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Lab result entry is limited to clinical users.
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleResultSubmit}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-entry-status">
                Status
                <select
                  className={fieldClassName}
                  disabled={!selectedLabResult}
                  id="lab-entry-status"
                  onChange={(event) =>
                    setResultEntry((current) => ({
                      ...current,
                      status: event.target.value as LabResultStatus,
                    }))
                  }
                  value={resultEntry.status}
                >
                  {labResultStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block text-sm font-medium text-slate-700" htmlFor="lab-entry-result">
                  Result
                  <input
                    className={fieldClassName}
                    disabled={!selectedLabResult}
                    id="lab-entry-result"
                    maxLength={120}
                    onChange={(event) =>
                      setResultEntry((current) => ({ ...current, result: event.target.value }))
                    }
                    value={resultEntry.result}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700" htmlFor="lab-entry-unit">
                  Unit
                  <input
                    className={fieldClassName}
                    disabled={!selectedLabResult}
                    id="lab-entry-unit"
                    maxLength={40}
                    onChange={(event) =>
                      setResultEntry((current) => ({ ...current, unit: event.target.value }))
                    }
                    value={resultEntry.unit}
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-entry-range">
                Normal range
                <input
                  className={fieldClassName}
                  disabled={!selectedLabResult}
                  id="lab-entry-range"
                  maxLength={80}
                  onChange={(event) =>
                    setResultEntry((current) => ({ ...current, normalRange: event.target.value }))
                  }
                  value={resultEntry.normalRange}
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  checked={Boolean(resultEntry.isAbnormal)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  disabled={!selectedLabResult}
                  onChange={(event) =>
                    setResultEntry((current) => ({ ...current, isAbnormal: event.target.checked }))
                  }
                  type="checkbox"
                />
                Flag as abnormal
              </label>

              <label className="block text-sm font-medium text-slate-700" htmlFor="lab-entry-notes">
                Notes
                <textarea
                  className={`${fieldClassName} min-h-24 resize-y`}
                  disabled={!selectedLabResult}
                  id="lab-entry-notes"
                  maxLength={2000}
                  onChange={(event) =>
                    setResultEntry((current) => ({ ...current, notes: event.target.value }))
                  }
                  value={resultEntry.notes}
                />
              </label>

              <button
                className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                disabled={isUpdating || !selectedLabResult}
                type="submit"
              >
                {isUpdating ? "Saving..." : "Save result"}
              </button>
            </form>
          )}
        </section>
      </aside>
    </section>
  );
};
