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
