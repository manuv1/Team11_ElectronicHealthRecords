
# Software Requirements Specification (SRS)

## MedRecord - Electronic Health Record (EHR) API System

**Document Version:** 1.0  
**Date:** April 20, 2026  
**Project:** Vibe Coding Hackathon 2026  
**Team Size:** 3 Developers  

---

# Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features & Requirements](#3-system-features--requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [System Models](#7-system-models)
8. [Appendices](#8-appendices)

---

# 1. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete description of the functional and non-functional requirements for the **MedRecord Electronic Health Record (EHR) API System**. This document is intended for:

- Development team members
- Project stakeholders
- Quality assurance testers
- Hackathon judges and evaluators

## 1.2 Scope

### 1.2.1 Product Name
**MedRecord EHR System**

### 1.2.2 Product Description
MedRecord is a web-based Electronic Health Record system that enables healthcare providers to manage patient records, schedule appointments, track lab results, and manage medications through a secure, user-friendly interface with a RESTful API backend.

### 1.2.3 Product Objectives

| Objective | Description |
|-----------|-------------|
| **Centralization** | Provide a single platform for all patient health information |
| **Efficiency** | Streamline clinical workflows and reduce administrative burden |
| **Accessibility** | Enable quick access to patient data from any web browser |
| **Security** | Ensure HIPAA-compliant data handling and access control |
| **Interoperability** | Design API for future integration with external systems |

### 1.2.4 Scope Boundaries

| In Scope | Out of Scope |
|----------|--------------|
| Patient registration & management | Billing & insurance claims processing |
| Appointment scheduling | Pharmacy system integration |
| Lab results management | Medical imaging (PACS/DICOM) |
| Medication tracking | Telemedicine video conferencing |
| User authentication & authorization | Mobile native applications |
| Audit logging | Advanced analytics & machine learning |
| RESTful API | Real-time notifications (WebSocket) |

## 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |
| **DOB** | Date of Birth |
| **EHR** | Electronic Health Record |
| **EMR** | Electronic Medical Record |
| **FHIR** | Fast Healthcare Interoperability Resources |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **HL7** | Health Level Seven International |
| **ICD-10** | International Classification of Diseases, 10th Revision |
| **JWT** | JSON Web Token |
| **LOINC** | Logical Observation Identifiers Names and Codes |
| **MRN** | Medical Record Number |
| **PHI** | Protected Health Information |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SPA** | Single Page Application |
| **UI** | User Interface |
| **UX** | User Experience |

## 1.4 References

| Document | Description |
|----------|-------------|
| HIPAA Security Rule | 45 CFR Part 160 and Subparts A and C of Part 164 |
| FHIR R4 Specification | HL7 FHIR Release 4 |
| LOINC Database | Logical Observation Identifiers Names and Codes |
| OWASP Security Guidelines | Web Application Security Best Practices |

## 1.5 Overview

This SRS document is organized as follows:

- **Section 2** provides an overall description of the product
- **Section 3** details functional requirements by feature
- **Section 4** describes external interface requirements
- **Section 5** specifies non-functional requirements
- **Section 6** defines data requirements
- **Section 7** presents system models and diagrams
- **Section 8** contains appendices with additional information

---

# 2. Overall Description

## 2.1 Product Perspective

### 2.1.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONTEXT DIAGRAM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐                              ┌──────────────┐           │
│    │   Healthcare │                              │   System     │           │
│    │   Providers  │                              │   Admin      │           │
│    │  (Doctors,   │                              │              │           │
│    │   Nurses)    │                              │              │           │
│    └──────┬───────┘                              └──────┬───────┘           │
│           │                                             │                    │
│           │  HTTPS                              HTTPS   │                    │
│           │                                             │                    │
│           ▼                                             ▼                    │
│    ┌─────────────────────────────────────────────────────────────┐          │
│    │                                                             │          │
│    │                    MedRecord EHR System                     │          │
│    │                                                             │          │
│    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │          │
│    │   │   React     │    │   Express   │    │    JSON     │   │          │
│    │   │   Frontend  │◄──►│   Backend   │◄──►│    Data     │   │          │
│    │   │   (SPA)     │    │   (API)     │    │   Storage   │   │          │
│    │   └─────────────┘    └─────────────┘    └─────────────┘   │          │
│    │                                                             │          │
│    └─────────────────────────────────────────────────────────────┘          │
│           ▲                                             ▲                    │
│           │                                             │                    │
│           │  HTTPS                              HTTPS   │                    │
│           │                                             │                    │
│    ┌──────┴───────┐                              ┌──────┴───────┐           │
│    │   Front Desk │                              │   Future     │           │
│    │   Staff      │                              │   External   │           │
│    │              │                              │   Systems    │           │
│    └──────────────┘                              └──────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THREE-TIER ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      PRESENTATION TIER                                 │  │
│  │                                                                        │  │
│  │   React 18 + TypeScript + Tailwind CSS + React Query                  │  │
│  │                                                                        │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │   │  Login  │  │Dashboard│  │Patients │  │Appoint- │  │ Reports │   │  │
│  │   │  Page   │  │  Page   │  │  Page   │  │  ments  │  │  Page   │   │  │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  │                                                                        │  │
│  └─────────────────────────────────┬─────────────────────────────────────┘  │
│                                    │ REST API (JSON)                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       APPLICATION TIER                                 │  │
│  │                                                                        │  │
│  │   Node.js + Express.js                                                │  │
│  │                                                                        │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │  │
│  │   │   Routes    │  │ Controllers │  │  Services   │                  │  │
│  │   │             │──│             │──│             │                  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                  │  │
│  │                                                                        │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │  │
│  │   │    Auth     │  │ Validation  │  │   Error     │                  │  │
│  │   │ Middleware  │  │ Middleware  │  │  Handler    │                  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                  │  │
│  │                                                                        │  │
│  └─────────────────────────────────┬─────────────────────────────────────┘  │
│                                    │ File System I/O                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA TIER                                      │  │
│  │                                                                        │  │
│  │   JSON File Storage (Mock Database)                                   │  │
│  │                                                                        │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │
│  │   │ users   │  │patients │  │appoint- │  │  labs   │  │  meds   │   │  │
│  │   │ .json   │  │ .json   │  │ments    │  │ .json   │  │ .json   │   │  │
│  │   │         │  │         │  │ .json   │  │         │  │         │   │  │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Product Functions

### 2.2.1 Function Summary

| Function Category | Functions |
|-------------------|-----------|
| **Authentication** | User registration, login, logout, session management |
| **Patient Management** | Create, view, update, search, deactivate patients |
| **Appointment Management** | Book, view, update, cancel appointments |
| **Lab Results** | Order, view, update lab test results |
| **Medication Management** | Prescribe, view, update, discontinue medications |
| **Dashboard** | View statistics, recent activity, quick actions |
| **Audit** | Log all system actions for compliance |

### 2.2.2 Function Hierarchy

```
MedRecord EHR System
├── Authentication & Authorization
│   ├── User Registration
│   ├── User Login
│   ├── Session Management
│   └── Role-Based Access Control
│
├── Patient Management
│   ├── Patient Registration
│   ├── Patient Search
│   ├── Patient Profile View
│   ├── Patient Update
│   └── Patient Deactivation
│
├── Appointment Management
│   ├── Appointment Booking
│   ├── Appointment Calendar View
│   ├── Appointment Update
│   ├── Appointment Cancellation
│   └── Conflict Detection
│
├── Clinical Data Management
│   ├── Lab Results
│   │   ├── Lab Order Creation
│   │   ├── Lab Result Entry
│   │   └── Lab History View
│   │
│   └── Medications
│       ├── Prescription Creation
│       ├── Medication List View
│       └── Medication Discontinuation
│
├── Dashboard & Reporting
│   ├── Statistics Display
│   ├── Recent Patients
│   ├── Today's Appointments
│   └── Quick Actions
│
└── System Administration
    ├── User Management
    └── Audit Log Viewing
```

## 2.3 User Classes and Characteristics

### 2.3.1 User Role Definitions

| Role | Description | Technical Expertise | Usage Frequency |
|------|-------------|---------------------|-----------------|
| **Administrator** | IT staff responsible for system configuration, user management, and compliance monitoring | High | Daily |
| **Doctor/Physician** | Licensed medical professionals who diagnose, treat, and prescribe | Medium | Frequent (multiple times daily) |
| **Nurse** | Clinical staff who assist doctors, record vitals, and manage patient care | Medium | Frequent (multiple times daily) |
| **Front Desk Staff** | Administrative personnel handling patient registration and scheduling | Low-Medium | Continuous |

### 2.3.2 User Personas

#### Persona 1: Dr. Sarah Mitchell (Doctor)

```
┌─────────────────────────────────────────────────────────────┐
│  👩‍⚕️ DR. SARAH MITCHELL                                     │
│  Primary Care Physician | Age: 38 | Experience: 12 years    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GOALS:                                                      │
│  • Quick access to complete patient history                  │
│  • Efficient documentation during appointments               │
│  • Easy medication prescribing with allergy checks          │
│  • View lab results immediately when available               │
│                                                              │
│  FRUSTRATIONS:                                               │
│  • Time-consuming data entry                                 │
│  • Switching between multiple systems                        │
│  • Missing or incomplete patient information                 │
│                                                              │
│  TECHNICAL SKILLS: Moderate                                  │
│  • Comfortable with web applications                         │
��  • Prefers intuitive interfaces                              │
│  • Limited patience for complex workflows                    │
│                                                              │
│  TYPICAL TASKS:                                              │
│  • Review patient records (20-30 times/day)                  │
│  • Document encounters (15-25 times/day)                     │
│  • Order labs (5-10 times/day)                               │
│  • Prescribe medications (10-15 times/day)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Persona 2: Mike Thompson (Front Desk Staff)

```
┌─────────────────────────────────────────────────────────────┐
│  👨‍💼 MIKE THOMPSON                                           │
│  Front Desk Coordinator | Age: 28 | Experience: 3 years     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GOALS:                                                      │
│  • Fast patient check-in process                             │
│  • Efficient appointment scheduling                          │
│  • Accurate patient information entry                        │
│  • Handle high volume of patients smoothly                   │
│                                                              │
│  FRUSTRATIONS:                                               │
│  • Phone tag with patients for scheduling                    │
│  • Double-booking errors                                     │
│  • Slow system during peak hours                             │
│                                                              │
│  TECHNICAL SKILLS: Basic to Moderate                         │
│  • Familiar with office software                             │
│  • Needs clear, simple interfaces                            │
│  • May need training for new features                        │
│                                                              │
│  TYPICAL TASKS:                                              │
│  • Register new patients (5-10 times/day)                    │
│  • Schedule appointments (30-50 times/day)                   │
│  • Update patient demographics (10-20 times/day)             │
│  • Check in patients (40-60 times/day)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3.3 Permission Matrix

| Feature / Action | Admin | Doctor | Nurse | Staff |
|------------------|:-----:|:------:|:-----:|:-----:|
| **User Management** |
| Create/Edit Users | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| **Patient Management** |
| Create Patient | ✅ | ✅ | ✅ | ✅ |
| View Patient Demographics | ✅ | ✅ | ✅ | ✅ |
| View Clinical Data | ✅ | ✅ | ✅ | ❌ |
| Update Patient | ✅ | ✅ | ✅ | ⚠️ Demo only |
| Deactivate Patient | ✅ | ❌ | ❌ | ❌ |
| **Appointments** |
| View Appointments | ✅ | ✅ | ✅ | ✅ |
| Create Appointments | ✅ | ✅ | ✅ | ✅ |
| Update Appointments | ✅ | ✅ | ✅ | ✅ |
| Cancel Appointments | ✅ | ✅ | ✅ | ✅ |
| **Lab Results** |
| Order Labs | ✅ | ✅ | ❌ | ❌ |
| View Lab Results | ✅ | ✅ | ✅ | ❌ |
| Enter Lab Results | ✅ | ✅ | ✅ | ❌ |
| **Medications** |
| Prescribe Medications | ✅ | ✅ | ❌ | ❌ |
| View Medications | ✅ | ✅ | ✅ | ❌ |
| Discontinue Medications | ✅ | ✅ | ❌ | ❌ |

## 2.4 Operating Environment

### 2.4.1 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Server** |
| CPU | 2 cores | 4+ cores |
| RAM | 2 GB | 4+ GB |
| Storage | 1 GB | 10+ GB |
| **Client** |
| CPU | 1 GHz dual-core | 2+ GHz |
| RAM | 2 GB | 4+ GB |
| Display | 1280x720 | 1920x1080 |

### 2.4.2 Software Requirements

| Component | Requirement |
|-----------|-------------|
| **Server Environment** |
| Runtime | Node.js 18.x or higher |
| Package Manager | npm 9.x or higher |
| **Client Environment** |
| Browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| JavaScript | Enabled |
| Cookies | Enabled |
| **Development** |
| IDE | VS Code (recommended) |
| Version Control | Git |

### 2.4.3 Network Requirements

| Requirement | Specification |
|-------------|---------------|
| Protocol | HTTPS (TLS 1.2+) |
| Bandwidth | Minimum 1 Mbps |
| Latency | < 200ms recommended |
| Ports | 443 (HTTPS), 3001 (API dev), 5173 (Frontend dev) |

## 2.5 Design and Implementation Constraints

### 2.5.1 Technical Constraints

| Constraint | Description | Rationale |
|------------|-------------|-----------|
| **Mock Database** | JSON file storage instead of real database | Hackathon time limitation |
| **No Real Authentication** | Simplified password validation | Demo purposes |
| **Single Server** | No horizontal scaling | MVP scope |
| **No File Uploads** | No image/document storage | Time constraints |
| **English Only** | No internationalization | MVP scope |

### 2.5.2 Regulatory Constraints

| Constraint | Description |
|------------|-------------|
| **HIPAA Awareness** | Design with HIPAA principles in mind (audit logging, access control) |
| **Data Privacy** | No real patient data in demo |
| **Soft Delete** | Patient records cannot be permanently deleted |

### 2.5.3 Development Constraints

| Constraint | Description |
|------------|-------------|
| **Time** | 1.5 hours total development time |
| **Team Size** | 3 developers |
| **Technology** | Must use specified tech stack |
| **Deployment** | Local development environment only |

## 2.6 Assumptions and Dependencies

### 2.6.1 Assumptions

| ID | Assumption |
|----|------------|
| A1 | Users have access to modern web browsers |
| A2 | Users have basic computer literacy |
| A3 | Network connectivity is available |
| A4 | Backend and frontend run on same machine or network |
| A5 | Demo data is acceptable for presentation |
| A6 | Single timezone operation (no timezone handling) |

### 2.6.2 Dependencies

| ID | Dependency | Type | Impact if Unavailable |
|----|------------|------|----------------------|
| D1 | Node.js runtime | Technical | Cannot run backend |
| D2 | npm packages | Technical | Cannot build application |
| D3 | Modern browser | Technical | UI may not render correctly |
| D4 | Local file system | Technical | Cannot store data |
| D5 | Network (localhost) | Technical | Frontend cannot reach backend |

---

# 3. System Features & Requirements

## 3.1 Authentication & Authorization

### 3.1.1 Feature Description
The system shall provide secure user authentication and role-based authorization to control access to features and data.

### 3.1.2 Functional Requirements

#### FR-AUTH-001: User Registration

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-AUTH-001 |
| **Title** | User Registration |
| **Description** | The system shall allow new users to register with email, password, name, and role |
| **Priority** | High |
| **Inputs** | Email, password, name, role |
| **Processing** | Validate inputs, check email uniqueness, hash password, create user record |
| **Outputs** | User object, JWT token |
| **Pre-conditions** | None |
| **Post-conditions** | New user exists in system, user is authenticated |

**Acceptance Criteria:**
```gherkin
Feature: User Registration

Scenario: Successful registration
  Given I am on the registration page
  When I enter valid name "John Doe"
  And I enter valid email "john@example.com"
  And I enter valid password "Password123"
  And I select role "STAFF"
  And I click "Register"
  Then I should be redirected to the dashboard
  And I should see welcome message with my name

Scenario: Registration with existing email
  Given a user with email "existing@example.com" already exists
  When I try to register with email "existing@example.com"
  Then I should see error "Email already exists"
  And I should remain on registration page

Scenario: Registration with invalid password
  When I enter password "short"
  And I click "Register"
  Then I should see error "Password must be at least 6 characters"
```

#### FR-AUTH-002: User Login

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-AUTH-002 |
| **Title** | User Login |
| **Description** | The system shall authenticate users with email and password |
| **Priority** | High |
| **Inputs** | Email, password |
| **Processing** | Validate credentials, generate JWT token |
| **Outputs** | User object, JWT token |
| **Pre-conditions** | User account exists |
| **Post-conditions** | User is authenticated, token stored in localStorage |

**Acceptance Criteria:**
```gherkin
Feature: User Login

Scenario: Successful login
  Given I am a registered user with email "doctor@ehr.com"
  When I enter email "doctor@ehr.com"
  And I enter password "Password123"
  And I click "Sign In"
  Then I should be redirected to the dashboard
  And I should see my name in the header

Scenario: Login with invalid credentials
  When I enter email "wrong@email.com"
  And I enter any password
  And I click "Sign In"
  Then I should see error "Invalid email or password"
  And I should remain on login page

Scenario: Login with empty fields
  When I click "Sign In" without entering credentials
  Then I should see validation errors for required fields
```

#### FR-AUTH-003: Session Management

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-AUTH-003 |
| **Title** | Session Management |
| **Description** | The system shall manage user sessions using JWT tokens |
| **Priority** | High |
| **Token Expiry** | 24 hours |
| **Storage** | localStorage |

**Requirements:**
- R1: JWT token shall be included in Authorization header for all API requests
- R2: Invalid/expired tokens shall result in 401 response
- R3: User shall be redirected to login page when token is invalid
- R4: Logout shall clear token from localStorage

#### FR-AUTH-004: Role-Based Access Control

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-AUTH-004 |
| **Title** | Role-Based Access Control |
| **Description** | The system shall restrict feature access based on user role |
| **Priority** | High |
| **Roles** | ADMIN, DOCTOR, NURSE, STAFF |

**Requirements:**
- R1: Each API endpoint shall verify user role before processing
- R2: Unauthorized access attempts shall return 403 response
- R3: UI shall hide features not available to user's role

---

## 3.2 Patient Management

### 3.2.1 Feature Description
The system shall provide comprehensive patient record management including registration, search, viewing, and updating of patient information.

### 3.2.2 Functional Requirements

#### FR-PAT-001: Patient Registration

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-PAT-001 |
| **Title** | Patient Registration |
| **Description** | The system shall allow authorized users to register new patients |
| **Priority** | High |
| **Actors** | Admin, Doctor, Nurse, Staff |

**Input Specification:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| firstName | String | Yes | 1-100 characters |
| lastName | String | Yes | 1-100 characters |
| dateOfBirth | Date | Yes | Cannot be future date, after 1900-01-01 |
| gender | Enum | Yes | MALE, FEMALE, OTHER |
| email | String | No | Valid email format |
| phone | String | No | Valid phone format |
| address | String | No | Max 500 characters |
| bloodType | String | No | A+, A-, B+, B-, AB+, AB-, O+, O- |
| allergies | Array | No | Array of strings |

**Output Specification:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | System-generated unique identifier |
| mrn | String | Auto-generated Medical Record Number |
| ... | ... | All input fields |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Timestamp of creation |

**MRN Generation Rule:**
```
Format: MRN-YYYYMMDD-XXXX
Where:
  YYYYMMDD = Current date
  XXXX = Random 4-character alphanumeric string
Example: MRN-20260420-A1B2
```

**Acceptance Criteria:**
```gherkin
Feature: Patient Registration

Scenario: Register patient with required fields only
  Given I am logged in as a Staff user
  When I click "Add Patient"
  And I enter firstName "John"
  And I enter lastName "Doe"
  And I enter dateOfBirth "1985-03-15"
  And I select gender "MALE"
  And I click "Create Patient"
  Then a new patient record should be created
  And the patient should have an auto-generated MRN
  And I should see success message "Patient created successfully"

Scenario: Register patient with all fields
  Given I am logged in
  When I fill in all patient fields including allergies "Penicillin, Aspirin"
  And I click "Create Patient"
  Then the patient should be created with all information
  And allergies should be stored as an array ["Penicillin", "Aspirin"]

Scenario: Attempt to register with invalid date of birth
  When I enter dateOfBirth as a future date
  And I click "Create Patient"
  Then I should see error "Date of birth cannot be in the future"
```

#### FR-PAT-002: Patient Search

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-PAT-002 |
| **Title** | Patient Search |
| **Description** | The system shall allow users to search for patients |
| **Priority** | High |
| **Actors** | All authenticated users |

**Search Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| search | String | Searches firstName, lastName, MRN |
| page | Integer | Page number (default: 1) |
| limit | Integer | Results per page (default: 10, max: 100) |

**Search Behavior:**
- Case-insensitive partial matching
- Searches across firstName, lastName, and MRN fields
- Results sorted by createdAt descending
- Only active patients (isActive: true) are returned

**Acceptance Criteria:**
```gherkin
Feature: Patient Search

Scenario: Search by name
  Given patients "John Doe" and "Jane Smith" exist
  When I search for "John"
  Then I should see "John Doe" in results
  And I should not see "Jane Smith" in results

Scenario: Search by MRN
  Given patient with MRN "MRN-20260420-A1B2" exists
  When I search for "A1B2"
  Then I should see the patient in results

Scenario: Empty search results
  When I search for "NonexistentName"
  Then I should see "No patients found" message

Scenario: Pagination
  Given 25 patients exist
  When I view page 1 with limit 10
  Then I should see 10 patients
  And pagination should show 3 total pages
```

#### FR-PAT-003: Patient Profile View

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-PAT-003 |
| **Title** | Patient Profile View |
| **Description** | The system shall display complete patient information |
| **Priority** | High |
| **Actors** | All authenticated users (with role-based data visibility) |

**Display Sections:**

| Section | Visible To | Contents |
|---------|------------|----------|
| Demographics | All | Name, DOB, gender, contact info |
| Clinical Summary | Doctor, Nurse, Admin | Blood type, allergies |
| Appointments | Doctor, Nurse, Admin, Staff | Past and upcoming appointments |
| Lab Results | Doctor, Nurse, Admin | Lab test history |
| Medications | Doctor, Nurse, Admin | Active and past medications |

#### FR-PAT-004: Patient Update

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-PAT-004 |
| **Title** | Patient Update |
| **Description** | The system shall allow authorized users to update patient information |
| **Priority** | Medium |
| **Actors** | Admin, Doctor, Nurse, Staff (limited) |

**Update Rules:**
- MRN cannot be modified
- Patient ID cannot be modified
- Staff can only update demographics (name, contact)
- Clinical staff can update all fields
- All updates are logged for audit

#### FR-PAT-005: Patient Deactivation

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-PAT-005 |
| **Title** | Patient Deactivation (Soft Delete) |
| **Description** | The system shall allow administrators to deactivate patient records |
| **Priority** | Low |
| **Actors** | Admin only |

**Deactivation Rules:**
- Sets isActive to false
- Sets deletedAt timestamp
- Patient no longer appears in search results
- Historical data preserved for compliance
- Can be reactivated by admin if needed

---

## 3.3 Appointment Management

### 3.3.1 Feature Description
The system shall provide appointment scheduling functionality including booking, viewing, updating, and cancellation of appointments.

### 3.3.2 Functional Requirements

#### FR-APT-001: Appointment Booking

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-APT-001 |
| **Title** | Appointment Booking |
| **Description** | The system shall allow users to book appointments for patients |
| **Priority** | High |
| **Actors** | All authenticated users |

**Input Specification:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| patientId | UUID | Yes | Must exist and be active |
| providerId | UUID | Yes | Must be valid provider |
| dateTime | DateTime | Yes | Must be in the future |
| duration | Integer | No | Default: 30, Range: 15-240 minutes |
| type | Enum | Yes | CHECKUP, FOLLOW_UP, CONSULTATION, PROCEDURE, EMERGENCY |
| notes | String | No | Max 2000 characters |

**Appointment Types:**

| Type | Description | Typical Duration |
|------|-------------|------------------|
| CHECKUP | Routine health examination | 30 min |
| FOLLOW_UP | Follow-up on previous visit | 15-30 min |
| CONSULTATION | Specialist consultation | 45-60 min |
| PROCEDURE | Medical procedure | 30-120 min |
| EMERGENCY | Urgent care | Variable |

**Conflict Detection:**
```
Algorithm: Check for overlapping appointments

Input: providerId, requestedStart, requestedDuration
Process:
  1. Calculate requestedEnd = requestedStart + requestedDuration
  2. For each existing appointment for provider:
     - Skip if status = CANCELLED
     - Calculate existingEnd = existingStart + existingDuration
     - If requestedStart < existingEnd AND requestedEnd > existingStart:
       - CONFLICT DETECTED
Output: Boolean (hasConflict), conflicting appointment details if true
```

**Acceptance Criteria:**
```gherkin
Feature: Appointment Booking

Scenario: Successfully book appointment
  Given I am logged in
  And patient "John Doe" exists
  When I click "Book Appointment"
  And I select patient "John Doe"
  And I select date "2026-04-25"
  And I select time "10:00 AM"
  And I select type "CHECKUP"
  And I click "Book"
  Then appointment should be created with status "SCHEDULED"
  And I should see success message

Scenario: Prevent double booking
  Given Dr. Smith has appointment at 10:00 AM on 2026-04-25
  When I try to book another appointment at 10:15 AM same day
  Then I should see error "Provider already has an appointment at this time"
  And appointment should not be created

Scenario: Book appointment in the past
  When I try to book appointment for yesterday
  Then I should see error "Cannot book appointments in the past"
```

#### FR-APT-002: Appointment List View

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-APT-002 |
| **Title** | Appointment List View |
| **Description** | The system shall display appointments with filtering options |
| **Priority** | High |
| **Actors** | All authenticated users |

**Filter Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | UUID | Filter by specific patient |
| providerId | UUID | Filter by specific provider |
| status | Enum | Filter by appointment status |
| startDate | Date | Filter from date |
| endDate | Date | Filter to date |

**Display Information:**
- Patient name (with link to profile)
- Appointment date and time
- Duration
- Type (with icon)
- Status (color-coded badge)
- Notes preview

#### FR-APT-003: Appointment Status Management

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-APT-003 |
| **Title** | Appointment Status Management |
| **Description** | The system shall track and manage appointment status transitions |
| **Priority** | High |

**Status Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                 APPOINTMENT STATUS FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌───────────────┐                        │
│                    │   SCHEDULED   │                        │
│                    │   (Initial)   │                        │
│                    └───────┬───────┘                        │
│                            │                                 │
│              ┌─────────────┼─────────────┐                  │
│              │             │             │                  │
│              ▼             ▼             ▼                  │
│       ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│       │ CONFIRMED │ │ CANCELLED │ │  NO_SHOW  │            │
│       └─────┬─────┘ └───────────┘ └───────────┘            │
│             │                                               │
│             ▼                                               │
│       ┌───────────┐                                        │
│       │IN_PROGRESS│                                        │
│       └─────┬─────┘                                        │
│             │                                               │
│       ┌─────┴─────┐                                        │
│       ▼           ▼                                        │
│ ┌───────────┐ ┌───────────┐                                │
│ │ COMPLETED │ │ CANCELLED │                                │
│ └───────────┘ └───────────┘                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Valid Status Transitions:**

| From | To | Actor |
|------|-----|-------|
| SCHEDULED | CONFIRMED | Any |
| SCHEDULED | CANCELLED | Any |
| SCHEDULED | NO_SHOW | Doctor, Admin |
| CONFIRMED | IN_PROGRESS | Doctor, Nurse, Admin |
| CONFIRMED | CANCELLED | Any |
| CONFIRMED | NO_SHOW | Doctor, Admin |
| IN_PROGRESS | COMPLETED | Doctor, Admin |
| IN_PROGRESS | CANCELLED | Doctor, Admin |

#### FR-APT-004: Appointment Cancellation

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-APT-004 |
| **Title** | Appointment Cancellation |
| **Description** | The system shall allow cancellation of scheduled appointments |
| **Priority** | Medium |
| **Actors** | All authenticated users |

**Cancellation Rules:**
- Only SCHEDULED, CONFIRMED, or IN_PROGRESS appointments can be cancelled
- COMPLETED appointments cannot be cancelled
- Cancellation sets status to CANCELLED
- Cancellation timestamp is recorded
- Cancelled slots become available for new bookings

---

## 3.4 Dashboard

### 3.4.1 Feature Description
The system shall provide a dashboard with key metrics, recent activity, and quick actions for efficient workflow.

### 3.4.2 Functional Requirements

#### FR-DASH-001: Dashboard Statistics

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-DASH-001 |
| **Title** | Dashboard Statistics Display |
| **Description** | The system shall display key metrics on the dashboard |
| **Priority** | Medium |

**Statistics Cards:**

| Metric | Calculation | Icon |
|--------|-------------|------|
| Total Patients | Count of active patients | 👥 |
| Today's Appointments | Appointments with today's date | ���� |
| Pending Appointments | Appointments with status SCHEDULED | ⏳ |
| Completed Today | Appointments completed today | ✅ |

#### FR-DASH-002: Recent Patients Widget

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-DASH-002 |
| **Title** | Recent Patients Widget |
| **Description** | Display 5 most recently created patients |
| **Priority** | Low |

**Display Fields:**
- Patient initials (avatar)
- Full name
- MRN
- Gender badge

#### FR-DASH-003: Today's Appointments Widget

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-DASH-003 |
| **Title** | Today's Appointments Widget |
| **Description** | Display today's scheduled appointments |
| **Priority** | Medium |

**Display Fields:**
- Appointment time
- Patient name
- Appointment type
- Status badge

#### FR-DASH-004: Quick Actions

| Attribute | Description |
|-----------|-------------|
| **ID** | FR-DASH-004 |
| **Title** | Quick Action Buttons |
| **Description** | Provide quick access to common actions |
| **Priority** | Low |

**Actions:**
- Add Patient → Opens patient creation modal
- Book Appointment → Opens appointment booking modal

---

# 4. External Interface Requirements

## 4.1 User Interfaces

### 4.1.1 General UI Requirements

| ID | Requirement |
|----|-------------|
| UI-001 | The system shall be accessible via modern web browsers |
| UI-002 | The system shall be responsive (desktop, tablet, mobile) |
| UI-003 | The system shall use consistent color scheme and typography |
| UI-004 | The system shall provide clear error messages |
| UI-005 | The system shall indicate loading states |
| UI-006 | The system shall confirm destructive actions |

### 4.1.2 Screen Layouts

#### Login Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                      ┌─────────────────┐                    │
│                      │      🏥         │                    │
│                      │   MedRecord     │                    │
│                      │   EHR System    │                    │
│                      └─────────────────┘                    │
│                                                              │
│                      ┌─────────────────┐                    │
│                      │  Welcome back   │                    │
│                      │                 │                    │
│                      │ ┌─────────────┐ │                    │
│                      │ │ Email       │ │                    │
│                      │ └─────────────┘ │                    │
│                      │ ┌─────────────┐ │                    │
│                      │ │ Password    │ │                    │
│                      │ └─────────────┘ │                    │
│                      │                 │                    │
│                      │ ┌─────────────┐ │                    │
│                      │ │  Sign In    │ │                    │
│                      │ └─────────────┘ │                    │
│                      │                 │                    │
│                      │ Demo Credentials│                    │
│                      │ doctor@ehr.com │                    │
│                      │                 │                    │
│                      │ Don't have an  │                    │
│                      │ account?       │                    │
│                      │ Register       │                    │
│                      └─────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                │
│ │ Sidebar  │  ┌─────────────────────────────────────────────────────────┐  │
│ │          │  │ Header                                    User │ Logout │  │
│ │ 🏥 Med   │  └─────────────────────────────────────────────────────────┘  │
│ │ Record   │                                                                │
│ │          │  ┌─────────────────────────────────────────────────────────┐  │
│ │ ─────────│  │                                                         │  │
│ │          │  │                                                         │  │
│ │ 🏠 Dash  │  │                    Main Content Area                    │  │
│ │          │  │                                                         │  │
│ │ 👥 Pat.  │  │                                                         │  │
│ │          │  │                                                         │  │
│ │ 📅 Appt. │  │                                                         │  │
│ │          │  │                                                         │  │
│ │          │  │                                                         │  │
│ │ ─────────│  │                                                         │  │
│ │          │  │                                                         │  │
│ │ User     │  │                                                         │  │
│ │ Info     │  │                                                         │  │
│ └──────────┘  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Dashboard Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Welcome back, Dr. Sarah! 👋                    [+ Add Patient] [📅 Book]  │
│  Here's what's happening today                                              │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ 👥         │  │ 📅         │  │ ⏳         │  │ ✅         │           │
│  │    127     │  │     8      │  │    12      │  │     5      │           │
│  │  Patients  │  │  Today's   │  │  Pending   │  │ Completed  │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ Recent Patients             │  │ Today's Appointments         │          │
│  │ ─────────────────────────── │  │ ───────────────────────────  │          │
│  │ JD  John Doe    MRN-001    │  │ 09:00  John Doe    CHECKUP  │          │
│  │ JS  Jane Smith  MRN-002    │  │ 10:00  Jane Smith  FOLLOW   │          │
│  │ RJ  Robert J.   MRN-003    │  │ 11:00  Robert J.   CONSULT  │          │
│  │                             │  │                              │          │
│  │              View all →     │  │              View all →      │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1.3 UI Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Primary | Blue | #2563EB |
| Primary Hover | Dark Blue | #1D4ED8 |
| Success | Green | #10B981 |
| Warning | Yellow | #F59E0B |
| Error | Red | #EF4444 |
| Background | Light Gray | #F3F4F6 |
| Card Background | White | #FFFFFF |
| Text Primary | Dark Gray | #111827 |
| Text Secondary | Gray | #6B7280 |
| Border | Light Gray | #E5E7EB |

## 4.2 API Interfaces

### 4.2.1 API Overview

| Attribute | Value |
|-----------|-------|
| Protocol | HTTP/HTTPS |
| Format | JSON |
| Authentication | Bearer Token (JWT) |
| Base URL | `/api` |

### 4.2.2 API Endpoints Summary

#### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| GET | `/api/auth/me` | Get current user | Yes |

#### Patient Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/patients` | List/search patients | Yes |
| GET | `/api/patients/:id` | Get patient by ID | Yes |
| POST | `/api/patients` | Create patient | Yes |
| PUT | `/api/patients/:id` | Update patient | Yes |
| DELETE | `/api/patients/:id` | Deactivate patient | Yes (Admin) |

#### Appointment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/appointments` | List appointments | Yes |
| GET | `/api/appointments/:id` | Get appointment by ID | Yes |
| POST | `/api/appointments` | Create appointment | Yes |
| PUT | `/api/appointments/:id` | Update appointment | Yes |
| DELETE | `/api/appointments/:id` | Cancel appointment | Yes |

### 4.2.3 API Request/Response Formats

#### Standard Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 4.2.4 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., double booking) |
| SERVER_ERROR | 500 | Internal server error |
| DUPLICATE | 400 | Duplicate resource (e.g., email exists) |
| INVALID_CREDENTIALS | 401 | Wrong email or password |

## 4.3 Hardware Interfaces

Not applicable for this web-based application.

## 4.4 Software Interfaces

### 4.4.1 Browser Requirements

| Browser | Minimum Version |
|---------|-----------------|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Apple Safari | 14+ |
| Microsoft Edge | 90+ |

### 4.4.2 Runtime Dependencies

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18.x+ | Backend runtime |
| npm | 9.x+ | Package management |
| Express.js | 4.18+ | Web framework |
| React | 18.2+ | Frontend framework |
| Vite | 5.0+ | Frontend build tool |

## 4.5 Communication Interfaces

### 4.5.1 HTTP Communication

| Attribute | Specification |
|-----------|---------------|
| Protocol | HTTP/1.1, HTTP/2 |
| Security | TLS 1.2+ (production) |
| Content-Type | application/json |
| Character Encoding | UTF-8 |

### 4.5.2 CORS Configuration

| Setting | Value |
|---------|-------|
| Allowed Origins | http://localhost:5173 (development) |
| Allowed Methods | GET, POST, PUT, DELETE, OPTIONS |
| Allowed Headers | Content-Type, Authorization |
| Credentials | true |

---

# 5. Non-Functional Requirements

## 5.1 Performance Requirements

### 5.1.1 Response Time

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page Load | < 2 seconds | 5 seconds |
| API Response (simple) | < 200 ms | 500 ms |
| API Response (complex) | < 500 ms | 1 second |
| Search Results | < 1 second | 2 seconds |
| Form Submission | < 500 ms | 1 second |

### 5.1.2 Throughput

| Metric | Requirement |
|--------|-------------|
| Concurrent Users | Support 10+ simultaneous users |
| API Requests | Handle 100 requests/minute |
| Data Records | Support 1000+ patient records |

### 5.1.3 Resource Utilization

| Resource | Limit |
|----------|-------|
| Server Memory | < 512 MB |
| Client Memory | < 200 MB |
| Network Bandwidth | < 1 MB/page load |

## 5.2 Safety Requirements

| ID | Requirement |
|----|-------------|
| SAF-001 | System shall not allow data corruption during concurrent access |
| SAF-002 | System shall prevent accidental data deletion (soft delete only) |
| SAF-003 | System shall validate all inputs to prevent injection attacks |
| SAF-004 | System shall timeout inactive sessions after 24 hours |

## 5.3 Security Requirements

### 5.3.1 Authentication

| ID | Requirement |
|----|-------------|
| SEC-AUTH-001 | Passwords shall be hashed using bcrypt |
| SEC-AUTH-002 | JWT tokens shall expire after 24 hours |
| SEC-AUTH-003 | Failed login attempts shall return generic error |
| SEC-AUTH-004 | Tokens shall be transmitted via Authorization header |

### 5.3.2 Authorization

| ID | Requirement |
|----|-------------|
| SEC-AUTHZ-001 | All API endpoints shall verify user authentication |
| SEC-AUTHZ-002 | Role-based access control shall be enforced |
| SEC-AUTHZ-003 | Users shall only access data within their permission scope |

### 5.3.3 Data Protection

| ID | Requirement |
|----|-------------|
| SEC-DATA-001 | All API communication shall use HTTPS (production) |
| SEC-DATA-002 | Sensitive data shall not be logged |
| SEC-DATA-003 | Error messages shall not expose system internals |
| SEC-DATA-004 | SQL/NoSQL injection shall be prevented |
| SEC-DATA-005 | XSS attacks shall be prevented |

### 5.3.4 Audit Trail

| ID | Requirement |
|----|-------------|
| SEC-AUDIT-001 | All data access shall be logged (future enhancement) |
| SEC-AUDIT-002 | All data modifications shall be logged |
| SEC-AUDIT-003 | Logs shall include user ID, timestamp, action, resource |
| SEC-AUDIT-004 | Audit logs shall be immutable |

## 5.4 Software Quality Attributes

### 5.4.1 Availability

| Metric | Target |
|--------|--------|
| System Uptime | 99% during demo |
| Recovery Time | < 1 minute (restart) |

### 5.4.2 Maintainability

| Attribute | Requirement |
|-----------|-------------|
| Code Organization | Modular architecture with separation of concerns |
| Documentation | Inline code comments for complex logic |
| Naming Conventions | Consistent naming across codebase |
| Error Handling | Centralized error handling |

### 5.4.3 Usability

| ID | Requirement |
|----|-------------|
| USA-001 | New users shall be able to perform basic tasks within 5 minutes |
| USA-002 | Error messages shall be clear and actionable |
| USA-003 | Forms shall provide real-time validation feedback |
| USA-004 | Navigation shall be intuitive and consistent |
| USA-005 | System shall be accessible via keyboard navigation |

### 5.4.4 Scalability

| Attribute | Current | Future |
|-----------|---------|--------|
| Database | JSON files | PostgreSQL |
| Users | 10 concurrent | 1000+ concurrent |
| Records | 1000 patients | 100,000+ patients |
| Architecture | Single server | Microservices |

### 5.4.5 Portability

| Requirement | Description |
|-------------|-------------|
| Browser Independence | Works on all modern browsers |
| Platform Independence | Runs on Windows, macOS, Linux |
| Container Ready | Can be containerized (Docker) |

## 5.5 Business Rules

### 5.5.1 Patient Rules

| ID | Rule |
|----|------|
| BR-PAT-001 | MRN shall be unique and auto-generated |
| BR-PAT-002 | MRN cannot be modified after creation |
| BR-PAT-003 | Date of birth cannot be a future date |
| BR-PAT-004 | Patient records cannot be permanently deleted |
| BR-PAT-005 | Duplicate check: warn if same name + DOB exists |

### 5.5.2 Appointment Rules

| ID | Rule |
|----|------|
| BR-APT-001 | Provider cannot have overlapping appointments |
| BR-APT-002 | Appointments cannot be scheduled in the past |
| BR-APT-003 | Minimum appointment duration is 15 minutes |
| BR-APT-004 | Maximum appointment duration is 240 minutes |
| BR-APT-005 | Cancelled appointments free up the time slot |
| BR-APT-006 | COMPLETED appointments cannot be modified |

### 5.5.3 Authorization Rules

| ID | Rule |
|----|------|
| BR-AUTH-001 | Only DOCTOR and ADMIN can prescribe medications |
| BR-AUTH-002 | Only ADMIN can deactivate patients |
| BR-AUTH-003 | Only ADMIN can view audit logs |
| BR-AUTH-004 | All authenticated users can view patient list |

---

# 6. Data Requirements

## 6.1 Logical Data Model

### 6.1.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │      USER       │                                                        │
│  ├─────────────────┤                                                        │
│  │ PK  id          │                                                        │
│  │     email       │                                                        │
│  │     password    │                                                        │
│  │     name        │                                                        │
│  │     role        │                                                        │
│  │     createdAt   │                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │     PATIENT     │         │   APPOINTMENT   │                           │
│  ├─────────────────┤         ├─────────────────┤                           │
│  │ PK  id          │────┐    │ PK  id          │                           │
│  │ UK  mrn         │    │    │ FK  patientId   │───┐                       │
│  │     firstName   │    │    │     providerId  │   │                       │
│  │     lastName    │    │    │     dateTime    │   │                       │
│  │     dateOfBirth │    │    │     duration    │   │                       │
│  │     gender      │    │    │     type        │   │                       │
│  │     email       │    │    │     status      │   │                       │
│  │     phone       │    │    │     notes       │   │                       │
│  │     address     │    │    │     createdAt   │   │                       │
│  │     bloodType   │    │    └─────────────────┘   │                       │
│  │     allergies[] │    │                          │                       │
│  │     isActive    │    │    ┌─────────────────┐   │                       │
│  │     createdAt   │    │    │   LAB_RESULT    │   │                       │
│  └─────────────────┘    │    ├─────────────────┤   │                       │
│           │             │    │ PK  id          │   │                       │
│           │             └────│ FK  patientId   │───┤                       │
│           │                  │     testName    │   │                       │
│           │                  │     testCode    │   │                       │
│           │                  │     result      │   │                       │
│           │                  │     unit        │   │                       │
│           │                  │     normalRange │   │                       │
│           │                  │     status      │   │                       │
│           │                  │     orderedBy   │   │                       │
│           │                  │     createdAt   │   │                       │
│           │                  └─────────────────┘   │                       │
│           │                                        │                       │
│           │                  ┌─────────────────┐   │                       │
│           │                  │   MEDICATION    │   │                       │
│           │                  ├─────────────────┤   │                       │
│           │                  │ PK  id          │   │                       │
│           └──────────────────│ FK  patientId   │───┘                       │
│                              │     name        │                           │
│                              │     dosage      │                           │
│                              │     frequency   │                           │
│                              │     route       │                           │
│                              │     prescribedBy│                           │
│                              │     startDate   │                           │
│                              │     endDate     │                           │
│                              │     status      │                           │
│                              │     createdAt   │                           │
│                              └─────────────────┘                           │
│                                                                              │
│  LEGEND:                                                                     │
│  PK = Primary Key                                                           │
│  FK = Foreign Key                                                           │
│  UK = Unique Key                                                            │
│  ─────── = One-to-Many Relationship                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Data Dictionary

### 6.2.1 User Entity

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | String (UUID) | PK, NOT NULL | Unique identifier |
| email | String | UNIQUE, NOT NULL | User email address |
| password | String | NOT NULL | Bcrypt hashed password |
| name | String | NOT NULL | Full name |
| role | Enum | NOT NULL | ADMIN, DOCTOR, NURSE, STAFF |
| createdAt | DateTime | NOT NULL | Account creation timestamp |

### 6.2.2 Patient Entity

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | String (UUID) | PK, NOT NULL | Unique identifier |
| mrn | String | UNIQUE, NOT NULL | Medical Record Number |
| firstName | String | NOT NULL | Patient first name |
| lastName | String | NOT NULL | Patient last name |
| dateOfBirth | Date | NOT NULL | Patient date of birth |
| gender | Enum | NOT NULL | MALE, FEMALE, OTHER |
| email | String | NULL | Email address |
| phone | String | NULL | Phone number |
| address | String | NULL | Full address |
| bloodType | String | NULL | Blood type (A+, O-, etc.) |
| allergies | Array[String] | NULL | List of known allergies |
| isActive | Boolean | NOT NULL, DEFAULT true | Soft delete flag |
| createdAt | DateTime | NOT NULL | Record creation timestamp |

### 6.2.3 Appointment Entity

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | String (UUID) | PK, NOT NULL | Unique identifier |
| patientId | String (UUID) | FK, NOT NULL | Reference to Patient |
| providerId | String | NOT NULL | Provider identifier |
| dateTime | DateTime | NOT NULL | Appointment date and time |
| duration | Integer | NOT NULL, DEFAULT 30 | Duration in minutes |
| type | Enum | NOT NULL | CHECKUP, FOLLOW_UP, CONSULTATION, PROCEDURE, EMERGENCY |
| status | Enum | NOT NULL, DEFAULT SCHEDULED | SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| notes | String | NULL | Additional notes |
| createdAt | DateTime | NOT NULL | Record creation timestamp |

### 6.2.4 LabResult Entity

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | String (UUID) | PK, NOT NULL | Unique identifier |
| patientId | String (UUID) | FK, NOT NULL | Reference to Patient |
| testName | String | NOT NULL | Name of the test |
| testCode | String | NOT NULL | LOINC code |
| result | String | NULL | Test result value |
| unit | String | NULL | Unit of measurement |
| normalRange | String | NULL | Normal reference range |
| isAbnormal | Boolean | NULL | Flag for abnormal results |
| status | Enum | NOT NULL | PENDING, IN_PROGRESS, COMPLETED |
| orderedBy | String | NOT NULL | Ordering provider ID |
| orderedAt | DateTime | NOT NULL | Order timestamp |
| resultedAt | DateTime | NULL | Result timestamp |
| createdAt | DateTime | NOT NULL | Record creation timestamp |

### 6.2.5 Medication Entity

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | String (UUID) | PK, NOT NULL | Unique identifier |
| patientId | String (UUID) | FK, NOT NULL | Reference to Patient |
| name | String | NOT NULL | Medication name |
| dosage | String | NOT NULL | Dosage amount |
| frequency | String | NOT NULL | Dosing frequency |
| route | String | NOT NULL | Administration route |
| prescribedBy | String | NOT NULL | Prescribing provider ID |
| startDate | Date | NOT NULL | Start date |
| endDate | Date | NULL | End date |
| status | Enum | NOT NULL | ACTIVE, COMPLETED, DISCONTINUED, ON_HOLD |
| notes | String | NULL | Additional instructions |
| createdAt | DateTime | NOT NULL | Record creation timestamp |

## 6.3 Data Validation Rules

### 6.3.1 Input Validation

| Field | Validation Rule |
|-------|-----------------|
| Email | Must match email regex pattern |
| Password | Minimum 6 characters |
| Name | 1-100 characters, alphanumeric with spaces |
| Date of Birth | Must be valid date, not in future, after 1900-01-01 |
| Phone | Optional, must match phone pattern if provided |
| MRN | Auto-generated, cannot be user-input |
| Duration | Integer between 15 and 240 |

### 6.3.2 Referential Integrity

| Constraint | Description |
|------------|-------------|
| Appointment.patientId | Must reference existing active Patient |
| LabResult.patientId | Must reference existing Patient |
| Medication.patientId | Must reference existing Patient |

---

# 7. System Models

## 7.1 Use Case Diagrams

### 7.1.1 System Use Case Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USE CASE DIAGRAM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌─────────────────────────┐                         │
│                         │   MedRecord EHR System  │                         │
│                         └─────────────────────────┘                         │
│                                                                              │
│    👤 Staff                        │                        👨‍⚕️ Doctor      │
│       │                            │                            │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       ├───►│   Register Patient   │││   View Patient       │◄──┤           │
│       │    └──────────────────────┘│└──────────────────────┘   │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       ├───►│   Search Patients    │││   Order Lab Tests    │◄──┤           │
│       │    └──────────────────────┘│└──────────────────────┘   │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       ├───►│   Book Appointment   │││ Prescribe Medication │◄──┤           │
│       │    └──────────────────────┘│└──────────────────────┘   │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       └───►│   Update Patient     │││   View Lab Results   │◄──┘           │
│            └──────────────────────┘│└──────────────────────┘               │
│                                    │                                        │
│    👩‍⚕️ Nurse                       │                        👨‍💼 Admin       │
│       │                            │                            │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       ├───►│   Record Vitals      │││   Manage Users       │◄──┤           │
│       │    └──────────────────────┘│└──────────────────────┘   │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       ├───►│   View Appointments  │││   View Audit Logs    │◄──┤           │
│       │    └──────────────────────┘│└──────────────────────┘   │           │
│       │    ┌──────────────────────┐│┌──────────────────────┐   │           │
│       └───►│   Enter Lab Results  │││ Deactivate Patient   │◄──┘           │
│            └──────────────────���───┘│└──────────────────────┘               │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    │       Common Use Cases        │                       │
│                    │   • Login / Logout            │                       │
│                    │   • View Dashboard            │                       │
│                    │   • Update Profile            │                       │
│                    └───────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Sequence Diagrams

### 7.2.1 User Login Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOGIN SEQUENCE DIAGRAM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User          Frontend         Backend           Data Store                │
│   │               │               │                   │                     │
│   │  Enter Creds  │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │               │ POST /login   │                   │                     │
│   │               │──────────────►│                   │                     │
│   │               │               │                   │                     │
│   │               │               │  Find User        │                     │
│   │               │               │──────────────────►│                     │
│   │               │               │                   │                     │
│   │               │               │  User Data        │                     │
│   │               │               │◄──────────────────│                     │
│   │               │               │                   │                     │
│   │               │               │  Verify Password  │                     │
│   │               │               │  Generate JWT     │                     │
│   │               │               │                   │                     │
│   │               │  { token }    │                   │                     │
│   │               │◄──────────────│                   │                     │
│   │               │               │                   │                     │
│   │               │ Store Token   │                   │                     │
│   │               │ localStorage  │                   │                     │
│   │               │               │                   │                     │
│   │  Redirect     │               │                   │                     │
│   │◄──────────────│               │                   │                     │
│   │  /dashboard   │               │                   │                     │
│   │               │               │                   │                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2.2 Create Patient Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CREATE PATIENT SEQUENCE DIAGRAM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User          Frontend         Backend           Data Store                │
│   │               │               │                   │                     │
│   │ Click Add     │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │ Show Modal    │               │                   │                     │
│   │◄──────────────│               │                   │                     │
│   │               │               │                   │                     │
│   │ Fill Form     │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │ Submit        │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │               │ POST /patients│                   │                     │
│   │               │ + JWT Header  │                   │                     │
│   │               │──────────────►│                   │                     │
│   │               │               │                   │                     │
│   │               │               │ Verify Token      │                     │
│   │               │               │ Validate Input    │                     │
│   │               │               │ Generate MRN      │                     │
│   │               │               │                   │                     │
│   │               │               │ Save Patient      │                     │
│   │               │               │──────────────────►│                     │
│   │               │               │                   │                     │
│   │               │               │ Confirmation      │                     │
│   │               │               │◄──────────────────│                     │
│   │               │               │                   │                     │
│   │               │ { patient }   │                   │                     │
│   │               │◄──────────────│                   │                     │
│   │               │               │                   │                     │
│   │               │ Close Modal   │                   │                     │
│   │               │ Refresh List  │                   │                     │
│   │               │               │                   │                     │
│   │ Show Success  │               │                   │                     │
│   │◄──────────────│               │                   │                     │
│   │               │               │                   │                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2.3 Book Appointment Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  BOOK APPOINTMENT SEQUENCE DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User          Frontend         Backend           Data Store                │
│   │               │               │                   │                     │
│   │ Open Modal    │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │               │ GET /patients │                   │                     │
│   │               │──────────────►│                   │                     │
│   │               │               │──────────────────►│                     │
│   │               │               │◄──────────────────│                     │
│   │               │◄──────────────│                   │                     │
│   │               │               │                   │                     │
│   │ Populate      │               │                   │                     │
│   │ Patient List  │               │                   │                     │
│   │◄──────────────│               │                   │                     │
│   │               │               │                   │                     │
│   │ Select Patient│               │                   │                     │
│   │ Select Time   │               │                   │                     │
│   │ Select Type   │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │ Submit        │               │                   │                     │
│   │──────────────►│               │                   │                     │
│   │               │               │                   │                     │
│   │               │POST /appts    │                   │                     │
│   │               │──────────────►│                   │                     │
│   │               │               │                   │                     │
│   │               │               │ Check Conflicts   │                     │
│   │               │               │──────────────────►│                     │
│   │               │               │◄──────────────────│                     │
│   │               │               │                   │                     │
│   │               │               │ [No Conflict]     │                     │
│   │               │               │ Save Appointment  │                     │
│   │               │               │──────────────────►│                     │
│   │               │               │◄──────────────────│                     │
│   │               │               │                   │                     │
│   │               │ { appointment}│                   │                     │
│   │               │◄──────────────│                   │                     │
│   │               │               │                   │                     │
│   │ Show Success  │               │                   │                     │
│   │◄─────────��────│               │                   │                     │
│   │               │               │                   │                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7.3 State Diagrams

### 7.3.1 Appointment State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT STATE DIAGRAM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              [Create]                                        │
│                                 │                                            │
│                                 ▼                                            │
│                          ┌───────────┐                                      │
│                          │ SCHEDULED │                                      │
│                          └─────┬─────┘                                      │
│                                │                                            │
│              ┌─────────────────┼─────────────────┐                          │
│              │                 │                 │                          │
│        [Confirm](#)
