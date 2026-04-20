# Project Skills

This project expects contributors and agents to apply the following skills consistently.

## API Design

- Build RESTful endpoints with resource-based naming
- Return the standard success and error payload shapes
- Keep controllers lightweight and place business rules in services

## Validation and Contracts

- Use Zod schemas at request boundaries
- Share stable contracts through `packages/shared`
- Keep frontend and backend types aligned
- Keep mock server payloads aligned with backend contracts and response wrappers

## Security and HIPAA

- Treat patient and clinical data as sensitive by default
- Avoid logging PHI in plain text
- Audit all access and modifications involving PHI
- Enforce strong passwords, RBAC, and encryption-aware handling

## Clinical Domain Logic

- Generate MRNs using `MRN-YYYYMMDD-XXXX`
- Prevent overlapping appointments for the same provider
- Restrict medication prescribing to `DOCTOR` and `ADMIN`
- Track lab results with LOINC-compatible identifiers

## Frontend Delivery

- Use functional React components with hooks
- Use React Query for server state
- Prefer reusable Tailwind components over page-specific duplication
- Make API consumers swappable between `backend` and `mock-server` without UI rewrites

## Backend Delivery

- Use async and await with explicit error handling
- Use Prisma for database access
- Document public functions and important domain behavior

## Mock Server Delivery

- Mirror backend route naming and response shapes
- Store mock fixtures in shared modules when they are reused by frontend tests or stories
- Simulate domain rules such as appointment conflicts and role restrictions where useful
