import { mapLabResultToFhirObservation } from "../../../../packages/shared/src/utils/fhir-lab-result";
import { mapMedicationToFhirMedicationStatement } from "../../../../packages/shared/src/utils/fhir-medication";
import { mapPatientToFhirPatient } from "../../../../packages/shared/src/utils/fhir-patient";
import type { FhirBundle } from "../types/fhir";
import { labResultService } from "./lab-result-service";
import { medicationService } from "./medication-service";
import { patientService } from "./patient-service";
import { recordAuditEntry } from "./audit-service";
import type { UserRole } from "../types/auth";

interface RequestActor {
  userId?: string;
  role?: UserRole;
}

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

const auditFhirExport = async (
  patientId: string,
  exportType: string,
  actor: RequestActor,
): Promise<void> => {
  await recordAuditEntry({
    userId: actor.userId,
    action: `fhir.${exportType}.export`,
    resource: "fhir",
    outcome: "success",
    metadata: {
      patientId,
      role: actor.role,
    },
  });
};

export const fhirService = {
  async exportPatientRecord(patientId: string, actor: RequestActor = {}): Promise<FhirBundle> {
    const patient = await patientService.getById(patientId);
    const [labResultList, medicationList] = await Promise.all([
      labResultService.list(patientId, { status: "ALL", page: 1, limit: 500 }),
      medicationService.list(patientId, { status: "ALL", page: 1, limit: 500 }),
    ]);
    const resources = [
      mapPatientToFhirPatient(patient),
      ...labResultList.items.map(mapLabResultToFhirObservation),
      ...medicationList.items.map(mapMedicationToFhirMedicationStatement),
    ];

    await auditFhirExport(patientId, "patient-record", actor);

    return buildBundle(resources);
  },

  async exportPatientObservations(patientId: string, actor: RequestActor = {}): Promise<FhirBundle> {
    await patientService.getById(patientId);
    const labResultList = await labResultService.list(patientId, {
      status: "ALL",
      page: 1,
      limit: 500,
    });

    await auditFhirExport(patientId, "observation", actor);

    return buildBundle(labResultList.items.map(mapLabResultToFhirObservation));
  },
};
