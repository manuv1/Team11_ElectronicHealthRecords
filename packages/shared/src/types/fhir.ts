export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirIdentifier {
  system: string;
  value: string;
}

export interface FhirHumanName {
  use?: "official";
  family: string;
  given: string[];
  text: string;
}

export interface FhirPatientResource {
  resourceType: "Patient";
  id: string;
  identifier: FhirIdentifier[];
  active: boolean;
  name: FhirHumanName[];
  gender: "male" | "female" | "other" | "unknown";
  birthDate: string;
  telecom?: Array<{
    system: "phone" | "email";
    value: string;
    use: "home" | "work" | "mobile";
  }>;
  address?: Array<{
    text: string;
  }>;
  extension?: Array<{
    url: string;
    valueCodeableConcept: {
      coding: FhirCoding[];
      text: string;
    };
  }>;
}

export interface FhirMedicationStatementResource {
  resourceType: "MedicationStatement";
  id: string;
  status: "active" | "stopped";
  medicationCodeableConcept: {
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectivePeriod: {
    start: string;
    end?: string;
  };
  dosage: Array<{
    text: string;
    route?: {
      text: string;
    };
  }>;
  note?: Array<{
    text: string;
  }>;
}

export interface FhirBundle<TResource = unknown> {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: TResource;
  }>;
}
