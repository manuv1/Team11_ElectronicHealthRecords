export interface ReportMetric {
  label: string;
  value: number;
  helper: string;
}

export interface ReportBreakdownItem {
  label: string;
  value: number;
}

export interface ReportActivityItem {
  id: string;
  title: string;
  subtitle: string;
  occurredAt: string;
  tone: "default" | "success" | "warning" | "danger";
}

export interface OperationalReport {
  generatedAt: string;
  metrics: {
    totalPatients: number;
    todaysAppointments: number;
    scheduledAppointments: number;
    completedAppointments: number;
    abnormalLabResults: number;
    pendingLabResults: number;
    activeMedications: number;
    allergyWarnings: number;
  };
  appointmentStatusCounts: ReportBreakdownItem[];
  labStatusCounts: ReportBreakdownItem[];
  medicationStatusCounts: ReportBreakdownItem[];
  recentActivity: ReportActivityItem[];
}
