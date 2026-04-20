import type { Request, Response } from "express";

import { appointments } from "../data/appointments";
import { labResults } from "../data/lab-results";
import { medications } from "../data/medications";
import { mockPatients } from "../data/patients";
import { buildMockSuccessResponse } from "../utils/response";
import type { OperationalReport, ReportActivityItem, ReportBreakdownItem } from "../../../../packages/shared/src/types/report.ts";

const countBy = <T extends string>(values: T[], labels: readonly T[]): ReportBreakdownItem[] =>
  labels.map((label) => ({
    label,
    value: values.filter((value) => value === label).length,
  }));

const getTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getMockOperationalReport = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  const activePatients = mockPatients.filter((patient) => patient.isActive);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter(
    (appointment) => appointment.dateTime.slice(0, 10) === todayKey,
  );
  const recentActivity: ReportActivityItem[] = [
    ...activePatients.map((patient) => ({
      id: `patient-${patient.id}`,
      title: `${patient.firstName} ${patient.lastName}`.trim(),
      subtitle: `Patient registered ${patient.mrn}`,
      occurredAt: patient.createdAt,
      tone: "default" as const,
    })),
    ...labResults.map((labResult) => ({
      id: `lab-${labResult.id}`,
      title: labResult.testName,
      subtitle: `${labResult.patientName ?? labResult.patientId} - ${labResult.status}`,
      occurredAt: labResult.resultedAt ?? labResult.orderedAt,
      tone: labResult.isAbnormal ? ("danger" as const) : ("default" as const),
    })),
    ...medications.map((medication) => ({
      id: `medication-${medication.id}`,
      title: medication.name,
      subtitle: `${medication.patientName ?? medication.patientId} - ${medication.status}`,
      occurredAt: medication.updatedAt,
      tone: medication.allergyWarnings.length > 0 ? ("warning" as const) : ("success" as const),
    })),
  ]
    .sort((left, right) => getTimestamp(right.occurredAt) - getTimestamp(left.occurredAt))
    .slice(0, 8);
  const report: OperationalReport = {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalPatients: activePatients.length,
      todaysAppointments: todaysAppointments.length,
      scheduledAppointments: appointments.filter((appointment) => appointment.status === "SCHEDULED").length,
      completedAppointments: appointments.filter((appointment) => appointment.status === "COMPLETED").length,
      abnormalLabResults: labResults.filter((labResult) => labResult.isAbnormal).length,
      pendingLabResults: labResults.filter((labResult) => labResult.status !== "COMPLETED").length,
      activeMedications: medications.filter((medication) => medication.status === "ACTIVE").length,
      allergyWarnings: medications.reduce(
        (total, medication) => total + medication.allergyWarnings.length,
        0,
      ),
    },
    appointmentStatusCounts: countBy(
      appointments.map((appointment) => appointment.status),
      ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
    ),
    labStatusCounts: countBy(
      labResults.map((labResult) => labResult.status),
      ["PENDING", "IN_PROGRESS", "COMPLETED"],
    ),
    medicationStatusCounts: countBy(
      medications.map((medication) => medication.status),
      ["ACTIVE", "DISCONTINUED"],
    ),
    recentActivity,
  };

  response.status(200).json(buildMockSuccessResponse(report, "Mock operational report fetched"));
};
