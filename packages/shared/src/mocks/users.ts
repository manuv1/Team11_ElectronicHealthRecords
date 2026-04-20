import { AuthenticatedUser, UserRole } from "../types/auth";

export interface MockAuthUserRecord extends AuthenticatedUser {
  password: string;
}

const buildUser = (
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: UserRole,
  password: string,
): MockAuthUserRecord => ({
  id,
  firstName,
  lastName,
  email,
  role,
  password,
});

export const mockAuthUsers: MockAuthUserRecord[] = [
  buildUser("usr_admin_001", "Morgan", "Reed", "admin@medrecord.test", "ADMIN", "Admin@12345"),
  buildUser("usr_doctor_001", "Avery", "Cole", "doctor@medrecord.test", "DOCTOR", "Doctor@12345"),
  buildUser("usr_staff_001", "Jordan", "Kim", "staff@medrecord.test", "STAFF", "Staff@12345"),
];
