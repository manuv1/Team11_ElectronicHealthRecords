import type { FhirMedicationStatementResource } from "../types/fhir.ts";
import type { Medication } from "../types/medication.ts";

export const mapMedicationToFhirMedicationStatement = (
  medication: Medication,
): FhirMedicationStatementResource => {
  const notes = [
    medication.notes,
    ...medication.allergyWarnings,
    medication.discontinueReason ? `Discontinue reason: ${medication.discontinueReason}` : undefined,
  ].filter((note): note is string => Boolean(note));

  return {
    resourceType: "MedicationStatement",
    id: medication.id,
    status: medication.status === "ACTIVE" ? "active" : "stopped",
    medicationCodeableConcept: {
      text: medication.name,
    },
    subject: {
      reference: `Patient/${medication.patientId}`,
      display: medication.patientName,
    },
    effectivePeriod: {
      start: medication.startDate,
      end: medication.endDate,
    },
    dosage: [
      {
        text: `${medication.dosage} ${medication.frequency}`.trim(),
        route: {
          text: medication.route,
        },
      },
    ],
    note: notes.length > 0 ? notes.map((text) => ({ text })) : undefined,
  };
};
