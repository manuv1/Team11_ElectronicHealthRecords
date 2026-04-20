# EHR API Project

Full-stack Electronic Health Record (EHR) system scaffolded for:

- Node.js, Express, TypeScript, Prisma, PostgreSQL
- React, TypeScript, Tailwind CSS, React Query
- Mock server for frontend development against backend-shaped contracts
- JWT authentication with refresh tokens
- FHIR R4 compatibility and HIPAA-aware workflows

## Project Structure

```text
apps/
  backend/   Express + Prisma API
  frontend/  React application
  mock-server/ Mock API using backend-compatible payloads
packages/
  shared/    Shared types, constants, utilities, and mock fixtures
.agents/     Team agent briefs for implementation ownership
agents.md    Agent overview and responsibilities
skills.md    Project delivery skills and quality checklist
```

## Core Domain Areas

- Patient management with MRN generation
- Appointment scheduling and overlap prevention
- Lab result workflows with LOINC support
- Medication management with role restrictions
- Audit logging for PHI access and modifications

## Development Approach

- The real backend and Prisma schema remain the source of truth for domain modeling
- The mock server mirrors backend routes and response contracts for frontend development
- Shared types and mock fixtures live in `packages/shared` to keep payloads consistent

## App Screenshots

**Registration: **
<img width="3456" height="1818" alt="Registration" src="https://github.com/user-attachments/assets/154eb1d0-df2f-4755-bd22-d28ab3194652" />


**Login:**
<img width="3456" height="1818" alt="Login" src="https://github.com/user-attachments/assets/4545b80a-1c3c-48e0-a4dd-640892112168" />


**Dashboard:**
<img width="3456" height="1818" alt="Dashboard" src="https://github.com/user-attachments/assets/9efdc638-98f5-4e8b-9777-193feeaec88e" />


**Patients:**
<img width="3456" height="2602" alt="Patients" src="https://github.com/user-attachments/assets/c27cda4d-b154-4e90-a664-72decc5b5363" />


**Appointments:**
<img width="3456" height="1818" alt="Appointments" src="https://github.com/user-attachments/assets/a7267d75-b86a-4df2-a256-59d4bf152997" />


**Lab Results:**
<img width="3456" height="2778" alt="Lab Results" src="https://github.com/user-attachments/assets/b1c0c414-e372-4689-a5f4-6dbb30d96fea" />


**Medications:**
<img width="3456" height="1936" alt="Medications" src="https://github.com/user-attachments/assets/84fb81e8-8729-40d8-a8e2-5faddb8e65aa" />


**Reports:**
<img width="3456" height="3066" alt="Reports" src="https://github.com/user-attachments/assets/7227c43f-07cd-4a14-9e76-c5b641c376b4" />


**Audit Logs:**
<img width="3456" height="1818" alt="Audit Logs" src="https://github.com/user-attachments/assets/ea89b649-1e7b-4709-b483-8ea15dc52ff8" />

**User Admin:**
<img width="3456" height="1818" alt="User Admin" src="https://github.com/user-attachments/assets/dab040e5-d55c-42ec-a035-63b07d927c94" />









