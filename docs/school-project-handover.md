# Hallaton school website and portals: evening handover

**Handover:** 8 November 2026

**Status:** working proof of concept, not approved for production or real pupil data.

This note records work completed across the current session and the work to assess next. It is not a security certification, GDPR assessment, completed deployment, or a commitment to launch.

## What has been built

### Public website

- A responsive Next.js website styled with reference to the existing school website, including the school logo, dropdown menus and locally routed school pages. Direct PDF links may still point to the existing website. Existing content is a demonstration summary, **not a complete or verified migration**.
- School information and report link settings, news and newsletter entries, a grants-thanks section, and a scheduled image popup. The example popup illustration depicts fictional children.
- Staff can edit many headings, paragraphs, document links, navigation menus, class cards, related links, school identity, contact wording, social links and selected images. Homepage sections can be reordered or hidden. Page drafts, menus, popup and related settings can be previewed privately; an administrator publishes selected drafts with conflict checks.
- News, event summaries and report links have separate publication controls. Events are **private by default**; staff can publish a separate limited summary, while invitations, RSVP, meeting details and pupil lists remain private.

### Staff and family portals

- Separate `/staff` and `/parent` sign-in and dashboard routes, backed by role-based accounts. Administrators can create accounts and link multiple parent accounts to a pupil.
- Staff features include student profiles and contacts, class learning and homework, news, newsletters, invitations, social-media consent, enquiries and a role-restricted safeguarding register. Sensitive profile, enquiry and safeguarding content is encrypted in parts of the application; not all associated metadata is encrypted.
- Parent accounts can view linked-pupil names and class, learning, invitations and shared correspondence. Staff must explicitly share correspondence with linked parents.
- The website contact form stores enquiries and associates them with a prospective contact by email. Staff can link correspondence to a pupil later. The email match is not verified, and the form does **not** create a parent account. Email delivery and capture of external email are not connected.
- The administrator audit trail can be filtered by pupil and records before/after **public website text** for instrumented changes. Historical entries cannot be reconstructed; private safeguarding, pupil and enquiry text is not copied into that general history. Automatic website snapshot restoration was removed at the user's request; older snapshot records remain in the database. Neither the audit nor historical snapshots replace independent backups.

### Meals and mobile

- Staff can configure a meal period, daily price and school-controlled deadline using UK local time, including clock changes. Families can select recurring meal days and report packed lunches for individual days. Staff see menu-day counts and reported packed-lunch pupils.
- A named, revocable caterer API credential can read and update menus only; it is not a contractor portal and does not provide pupil details. There is no identified external catering integration.
- `mobile/` contains an Expo iOS/Android **webview shell** for the existing authenticated family portal. JavaScript bundles were generated for both platforms. It is not a fully native interface, is not signed or store-published, and has not been tested on iOS or Android devices.

### Working demo and checks

- The current isolated Windows worktree has run the demo at `http://localhost:3002`, bound to loopback. A separate WSL copy may be older; do not overwrite it. See `README.md` for local setup, demo access and DuckDNS/Caddy instructions.
- The application has passed a production build, lint, focused website and meal tests, and an isolated-demo HTTP test for parent linking, concurrent choices and caterer access. This is not a substitute for end-to-end acceptance, security or accessibility testing.
- The database used for this work is a separate local demonstration database. No hosting provider, DNS, production certificate, automated backup, live CI/CD pipeline or production release has been configured.

## Tomorrow's assessment and outstanding work

### 1. Complete website editing and content

- [ ] Design a **block-based page editor** for all public pages, using approved templates informed by the original school's site. Allow staff to add, delete, duplicate and move sections up/down; choose text-only, image-left, image-right and other approved layouts; edit image alt text, text alignment and formatting such as bold. Keep semantic headings, keyboard access, responsive layout and a safe structured content model; do not allow arbitrary unsafe HTML or scripts.
- [ ] Support uploads/asset selection with permissions, consent, image size controls, virus scanning as appropriate, and predictable storage. Define which template styles, colours and fonts the school can change without compromising branding or contrast.
- [ ] Extend draft, cross-page preview, publication conflict checks and full administrator-readable before/after audit to all new blocks, layout changes, navigation and assets. Review image audit metadata and ensure private content is never copied into public-content history.
- [ ] Identify and remove remaining hard-coded visual, utility, accessibility, page and footer elements; decide whether template-level components and statutory content should be locked or editable. A hidden homepage section may still be reachable elsewhere.
- [ ] Verify and migrate every required page, images, documents, navigation, contact details, school day, term dates, admissions, SEND, Ofsted/SIAMS, KS2 and premium information with the school. Confirm permission to use the logo, photography and source content, and identify any external links or assets that must be migrated.

### 2. Family, safeguarding and meals

- [ ] Review all permissions, active-account and revocation behaviour, parent-pupil links, audited actions, staff workflow and safeguarding separation. Test multiple parents, account recovery, accessibility and concurrent updates; agree what parents should be able to view or edit.
- [ ] Decide whether and how to integrate email and notifications, verify sender identities, link external correspondence and notify staff safely. There is currently no email delivery or automatic ingestion.
- [ ] Review the meal workflow with the school and caterer: school dates/holidays and absences, price changes, eligibility, allergens and dietary needs, confirmation and payment, reporting and retention. Current counts are planning figures, not a medical-safety, attendance, billing or payment system.
- [ ] Assess a restricted **contractor login** if the caterer needs a browser UI; the current API is an alternative, not a login. Specify provider contract, credential rotation/revocation, rate limits, audit and data minimisation before integration.
- [ ] Decide whether the webview shell meets the requirement or a native React Native app is needed. Complete appropriate login/security review and iOS/Android device testing, then configure app identity, signing, Apple/Google developer accounts and distribution; assess push, offline use and accessibility. No store release exists.

### 3. Privacy, security and safeguarding: release blockers

- [ ] Obtain school/DPO and safeguarding-lead approval of privacy notices, lawful bases, processing agreements, data classification and a DPIA where required; define subject-rights handling, incident response, access reviews, retention, legal holds and secure deletion including backups.
- [ ] Threat-model the system and conduct an independent, scoped penetration test before launch and after significant changes; repeat at least annually or on a risk-based schedule. Track findings, retest fixes and assign owners. Include authentication, session revocation, authorisation/IDOR, school/caterer APIs, uploads, webhooks, injection/XSS/CSRF, configuration, privacy and infrastructure.
- [ ] Implement and verify MFA for privileged accounts, strong account recovery, login and API rate limiting, spam/bot protection, session controls, secure cookies and headers, secret management/rotation, least-privilege service identities, dependency patching, monitoring and incident alerts. Security review must include **all** existing endpoints, not just newly added ones.
- [ ] Validate file upload security, malicious-content handling, bucket privacy and asset permissions. Confirm encrypted data can be recovered with managed keys. Obtain school approval of all safeguarding and public event policies.
- [ ] Do not use actual pupil or sensitive data in a publicly reachable demo. Change demo credentials and use a separate restricted environment; HTTPS alone is not sufficient. DuckDNS and a home router are temporary demo options, not the recommended production platform.

### 4. Deployment recommendation and recovery

**Recommended starting point:** a managed container hosting service in a UK region, managed PostgreSQL with private networking and point-in-time recovery, private S3-compatible object storage, and a managed secrets/key service. One option to evaluate is Azure Container Apps + Azure Database for PostgreSQL + private Azure Blob storage behind a compatible adapter; the current upload code uses S3, so native Blob requires an adapter/change. An alternative is an AWS UK-region stack with a managed container service, RDS PostgreSQL and S3. Select after comparing the school's existing contracts, DPA/subprocessor terms, UK data residency, support, capacity, resilience and total monthly cost. No provider suitability or price has yet been verified.

Use separate demo, staging and production accounts/projects and databases, with isolated credentials. Prefer a school-owned domain, managed DNS and automatically renewed HTTPS certificates at the managed ingress; keep PostgreSQL and object storage private. Apply WAF/rate limits and security headers; restrict administrator access, logs and network egress as appropriate. Do not expose port 3002 or PostgreSQL to the internet. Set `NEXTAUTH_URL` to the canonical HTTPS origin, protect secrets in the provider's secret manager, and keep the encryption key stable and separately recoverable. Define cost alerts, uptime checks and an on-call owner.

**Backup and recovery proposal, subject to school approval:** managed encrypted PostgreSQL backups and point-in-time recovery plus independent encrypted copies in a separate account; object-storage versioning and backup for uploaded files, immutable/off-site copies where appropriate, and a separately protected encryption-key recovery process. Agree retention, legal holds, deletion, RPO/RTO and budget with the school; for initial planning consider a 24-hour RPO and 4-hour RTO, not as guarantees. Test restoration into an isolated environment before launch and at least quarterly, including database, object assets, keys and application configuration. Document who can initiate restoration, audit access, and rehearse a partial data recovery so pupil records and audit history are not casually overwritten. Application-level audit is not a backup.

### 5. CI/CD and portability — to build, not yet implemented

- [ ] Add a reproducible container build and a pinned supported Node version, plus dependency lockfiles and environment-variable documentation. Avoid provider-specific assumptions in the application and define a provider adapter for infrastructure/storage as needed.
- [ ] Create GitHub Actions (or an agreed CI provider) for pull requests: install from lockfile, lint, type-check, unit tests, isolated PostgreSQL integration tests, application build, mobile bundle checks, dependency/secret scanning and container/image checks. Never run destructive tests against production or share real pupil data with CI.
- [ ] Build one versioned, immutable artefact; publish it to an approved registry with provenance. Deploy that same artefact to staging and, after review/approval and smoke tests, production using provider-specific adapters or infrastructure-as-code. Use short-lived OIDC credentials where supported and protected environments; do not store long-lived production credentials in workflow files.
- [ ] Run Prisma migrations once per release as a controlled, backward-compatible step; test migration and recovery on staging, take/verify backups beforehand, and document rollback/roll-forward (rolling back an app image does not reverse database changes). Include health checks, alerts and a failure stop.
- [ ] Specify release approvals, branch protection, dependency updates, test ownership and a documented re-deployment/runbook. Test restore and redeployment on a second target before claiming portability to another platform.

## Suggested agenda for tomorrow

1. Agree the demonstration scope, school stakeholders and factual/content approval process.
2. Review editor templates and mobile-app scope; prioritise the outstanding user journeys.
3. Choose an owner and provisional hosting architecture; confirm budget, UK data requirements and processor terms.
4. Agree DPO/safeguarding review, penetration-test scope, backup objectives and the production release gates.
5. Prioritise CI/CD and implementation work, estimate effort, and assign owners and dates.

## References and files

- Technical setup, demo guidance, known limitations and API details: `README.md`.
- Website editor and publishing: `components/website-page-settings.tsx`, `components/navigation-editor.tsx`, `lib/website-publish.ts`.
- Meals: `components/meal-planner.tsx`, `app/api/parent/meals/route.ts`, `app/api/staff/meals/route.ts`, `app/api/caterer/menus/route.ts`.
- Mobile shell: `mobile/`.
- DfE: [data protection in schools: record keeping](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management).
- ICO: [storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/).
- NCSC: [small organisation cyber security guidance](https://www.ncsc.gov.uk/collection/small-business-guide).
