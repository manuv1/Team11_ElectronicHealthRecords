import type { LabResult } from "../types/lab-result.ts";

export interface FhirObservationResource {
  resourceType: "Observation";
  id: string;
  status: "registered" | "preliminary" | "final";
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string;
  issued?: string;
  valueString?: string;
  valueQuantity?: {
    value: number;
    unit?: string;
    system: string;
    code?: string;
  };
  referenceRange?: Array<{
    text: string;
  }>;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: "H" | "N";
      display: "High/Abnormal" | "Normal";
    }>;
  }>;
  note?: Array<{
    text: string;
  }>;
}

const statusMap: Record<LabResult["status"], FhirObservationResource["status"]> = {
  PENDING: "registered",
  IN_PROGRESS: "preliminary",
  COMPLETED: "final",
};

const parseNumericResult = (result?: string): number | undefined => {
  if (!result) {
    return undefined;
  }

  const parsed = Number(result);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const mapLabResultToFhirObservation = (labResult: LabResult): FhirObservationResource => {
  const numericResult = parseNumericResult(labResult.result);
  const observation: FhirObservationResource = {
    resourceType: "Observation",
    id: labResult.id,
    status: statusMap[labResult.status],
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: labResult.testCode,
          display: labResult.testName,
        },
      ],
      text: labResult.testName,
    },
    subject: {
      reference: `Patient/${labResult.patientId}`,
      display: labResult.patientName,
    },
    effectiveDateTime: labResult.orderedAt,
    issued: labResult.resultedAt,
  };

  if (numericResult !== undefined) {
    observation.valueQuantity = {
      value: numericResult,
      unit: labResult.unit,
      system: "http://unitsofmeasure.org",
      code: labResult.unit,
    };
  } else if (labResult.result) {
    observation.valueString = labResult.result;
  }

  if (labResult.normalRange) {
    observation.referenceRange = [{ text: labResult.normalRange }];
  }

  if (labResult.isAbnormal !== undefined) {
    observation.interpretation = [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: labResult.isAbnormal ? "H" : "N",
            display: labResult.isAbnormal ? "High/Abnormal" : "Normal",
          },
        ],
      },
    ];
  }

  if (labResult.notes) {
    observation.note = [{ text: labResult.notes }];
  }

  return observation;
};
