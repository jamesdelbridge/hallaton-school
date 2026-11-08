# Hallaton Church of England Primary School

Responsive Next.js App Router website and private school workspace. The public site intentionally uses clearly labelled placeholders for school facts, contact details, reports, dates, and official links that have not been verified. Replace those placeholders with school-approved information before launch.

The public header, footer and class cards initially load school images from the existing website. School navigation and legacy school-site newsletter links use local routes for testing; direct PDF links remain external. Menu pages contain original demonstration summaries based on the existing website, not a complete migration of its documents or content; they must be checked and approved by the school. Links to other services such as Instagram remain external.

The contact form saves an encrypted message and a prospective contact identified by email. Email matches are unverified: staff must link enquiries to pupils manually, including messages received before enrolment. Staff can separately approve sharing an entire message with individual parents linked to each pupil; removing the parent-pupil link revokes the share. Parents see only messages explicitly shared with their account. The form never creates an account or verifies the sender.

Administrators can configure access for teachers and safeguarding leads, a future notification address, and a retention review interval under **Enquiry settings**. Super-admins always have access. **Email integration is not connected**: the saved address does not send notifications and email sent outside the website is not captured. Staff must check the portal. Enquiry access, linking, review and deletion are audited. Messages and review decisions are encrypted; names, email addresses, metadata and links are not. Record a retention decision before a super-admin deletes an enquiry; deletion removes it and unused contact records from the live database, but not backups. An encrypted deletion justification and latest review remain as an audit record. There is no automatic deletion.

Before production, the school and its data protection officer must approve a privacy notice, lawful bases, access and sharing policies, record classification and retention schedule, including statutory pupil/safeguarding obligations, legal holds, review of audit and deletion logs, backup expiry, secure disposal, subject rights, a data protection impact assessment where required, breach procedures, and contracts with processors. The review interval is not a legal retention period. Configure spam protection, monitoring, secure backups and TLS. These features alone do not establish GDPR compliance. See [DfE record keeping guidance](https://www.gov.uk/guidance/data-protection-in-schools/record-keeping-and-management) and [ICO storage limitation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/).

## Requirements

- Node.js 20+
- PostgreSQL 14+
- A private S3-compatible bucket for staff file uploads

## Local setup

For fictional staff and parent walkthrough accounts, example Uppingham event drafts and the version-controlled test scenarios, see [the demonstration and testing guide](docs/demo-testing.md). These are local-only examples, not real school events.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `DATA_ENCRYPTION_KEY`.
2. Set `DATA_ENCRYPTION_KEY` to a base64-encoded random 32-byte key (for example, `openssl rand -base64 32`). Keep it outside source control and make a secure backup: student and safeguarding records cannot be decrypted without the same key.
3. Install and prepare the database:

   ```sh
   npm install
   npm run db:generate
   npm run db:migrate
   ```

4. Create the first administrator using a temporary environment configuration (do not put a real password in this file):

   ```sh
   ADMIN_NAME="School Administrator" ADMIN_EMAIL="admin@example.org" ADMIN_PASSWORD="use-a-unique-password-of-at-least-14-characters" npm run db:bootstrap-admin
   ```

   PowerShell users can set `$env:ADMIN_NAME`, `$env:ADMIN_EMAIL`, and `$env:ADMIN_PASSWORD` before running the command, then remove those variables after setup. The bootstrap command refuses to create a second super-admin. Super-admins can create teacher, safeguarding-lead and parent accounts inside **Staff portal → Accounts**. Parent accounts can be linked to students when created.

5. Run `npm run dev`. Staff sign in at `/staff/sign-in`; parents sign in at `/parent/sign-in`.

## Roles and data protection

- `SUPER_ADMIN`: staff account and school-content administration.
- `TEACHER`: class learning, student care profiles, school communications, parent event invitations, and safeguarding concern reporting.
- `SAFEGUARDING_LEAD`: confidential concern details and status resolution, with access recorded in the audit log.
- `PARENT`: only linked student names, published weekly learning, and event invitations addressed to their account.

Administrators assign teacher accounts to one or more classes under **Accounts → Edit staff access**. Existing teacher accounts start with no class assignments after the staff-access migration; administrators must explicitly assign them. Assigned classes determine which pupil profiles, consent records, weekly learning and private curriculum feedback teachers can access or change. Administrators may additionally grant the **sports event coordinator** capability: this permits inviting pupils from any class to events categorised as sports and adding private sports-event feedback for invited pupils; it does not grant access to other classes' curriculum or private profiles. The safeguarding-lead capability can also be added to a teacher account; it permits reading and resolving confidential concerns and viewing the safeguarding audit. These capabilities are additive to the account's primary role and take effect on the next request. Staff may report safeguarding concerns for any pupil using the minimal school roster.

Teacher-created events and invitations remain drafts until an administrator reviews and approves them. Approval makes invitations visible to linked parents; publishing an event's limited public summary is a separate administrator decision. Administrator-created events are approved immediately. Sports and curriculum feedback are encrypted, audited and staff-only; they are not shared with families and must not be used for safeguarding concerns. Existing events are marked approved during migration to preserve existing invitations. The sports coordinator capability does not automatically grant access to sensitive pupil profiles outside assigned classes. This prototype still has other role-based staff permissions, including existing website and enquiry functions; a full granular-permission and safeguarding review is required before production.

Safeguarding concern details and emergency, medical and dietary profile data are encrypted with AES-256-GCM before storage. The safeguarding API only returns concern metadata to teachers; the safeguarding lead can view decrypted details, and each detail read is audited. Student profile reads and changes are audited as well. Configure a durable, restricted PostgreSQL deployment, TLS, backups, retention and deletion policies, account recovery, monitoring, and access reviews before production use. This starter is not a substitute for the school's safeguarding, privacy, retention or incident-response policies.

S3 uploads are private and server-side encrypted. Configure the bucket with public access blocked, least-privilege credentials, lifecycle and retention controls. The upload endpoint accepts PDF and image MIME types up to 10 MB; uploads are not made publicly addressable by the application.

## Production setup

Set all production environment values in the hosting provider's secret manager. Configure `NEXTAUTH_URL` and a long random `NEXTAUTH_SECRET`. Use a managed PostgreSQL service with TLS; apply `npm run db:deploy` as a release step, then build and run `npm run build` and `npm start`. The encryption key must remain stable and backed up to recover encrypted data. Set verified school contact, URN and social media values only after approval. Keep `.env`, student data, credentials and encryption keys out of Git.

## Temporary DuckDNS demonstration

This is for a **fictional-data-only, password-protected demonstration**, not production hosting. The application is a prototype and has known demonstration passwords; HTTPS alone does not secure pupil data. Do not expose real pupil, parent, medical, safeguarding or enquiry records. Use a separate demo database, strong unique portal passwords and a separate proxy password. Close the router's public port 3002 forwarding: it bypasses HTTPS and the proxy password. Do not expose PostgreSQL.

The following describes running Caddy **on the Windows host** alongside this workspace's demo on `127.0.0.1:3002`. The separate WSL project on port 3000 may be an older copy; do not overwrite it. If instead hosting entirely inside WSL, networking differs: consult [Microsoft's WSL networking guidance](https://learn.microsoft.com/en-us/windows/wsl/networking).

1. Register a subdomain at [Duck DNS](https://www.duckdns.org/), for example `your-demo.duckdns.org`, and configure its update client using Duck DNS's [instructions](https://www.duckdns.org/install.jsp). Keep the DuckDNS token secret. Check that the domain resolves to your current **public** IP.
2. Download the Windows Caddy binary from the [official installation page](https://caddyserver.com/docs/install) and extract it to a private folder, for example `C:\caddy`. Open PowerShell in that folder. Run `.\caddy.exe hash-password` and enter a new strong proxy password when prompted. Copy the resulting hash; do not use a portal password.
3. Create `C:\caddy\Caddyfile` with the following content, replacing the hostname and the password hash. Restrict access to this file.

   ```caddyfile
   your-demo.duckdns.org {
       basic_auth {
           demo REPLACE_WITH_PASSWORD_HASH
       }
       reverse_proxy 127.0.0.1:3002
   }
   ```

4. In the demo application's private `.env.local`, set `NEXTAUTH_URL=https://your-demo.duckdns.org`, retaining its other existing settings and secrets. Restart the Next.js server so the change takes effect. Do not commit this file or share its contents.
5. On the router, forward external **TCP 80 and 443** to the Windows host's LAN IP on the same ports; allow those ports through Windows Firewall for Caddy. Do not forward 3002. Confirm no other service is using 80 or 443. Caddy normally uses these ports to obtain and renew its public certificate and redirect HTTP to HTTPS. Carrier-grade NAT, ISP port blocking, an incorrect DNS address or another firewall can prevent this.
6. In `C:\caddy`, run `.\caddy.exe run --config C:\caddy\Caddyfile`. Keep the Caddy process and demo server running. Caddy will request and renew the certificate automatically; its data directory must persist. Test `https://your-demo.duckdns.org` from a device outside your home network. The browser should prompt for the proxy username and password before showing the site. Then test the portal sign-ins. Use only HTTPS, and do not enter credentials at a browser certificate warning.
7. When the demonstration ends, stop Caddy and remove the 80/443 router forwards. Reverse the `NEXTAUTH_URL` change before using the localhost demo again. See [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https) and [Caddy basic authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth).

Administrators manage public Instagram, Facebook and YouTube links in **Social media settings**. Only enabled links are shown; the legacy Instagram environment setting is no longer used. Events can invite the linked active parents of selected students without being public. Public event publication requires a separate title and summary; review these and the event date for safeguarding before publishing. Private descriptions, meeting details, equipment lists, children and RSVP records are not included in the public feed. Invitations appear in the family portal and do not send email. Existing events published before this change retain their previously public title and description as their initial public summary; review them after migration.

Administrators and teachers can draft one homepage promotion under **Website popup**. Upload an approved PNG, JPEG or WebP (up to 5 MB), supply an image description, tagline, link and start/end times, and enable it. Save and preview the draft; only administrators can publish it. Times are entered in the editor's device time zone; the end is exclusive. Visitors can dismiss the popup for their browser session. Only use images the school has permission to publish, including appropriate pupil consent. The demonstration football illustration depicts fictional children, not Hallaton pupils.

Administrators and teachers can edit headings and paragraphs of the existing school information and contact pages, homepage sections and cards, class-card labels and image URLs, school-page PDF links and website navigation under **School page text**. Staff can create new page drafts and add or remove menus and items. A custom page must be published before its menu link, or selected together with the menu in the promotion panel. Removing a menu link does not delete its page. Enter PDF links one per line as `title | https://...`, using an HTTPS direct PDF link; remove a line to remove that link. Use only approved public images and check pupil consent. The **School information links** panel manages Ofsted, KS2, SEND, admissions and premium report links. The homepage grants section appears when the **Homepage (grants)** text has been saved and published. Staff can save these privately and browse the authenticated draft website; the preview disables the contact form and shows the draft popup even outside its schedule. Administrators can use **Publish website drafts** to publish selected saved pages, popup, social links, announcements, newsletters and explicitly prepared public event summaries together in one transaction. Conflicts prevent the entire selection from publishing. Events are private by default; only the separate public summary and dates are shared. This is not yet a complete website sandbox: some homepage text and other page images cannot be edited. Teachers may unpublish news and events for safety.

The **Website identity and contact details** page draft controls the header and homepage footer name, tagline, logo URL, URN, public contact details, search messages, menu accessibility labels, homepage browser title and search description, and a selection of homepage hero background colours. Metadata uses published values; the staff preview never exposes draft metadata to search engines. Its public email address is separate from the administrator-only enquiry inbox setting and does not enable email delivery.

The **Homepage (news-image)** and **Homepage (church-image)** drafts replace their illustrations with an approved HTTPS image and description. Leave the URL empty to return to the built-in illustration. The news image also appears on the newsletters page; check photo permissions and pupil consent before publication.

The **Homepage labels and buttons** draft controls the homepage's section labels and many button captions. **Homepage links and section visibility** controls the main homepage destinations, section order and whether sections are shown; **Homepage illustration** can use an approved HTTPS image or the default illustration. Hiding a section only removes it from the homepage and does not make its content private. Check links after hiding sections; hidden sections do not automatically remove links to their anchors. Some utility and accessibility text and visual elements remain fixed in code.

The same homepage labels draft controls the news and newsletter empty-state wording and shared school-page headings, notices and links. The class index follows the children of the navigation menu whose link targets `/page?pid=102`, including its draft version during preview; removing that menu also removes its class cards. Save the navigation draft to make a new page's class-card image and heading editable under **School page text**. A new menu item is shown without an image until its class card is published. **Contact form labels and notices** is a separate draft: the school's safeguarding and data protection leads should approve these notices before publication. Editing the wording does not change contact form validation, storage or sharing behaviour.

The **Related information links** draft controls the links shown below each school page. Each section identifies a source page by its `/page?pid=...` link; its items are the related links displayed on that page. Add, remove or reorder sections and links, then browse the corresponding page in the draft website. Publishing links to custom pages requires those pages to be live or included in the same promotion. Removing links does not delete the destination pages.

The staff and parent portals have separate sign-in and dashboard URLs and use role-based access. Accounts use the same authentication system; a user who signs in on the other portal's page is redirected to the dashboard for their role. Administrators can create multiple parent accounts for a pupil and edit their names, login email addresses and student links under **Accounts**. Removing a link revokes access to that pupil and deletes that link's event invitations and enquiry shares; reconnecting the account does not restore those invitations or shares.

Administrators can use **Audit trail** to inspect general recorded activity and filter by pupil; safeguarding leads can view only safeguarding entries. Records contain action metadata rather than sensitive content. Older records and some actions may not have a pupil association, and activity before audit instrumentation cannot be reconstructed. This is not a complete security audit or an automatic retention policy: the school must agree retention, access reviews, monitoring and secure backups with its data protection lead before production use.

The administrator audit trail displays the previous and new public text for website page, popup metadata, social link, news, newsletter and public event publication changes recorded after this feature was added. Popup image bytes and private pupil or event details are not included. Historical entries cannot be reconstructed. Automatic website snapshot restoration has been removed; previous snapshots remain in the database until an approved retention decision is made. Maintain separate, secured, tested backups and an agreed retention policy.

The trail records successful staff sign-ins and sign-outs, as well as failed sign-ins. Failed attempts for unknown or parent accounts are recorded without the submitted email or password. It records server-side school actions and sensitive reads, not every browser interaction or denied request. Sign-out events depend on the authentication provider receiving the request; session expiry and lost connections are not sign-outs.

### School meals

Administrators configure the meal period, daily price and change cutoff under **School meals**. The cutoff is a wall-clock time in `Europe/London`, including British Summer Time, a configurable number of calendar days before the meal date; the deadline is exclusive. When clocks go back, an ambiguous cutoff uses its first occurrence so choices cannot reopen; a nonexistent spring cutoff moves forward by the clock change. Families select recurring weekdays before the cutoff for the first day of the period. After that, they can mark a booked day as a packed lunch, or change it back, before that day's cutoff. Only linked active parent accounts can change a pupil's choices. Concurrent family changes require a reload instead of silently overwriting another parent's update.

Add a menu entry for each actual school day; no term dates, holidays or catering days are assumed. Families see a selected week's menu and can report a packed lunch for a selected recurring day even if its menu has not been added. Staff can see totals and which pupils have reported packed lunches, including days without a menu. These are planning figures, not attendance or confirmed orders: absence, holidays, allergens, special diets, free meal eligibility, payments, billing and external notifications are not handled. Confirm menu safety and arrangements separately. A configured period's price and end date become fixed once choices exist; a subsequent period must not overlap. Changing the cutoff applies to existing choices immediately. Only one period is active at a time; historical choices are retained but are not exposed in the planner. Establish an appropriate retention and access policy with the school's data protection lead.

For caterers with an integration, an administrator creates a named credential in **School meals** and shares the one-time secret securely. Use HTTPS only and never put the token into a URL, source code or logs. `GET /api/caterer/menus` returns the current period and menus. `PUT /api/caterer/menus` accepts `{"menus":[{"date":"2027-09-06","menu":"Example menu"}]}` with the header `Authorization: Bearer <secret>`; up to 31 distinct weekdays within the configured period are updated atomically. The credential cannot read student records, choices or other staff APIs, and administrators can revoke it. This is a school-specific API, not an integration with an identified catering provider; provider onboarding, rate limiting, credential rotation and production security review remain necessary.

### Mobile family app

`mobile/` is an Expo iOS/Android **webview shell**, not a separately implemented native interface. It opens the existing parent portal over HTTPS, using its account sign-in and linked-pupil access rules; menus, learning and event invitations therefore require a connection. It does not provide offline access, push notifications, a separate app login, native payment or app-store publication.

To try it after deploying a correctly secured HTTPS demo, in WSL run:

```bash
cd mobile
npm ci
export EXPO_PUBLIC_PARENT_PORTAL_URL=https://your-demo.duckdns.org
npx expo start
```

Set the URL to the school site's HTTPS **origin**, without a path. Expo Go or a development build on the device must reach that address; localhost on the Windows host is not the phone's localhost. Use fictional demonstration records only. The URL is included in the app bundle, so do not put credentials in it. For standalone Android/iOS builds, configure signing and unique bundle identifiers and use the relevant Android tooling or a Mac/Xcode or Expo build service. Apple/Google developer accounts, signing, device testing, privacy review and store submission are not configured. JavaScript bundling alone does not establish that the native app works on either device.
