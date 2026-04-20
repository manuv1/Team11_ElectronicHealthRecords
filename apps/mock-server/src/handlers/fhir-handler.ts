import type { Request, Response } from "express";

import { labResults } from "../data/lab-results";
import { medications } from "../data/medications";
import { mockPatients } from "../data/patients";
import { buildMockErrorResponse, buildMockSuccessResponse } from "../utils/response";
import { mapLabResultToFhirObservation } from "../../../../packages/shared/src/utils/fhir-lab-result.ts";
import { mapMedicationToFhirMedicationStatement } from "../../../../packages/shared/src/utils/fhir-medication.ts";
import { mapPatientToFhirPatient } from "../../../../packages/shared/src/utils/fhir-patient.ts";
import type { FhirBundle } from "../../../../packages/shared/src/types/fhir.ts";

const buildBundle = (resources: unknown[]): FhirBundle => ({
  resourceType: "Bundle",
  type: "collection",
  timestamp: new Date().toISOString(),
  total: resources.length,
  entry: resources.map((resource) => {
    const record = resource as { resourceType: string; id: string };

    return {
      fullUrl: `urn:uuid:${record.resourceType}/${record.id}`,
      resource,
    };
  }),
});

const getPatient = (patientId: string) =>
  mockPatients.find((patient) => patient.id === patientId && patient.isActive);

export const exportMockPatientFhirBundle = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const patient = getPatient(request.params.id);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const patientLabResults = labResults.filter((labResult) => labResult.patientId === patient.id);
  const patientMedications = medications.filter((medication) => medication.patientId === patient.id);
  const bundle = buildBundle([
    mapPatientToFhirPatient(patient),
    ...patientLabResults.map(mapLabResultToFhirObservation),
    ...patientMedications.map(mapMedicationToFhirMedicationStatement),
  ]);

  response.status(200).json(buildMockSuccessResponse(bundle, "Mock FHIR patient bundle exported"));
};

export const exportMockPatientObservationBundle = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const patient = getPatient(request.params.id);

  if (!patient) {
    response.status(404).json(buildMockErrorResponse("NOT_FOUND", "Patient not found"));
    return;
  }

  const bundle = buildBundle(
    labResults
      .filter((labResult) => labResult.patientId === patient.id)
      .map(mapLabResultToFhirObservation),
  );

  response.status(200).json(buildMockSuccessResponse(bundle, "Mock FHIR observation bundle exported"));
};
