# Fictional school portal: demonstration and testing guide

| Version | Date | Change |
|---|---|---|
| 1.0 | 8 November 2026 | Initial showcase accounts, fictional pupils and Uppingham draft event scenarios. |

This file is tracked in Git. Update this table when scenarios change and use Git history to review earlier versions.

**Demo only:** all names, pupils, school activity, sports and visits below are invented. The Uppingham examples are not real events, venues, bookings or arrangements. Never enter real pupil, safeguarding or family information into the demonstration. These accounts use one shared temporary password and must never be exposed on the public internet. The prototype is not production-ready.

## What is prepared

Run the showcase seed only in the isolated local PostgreSQL database named `hallaton_copilot_demo`. It creates these separate accounts, all with the password supplied at seeding time:

| Email | Portal | Demonstrates |
|---|---|---|
| `admin@showcase.example.test` | Staff | Administrator, account access, approving and publishing |
| `maple@showcase.example.test` | Staff | Maple teacher **and** sports coordinator |
| `oak@showcase.example.test` | Staff | Oak teacher without sports access |
| `lead@showcase.example.test` | Staff | Safeguarding lead |
| `parent-maple@showcase.example.test` | Parent | Family linked to Avery in Maple |
| `parent-maple-second@showcase.example.test` | Parent | A second parent linked to Avery |
| `parent-oak@showcase.example.test` | Parent | Family linked to Robin in Oak |

The password for this session's local demo is stored in the session's private `files\showcase-login.txt` file, not in this repository or Git. Open that file locally to view it; its absolute path is provided in the handover message. Do not share it publicly. A fresh installation needs its own password as below.

## Set up a fresh local demonstration

1. Follow `README.md` to install dependencies, configure `.env` or `.env.local` and apply migrations. Point `DATABASE_URL` to a **separate local** database called `hallaton_copilot_demo`; configure a local `DATA_ENCRYPTION_KEY` and `NEXTAUTH_SECRET`. Never use a real school or remote database.
2. Select a unique, temporary demo password of at least 14 characters and at most 72 UTF-8 bytes. Keep it private and do not put it in Git or a shared terminal log.
3. From the project directory in WSL, set the two environment variables and seed:

   ```bash
   read -rs -p "Temporary showcase password: " DEMO_PASSWORD; echo
   export DEMO_PASSWORD CONFIRM_DEMO_SEED=fictional-data-only
   npm run db:seed-demo
   npm run db:seed-demo-meals
   unset DEMO_PASSWORD CONFIRM_DEMO_SEED
   ```

   In PowerShell, set `$env:DEMO_PASSWORD` to the chosen value and `$env:CONFIRM_DEMO_SEED = 'fictional-data-only'`, run both commands, then remove both environment variables. The scripts refuse remote hosts or other database names. Each seed runs in a transaction. If a showcase seed marker already exists it makes no changes, including to passwords or approved events; use a **new isolated database** for a clean run. The optional meal seed does not alter existing meal settings or overwrite existing menus. Neither script resets or deletes other records.
4. Start the application and open the correct origin, for example `http://localhost:3002/staff/sign-in` and `http://localhost:3002/parent/sign-in`. Other local copies or ports may have different code and databases. Sign out between accounts, or use separate private browser windows.

## Step-by-step scenarios

1. **Administrator and permissions.** Sign in as the showcase administrator. Under **Accounts**, choose **Edit staff access** on Demo Maple Teacher. Maple has Maple assigned and **Sports event coordinator** selected. Oak has Oak assigned without sports. A teacher can also be given safeguarding-lead access here; assigning it gives access to confidential safeguarding records. Changes take effect on subsequent requests.
2. **Class and curriculum restrictions.** Sign in as Maple. Under **Class learning**, Maple and Avery are available; Oak and Robin must not be available for curriculum feedback or class updates. Maple can create private curriculum feedback on Avery. The sports role does not grant curriculum or private-profile access to Oak. Sign in as Oak to confirm the reverse. Server-side checks also reject attempts to submit another class's pupil ID.
3. **Families and shared child.** Sign in as each Maple parent at `/parent/sign-in`: both are linked to Avery and can see the approved private **Demo Maple family afternoon** invitation. The Oak parent sees Robin, not Avery. Parents do not see staff-only curriculum or sports feedback. Responding to an invitation changes only that parent's RSVP; emails are not sent.
4. **Safeguarding.** Sign in as Maple and use **Safeguarding** to report a fictional concern for any pupil, including Robin. The pre-created fictional record is visible to the safeguarding lead's restricted register; its details can be opened by the lead. Do not enter real information. Staff without lead access cannot open confidential details. The audit trail records relevant accesses.
5. **Sports event draft and cross-class invitations.** Sign in as Maple and open **News & events**. The pre-created **Demo Uppingham sports afternoon** is a private draft with Avery and Robin selected. Maple can create sports events for pupils across classes because sports access is enabled, but cannot invite Robin to a general event using that capability. Before administrator approval, neither parent sees this invitation.
6. **Administrator review and family approval.** Sign in as the administrator. Under **News & events**, review the sports draft's fictional description, meeting/gear information and invited pupils, then select **Approve event and invitations**. Approval makes the private invitation visible to both Maple parents and the Oak parent. It does **not** make the event public. To see the unapproved behaviour again, use the separate **Demo Uppingham arts visit** draft, or create a new fictional staff draft. Approvals are not undone by rerunning the seed.
7. **Public publication is separate.** In **News & events**, use **Publish an event summary** for the approved sports event; enter or review a separate fictional public title and summary and publish. Check the public homepage for that summary. The public listing must not contain pupil names, RSVP, private meeting details or the gear list. Alternatively use **Publish website drafts** after approval. The **Demo school celebration** is already public and the Maple family afternoon remains private. Check the public page with a signed-out browser.
8. **Private sports feedback.** After sports approval, sign in as Maple and use **News & events → Private event feedback** to save fictional feedback for Robin, who is invited. An administrator or sports coordinator can view it; parents and a teacher without sports access cannot. This is separate from curriculum feedback. Do not record safeguarding concerns here.
9. **General draft publication.** The **Demo school news** announcement is initially a draft. The administrator can review its full text in **News & events** before choosing **Publish**. Teachers cannot publish. Verify the result in a signed-out browser.
10. **Audit.** As administrator open **Audit trail** and filter by Avery or Robin. Actions from the walkthrough appear where instrumented, without copying private feedback text into the general log. Safeguarding audit entries are restricted to safeguarding leads. Audit is not a complete security log or backup.
11. **Meals.** If the isolated database had no meal settings, the meal seed creates a future two-week period with five fictional menus and an example price. A parent can choose recurring days before the period deadline and then report a packed lunch before the day's cutoff. Staff can inspect menu counts. The numbers and meals are illustrative, not actual menus or prices; allergens, eligibility and payments are not handled.

## Automated checks

From the project directory, with the demonstration server running on `127.0.0.1:3002` and its database configured as above:

```bash
npm run typecheck
npm run lint
RUN_STAFF_HTTP_TESTS=1 npx tsx --test tests/staff-access-integration.test.ts
```

The HTTP test creates uniquely named temporary records, checks class/sports permissions, approval, parent visibility, confidential access and revocation, then removes only its own test records. It refuses to run on a database with a different name. A passing test does not replace school acceptance, safeguarding, privacy, accessibility and independent security testing.
