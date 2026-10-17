# Data model

Diagrams: the entity relationships and the visibility flows are in [DIAGRAMS](DIAGRAMS.md) (§2.4, §5.2 to §5.4).

Firestore (native mode, `me-central2`) is the system of record; Cloud Storage holds files. The rules in `firebase/firestore.rules` and `firebase/storage.rules` are the first authorization layer and are tested per role (see [TEST-PLAN](TEST-PLAN.md)). Types live in `packages/shared` as zod schemas.

## 1. Conventions

- **Multi-tenant by organization.** Everything operational is under `orgs/{orgId}/…`. An organization belongs to one section (`property`, `office`, `broker`) and has a `plan` (`free` at launch).
- **Roles** are custom claims: `{ orgs: { [orgId]: Role[] } }`, plus `platformAdmin` for the Rasikh team. Claims are written only by Functions or the Admin SDK.
- **Ledgers** (building expenses and contributions, ballots, broker activity) are create-only or append-only. **Evidence** (inspection media, receipts) is write-once.
- **Dates** are ISO strings (`YYYY-MM-DD`) for calendar facts, server timestamps for audit.
- **No personal data in logs.** AI and audit logs hold metadata.

## 2. Top-level collections

| Path                                     | Purpose                                                                                          | Who writes                                       | Who reads                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| `users/{uid}`                            | Profile, locale, PDPL consent record.                                                            | The user (limited), Functions                    | The user                                   |
| `users/{uid}/memberships/{id}`           | A person's organizations (for the switcher).                                                     | Functions                                        | The user                                   |
| `orgs/{orgId}`                           | The organization: `name`, `section`, `plan`, creator.                                            | Functions only                                   | Members                                    |
| `offices/{officeId}`                     | Public profile of an engineering office: CR, SCE class, Balady, disciplines, cities, `verified`. | The office lead (profile), the team (`verified`) | Signed-in users (to choose an office)      |
| `engineers/{uid}`                        | Engineer profile: SCE number, discipline, expiry, `verified`.                                    | The engineer, the team (`verified`)              | The office, the team                       |
| `rulePacks/{packId}`                     | Versioned code-rule parameters verified by an office engineer.                                   | The office's engineer                            | The office                                 |
| `regulations/{id}`                       | Municipal requirements with their source (Ministry's built in; each Amanah's added by the team). | The Rasikh team                                  | Signed-in users                            |
| `precedents/{pid}`                       | An office's private precedent library.                                                           | The office                                       | The office                                 |
| `designLibrary/{pid}`                    | Designs shared with consent (pattern or plan), credited to the office.                           | The office lead with the client's consent        | Signed-in offices                          |
| `designProjects/{pid}`                   | An engineering project; subcollections below.                                                    | Client (brief), office (workflow)                | The client and the office (see visibility) |
| `insights/{id}`                          | Indicative neighbourhood prices, marked indicative with source and date.                         | Admin import                                     | Signed-in users                            |
| `siteMessages/{id}`, `siteFeedback/{id}` | Public contact messages and page ratings.                                                        | Anyone (create); the team (answer, delete)       | The team                                   |
| `settings/{doc}`                         | Platform settings.                                                                               | The team                                         | As the rules say                           |

## 3. Under `orgs/{orgId}`

| Subcollection                                         | Contents                                                                                                                                      | Notes                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `members/{uid}`                                       | Roles and display name of a member.                                                                                                           | Written by Functions                                         |
| `audit/{id}`                                          | `org.created`, signatures, approvals, with actor and time.                                                                                    | Append-only                                                  |
| `properties/{id}`                                     | Name, city, district, kind, optional exact `location {lat,lng}`.                                                                              | Pins validated inside the Kingdom box                        |
| `units/{id}`                                          | A unit of a property (label, type).                                                                                                           |                                                              |
| `leases/{id}`                                         | Ejar contract number, tenant, dates, annual rent, cycle, status.                                                                              | Tenant sees only their own                                   |
| `payments/{id}`                                       | Schedule rows: due date, amount, `due` or `paid`, receipt path.                                                                               | Staff record payment; tenant uploads a receipt               |
| `expenses/{id}`                                       | Owner expenses for the annual report.                                                                                                         |                                                              |
| `documents/{id}`                                      | Uploaded documents.                                                                                                                           |                                                              |
| `inspections/{id}`                                    | Kind (move in or out), lease, status, signatures, sealed digest; subcollections `items/{id}`, `media/{id}`.                                   | Media hashed, write-once; sealed records are immutable       |
| `tickets/{id}`                                        | Maintenance ticket: category, urgency, status, vendor, SLA, rating.                                                                           | Status machine in `packages/shared`                          |
| `buildings/{id}`                                      | A building with `owners/{uid}`, `members/{id}`, `expenses/{id}`, `contributions/{id}`, `quotes/{id}`, `votes/{id}` with `ballots/{memberId}`. | Expenses and contributions create-only; one ballot per unit  |
| `brokers/{uid}`                                       | Broker profile with FAL licence number and expiry.                                                                                            |                                                              |
| `leads/{id}`, `viewings/{id}`, `brokerContracts/{id}` | The broker CRM.                                                                                                                               | Funnel moves forward only                                    |
| `brokerActivity/{id}`                                 | Immutable server-timestamped log.                                                                                                             | Create-only, no edit, no delete                              |
| `designs/{projectId}`                                 | Hand-off: a released set linked to a property (project, version, property, SHA-256, office, date).                                            | Created only by the person who commissioned it; nobody edits |
| `notifications/{nid}`                                 | Reminder notifications.                                                                                                                       |                                                              |
| `aiUsage/*`                                           | Daily and monthly counters.                                                                                                                   | Denied to clients; Functions only                            |

## 4. Engineering project (`designProjects/{pid}`)

| Subcollection                                      | Contents                                                                                                                                      | Visibility                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| (document)                                         | Title, kind (`new` or `renovation`), plot, programme, zoning, status, required disciplines, office, client, picked version, `libraryConsent`. | Client and the project's office                                                |
| `versions/{vid}`                                   | A design: plan, label, kind, status (`draft`, shared, `released`), `sha256`, checks summary, BOQ, `required`.                                 | The office always; the client only versions shared with them and released ones |
| `approvals/{discipline}`                           | Who approved which discipline for which `sha256`, with SCE number.                                                                            | The office; the client when released                                           |
| `comments/{cid}`, `findings/{fid}`, `quotes/{qid}` | Review comments, engineer findings, vendor quotes.                                                                                            | The office (client for comments shared)                                        |

Project status: `brief → accepted → concepts → picked → development → review → released` (or `declined`). A version is released only when every required discipline approved that same hash, and only the office lead releases.

## 5. Storage layout

```
orgs/{orgId}/receipts/{file}                       payment receipts (members)
orgs/{orgId}/inspections/{inspectionId}/{file}     evidence (create-only, size limit 25 MB)
orgs/{orgId}/tickets/{ticketId}/{file}             ticket photos
```

Everything else is denied (building expense receipts are stored with the receipts area). Files are never overwritten or deleted by clients after sign-off.

## 6. Key invariants (tested)

1. A user outside an organization reads nothing in it; a tenant reads only their lease, payments and tickets.
2. Offices cannot see each other's projects; clients never see drafts under internal review.
3. Only a verified engineer of the right discipline, of a verified office with current SCE membership, can approve.
4. Sealed inspections, receipts and evidence cannot change; ledgers only grow.
5. Roles and `section` cannot be written by clients.
6. `aiUsage` is unreadable and unwritable by clients.

## 7. Indexes and migrations

Composite indexes are declared in `firebase/firestore.indexes.json` and deployed with the rules. The schema is evolved additively (new optional fields with defaults); a breaking change needs a one-off migration script reviewed like code and run against the emulator first.
