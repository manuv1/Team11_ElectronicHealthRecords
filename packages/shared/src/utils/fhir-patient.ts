import type { FhirPatientResource } from "../types/fhir.ts";
import type { Patient, PatientGender } from "../types/patient.ts";

const genderMap: Record<PatientGender, FhirPatientResource["gender"]> = {
  FEMALE: "female",
  MALE: "male",
  OTHER: "other",
};

export const mapPatientToFhirPatient = (patient: Patient): FhirPatientResource => {
  const telecom: FhirPatientResource["telecom"] = [];

  if (patient.phone) {
    telecom.push({
      system: "phone",
      value: patient.phone,
      use: "mobile",
    });
  }

  if (patient.email) {
    telecom.push({
      system: "email",
      value: patient.email,
      use: "home",
    });
  }

  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: [
      {
        system: "urn:oid:2.16.840.1.113883.19.5",
        value: patient.mrn,
      },
    ],
    active: patient.isActive,
    name: [
      {
        use: "official",
        family: patient.lastName,
        given: [patient.firstName],
        text: `${patient.firstName} ${patient.lastName}`.trim(),
      },
    ],
    gender: genderMap[patient.gender] ?? "unknown",
    birthDate: patient.dateOfBirth,
    telecom: telecom.length > 0 ? telecom : undefined,
    address: patient.address ? [{ text: patient.address }] : undefined,
    extension: patient.bloodType
      ? [
          {
            url: "http://hl7.org/fhir/StructureDefinition/patient-bloodGroup",
            valueCodeableConcept: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v2-0136",
                  code: patient.bloodType,
                  display: patient.bloodType,
                },
              ],
              text: patient.bloodType,
            },
          },
        ]
      : undefined,
  };
};
