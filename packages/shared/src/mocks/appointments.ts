import type { Appointment } from "../types/appointment.ts";

const tomorrowAt = (hour: number, minute = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const todayAt = (hour: number, minute = 0): string => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const mockProviders = [
  {
    id: "prov_001",
    name: "Dr. Meera Rao",
  },
  {
    id: "prov_002",
    name: "Dr. James Smith",
  },
  {
    id: "prov_003",
    name: "Nurse Priya Menon",
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: "apt_001",
    patientId: "pat_001",
    patientName: "Ava Sharma",
    providerId: "prov_001",
    providerName: "Dr. Meera Rao",
    dateTime: tomorrowAt(10),
    duration: 30,
    type: "CHECKUP",
    status: "SCHEDULED",
    notes: "Annual wellness visit and vitals review.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "apt_002",
    patientId: "pat_002",
    patientName: "Noah Patel",
    providerId: "prov_002",
    providerName: "Dr. James Smith",
    dateTime: todayAt(14, 30),
    duration: 45,
    type: "CONSULTATION",
    status: "CONFIRMED",
    notes: "Review recent symptoms and care plan.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

