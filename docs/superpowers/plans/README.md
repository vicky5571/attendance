# Implementation Plans Directory

All multi-step coding initiatives must have a designated plan file following this format:
File naming convention: `YYYY-MM-DD-<feature-or-phase-name>.md`

## Required Plan Structure
1. **Header**: Goal, Architecture overview, Tech Stack, Spec Reference.
2. **Branch Scoping & Role Isolation**: Identify whether tasks apply to `zacky` (Front-End) or `vicky` (Back-End).
3. **Global Constraints**: Uncompromising rules (SSOT, God-file limits, Testing requirements).
4. **File Structure Diff**:
   - `Modify: path/to/file.ts`
   - `Create: path/to/newComponent.tsx`
   - `Test: path/to/target.test.ts`
5. **Granular Tasks (Strictly Divided by Track)**:
   - Must be split into:
     - `### Track A: [BACKEND / branch: vicky]` (DB schemas, APIs, Baileys, Nodemailer, Cron)
     - `### Track B: [FRONTEND / branch: zacky]` (UI components, PWA manifest, Client GPS, styles)
   - Use `- [ ]` markdown checkboxes.
   - Every task MUST contain explicit code diffs or pre-written test snippets.
   - Explicit steps:
     - `Step 1: Write the failing test`
     - `Step 2: Implement minimum passing code`
     - `Step 3: Run verification command (npm run test:fast <path>) and paste terminal proof`
