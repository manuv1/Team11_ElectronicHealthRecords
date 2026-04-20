# Mock Server

This app provides a mock API for frontend development while the real backend continues to own the actual Prisma schema and production behavior.

## Purpose

- Mirror backend route names and response shapes
- Return fixture-driven clinical data for local development
- Simulate common validation and authorization outcomes

## Rules

- Reuse `packages/shared` contracts and fixtures
- Keep payloads compatible with the backend response format
- Never use real patient data in fixtures
