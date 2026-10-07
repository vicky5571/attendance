# Diagnostic & Architecture Audit — [Subsystem / Feature Name]

**Target View / Module:** `[File path / Component path]`  
**Scope Files:**
- `[File 1]` (Lines count, description)
- `[File 2]` (Lines count, description)
**Audit Date:** YYYY-MM-DD  
**Overall Verdict:** [Concise 2-3 sentence executive assessment]

---

## 1. Executive Summary & Defect Scorecard

| Priority | Category | Finding | Impact | Reference |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | Architecture / Resilience | [Critical flaw description] | [Operational impact] | `Path:LineRange` |
| **P1** | Domain Integrity / Data | [Data error or missing state] | [User/Business impact]| `Path:LineRange` |
| **P2** | Performance / Layout | [Layout trap or memory leak]  | [Rendering penalty]   | `Path:LineRange` |
| **P3** | Code Quality / DRY | [Ad-hoc helper or duplicate]  | [Maintainability tax] | `Path:LineRange` |

---

## 2. Layout Cascade & Viewport Architecture (For UI modules)

```text
div.flex.h-screen.w-screen.overflow-hidden
└─ main.flex-1.flex.flex-col.h-full.overflow-hidden
   └─ div.flex-1.overflow-hidden.relative
      └─ div.flex-1.overflow-auto.p-6    🔴 [Identified Break/Trap]
```

---

## 3. Remediation Roadmap (Strictly Differentiated by Branch)

### Track A: Backend Remediation (`branch: vicky`)
- **Phase 1A: Database, Schema & APIs** (`YYYY-MM-DD-phase-1a-backend-*.md`)
- **Phase 2A: Background Automation & Notifications** (`YYYY-MM-DD-phase-2a-backend-*.md`)

### Track B: Frontend Remediation (`branch: zacky`)
- **Phase 1B: UI/UX & Responsive Layout** (`YYYY-MM-DD-phase-1b-frontend-*.md`)
- **Phase 2B: PWA Capabilities & Client Geolocation** (`YYYY-MM-DD-phase-2b-frontend-*.md`)
