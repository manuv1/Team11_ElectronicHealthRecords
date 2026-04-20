# Project Agents

These agent roles split ownership clearly across the EHR codebase.

## Backend API Agent

- Owns Express routes, controllers, services, middleware, and validation
- Enforces API response contracts, RBAC, and audit logging hooks
- Implements MRN generation, appointment conflict checks, and medication authorization rules

## Frontend Experience Agent

- Owns React pages, reusable components, hooks, and API integration
- Maintains Tailwind-based UI consistency and React Query data flows
- Builds patient, appointment, lab result, and medication workflows
- Keeps frontend integration compatible with both the real backend and the mock server

## Data and FHIR Agent

- Owns Prisma schema evolution, shared domain contracts, and FHIR mapping utilities
- Keeps models aligned with PostgreSQL and resource interoperability needs
- Documents identifiers, coding systems, and reference relationships

## Mock Server Agent

- Owns mock API routes, fixtures, and handler behavior used for local frontend development
- Mirrors backend response formats, pagination, and domain rules closely enough to prevent integration drift
- Reuses shared contracts so mocked payloads stay aligned with the real API

## Security and Compliance Agent

- Owns JWT and refresh token strategy, encryption boundaries, audit requirements, and HIPAA guardrails
- Reviews access logging, PHI handling, and role-based restrictions
- Defines secure defaults for secrets, password policy, and sensitive-field masking
- Reviews mock data to ensure PHI-safe seeded records and sanitized examples
