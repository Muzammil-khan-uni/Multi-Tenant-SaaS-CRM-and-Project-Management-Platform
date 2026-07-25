<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:1e3a8a,100:2563eb&height=200&section=header&text=Database%20Schema&fontSize=58&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Entity-Relationship%20Diagram%20%E2%80%94%20MongoDB%20%2B%20Mongoose&descAlignY=58&descSize=18" width="100%"/>

<a href="#">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=2800&pause=900&color=2563EB&center=true&vCenter=true&width=760&lines=12+collections.+1+tenant+key%3A+workspace.;Referenced+where+it+scales%2C+embedded+where+it's+read+together.;Every+arrow+below+is+a+real+ObjectId+ref+in+the+code." alt="Typing SVG" />
</a>

<br/>

<img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/ODM-Mongoose-880000?style=for-the-badge" />
<img src="https://img.shields.io/badge/Collections-12-2563EB?style=for-the-badge" />
<img src="https://img.shields.io/badge/Model-Multi--Tenant-8A2BE2?style=for-the-badge" />

</div>

<br/>

## 📚 Table of Contents

- [Design Philosophy](#-design-philosophy)
- [Core Tenant Model — ER Diagram](#-core-tenant-model--er-diagram)
- [Supporting Collections — ER Diagram](#-supporting-collections--er-diagram)
- [Collection Reference](#-collection-reference)
- [Relationship Catalog](#-relationship-catalog)
- [Embedded vs. Referenced — Why Each Choice](#-embedded-vs-referenced--why-each-choice)
- [Indexing Strategy](#-indexing-strategy)
- [Data Lifecycle & TTL Policies](#-data-lifecycle--ttl-policies)
- [Tenant Isolation Guarantee](#-tenant-isolation-guarantee)

---

## 🎯 Design Philosophy

Every workspace-scoped collection carries a `workspace: ObjectId` field — the single tenant key the entire platform pivots on. Beyond that, the schema follows one simple rule:

> **Embed what's always read together and rarely grows unbounded. Reference what's queried independently, shared across documents, or could grow without limit.**

That's why a client's `contacts[]` and `notes[]` live inside the `Client` document, but a client's `projects` and `invoices` are stored as **both** an ObjectId reference on the child *and* a denormalized array on the parent — optimizing the two most common read paths ("show me this client's projects" and "show me this project's client") without a join.

---

## 🗺️ Core Tenant Model — ER Diagram

The six collections every workspace revolves around: **Workspace → Client → Project → Task → Invoice**, all anchored to **User**.

```mermaid
erDiagram
    WORKSPACE {
        ObjectId _id PK
        string name
        string slug UK
        string domain UK
        string plan "free|starter|professional|enterprise"
        string subscription_status "trial|active|past_due|cancelled"
        ObjectId owner FK
        ObjectId_array admins FK
        boolean isActive
    }

    USER {
        ObjectId _id PK
        string email UK
        string password
        string firstName
        string lastName
        boolean isSuperAdmin
        Membership_array workspaceMemberships "embedded"
        boolean isActive
        boolean isEmailVerified
    }

    CLIENT {
        ObjectId _id PK
        ObjectId workspace FK
        string company_name
        string status "active|lead|prospect|churned|on_hold"
        Contact_array contacts "embedded"
        Note_array notes "embedded"
        ObjectId assignedTo FK
        ObjectId accountManager FK
        ObjectId_array projects FK
        ObjectId_array invoices FK
        number totalRevenue
    }

    PROJECT {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId client FK
        string name
        string status "planning|active|on_hold|completed|cancelled"
        string type "fixed_price|hourly|retainer|internal"
        TeamMember_array team "embedded, refs USER"
        Milestone_array milestones "embedded"
        ObjectId_array tasks FK
        number progress "0-100"
    }

    TASK {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId project FK
        string title
        string status "todo|in_progress|review|completed"
        string boardColumn "kanban position"
        Assignee_array assignedTo "embedded, refs USER"
        ObjectId createdBy FK
        Checklist_array checklist "embedded"
        Comment_array comments "embedded, refs USER"
        ObjectId parentTask FK "self-ref"
    }

    INVOICE {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId client FK
        ObjectId project FK
        string number UK
        string status "draft|sent|paid|overdue|cancelled|refunded"
        LineItem_array items "embedded"
        Payment_array payments "embedded"
        number total
        number balanceDue
        ObjectId parentInvoice FK "self-ref, recurring"
    }

    WORKSPACE ||--o{ USER            : "membership (embedded array)"
    WORKSPACE ||--o| USER            : "owner"
    WORKSPACE ||--o{ CLIENT          : owns
    WORKSPACE ||--o{ PROJECT         : owns
    WORKSPACE ||--o{ TASK            : owns
    WORKSPACE ||--o{ INVOICE         : owns

    CLIENT   ||--o{ PROJECT  : "engaged in"
    CLIENT   ||--o{ INVOICE  : "billed"
    CLIENT   }o--o{ USER     : "assignedTo / accountManager"

    PROJECT  ||--o{ TASK     : contains
    PROJECT  ||--o{ INVOICE  : "billed via"
    PROJECT  }o--o{ USER     : "team members"

    TASK     }o--o{ USER     : "assignedTo / watchers / comments"
    TASK     ||--o{ TASK     : "parentTask / dependencies"
    TASK     ||--o{ INVOICE  : "referenced as line item"

    INVOICE  ||--o{ INVOICE  : "recurring → parentInvoice"
```

---

## 🧩 Supporting Collections — ER Diagram

HR (**Employee**, **Department**), collaboration (**Notification**, **ChatMessage**), and platform-governance (**ActivityLog**, **PlatformAnnouncement**) collections — all still tenant-scoped except the platform-wide announcement feed.

```mermaid
erDiagram
    EMPLOYEE {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId user FK "unique, 1:1 with User"
        string employeeId UK
        string status "active|on_leave|terminated"
        string employmentType
        LeaveRecord currentLeave "embedded"
        LeaveRecord_array leaveHistory "embedded"
    }

    DEPARTMENT {
        ObjectId _id PK
        ObjectId workspace FK
        string name
        string code
        ObjectId manager FK
        ObjectId parentDepartment FK "self-ref"
        ObjectId_array employees FK
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId recipient FK
        ObjectId sender FK
        string type "task_assigned|invoice_generated|..."
        boolean isRead
        date expiresAt "TTL 90d"
    }

    CHATMESSAGE {
        ObjectId _id PK
        ObjectId workspace FK
        string roomId
        ObjectId sender FK
        string message
        ObjectId replyTo FK "self-ref"
        Reaction_array reactions "embedded, refs USER"
        date createdAt "TTL 90d"
    }

    ACTIVITYLOG {
        ObjectId _id PK
        ObjectId workspace FK
        ObjectId performedBy FK
        string action "created|updated|deleted|..."
        string entity "polymorphic type"
        ObjectId entityId "polymorphic ref"
        date createdAt "TTL 365d"
    }

    PLATFORMANNOUNCEMENT {
        ObjectId _id PK
        string title
        string targetAudience "all|admins|specific_plan"
        ObjectId sentBy FK
        ReadReceipt_array readBy "embedded, refs USER + WORKSPACE"
    }

    WORKSPACE ||--o{ EMPLOYEE      : employs
    WORKSPACE ||--o{ DEPARTMENT    : organizes
    WORKSPACE ||--o{ NOTIFICATION  : "scopes"
    WORKSPACE ||--o{ CHATMESSAGE   : "scopes"
    WORKSPACE ||--o{ ACTIVITYLOG   : "audits"
    WORKSPACE ||--o{ PLATFORMANNOUNCEMENT : "read receipts"

    USER ||--|| EMPLOYEE       : "extends profile"
    USER ||--o{ NOTIFICATION   : receives
    USER ||--o{ CHATMESSAGE    : sends
    USER ||--o{ ACTIVITYLOG    : performs
    USER ||--o{ PLATFORMANNOUNCEMENT : "authors (sentBy)"

    DEPARTMENT ||--o{ DEPARTMENT : "sub-department"
    DEPARTMENT }o--o{ USER       : "roster"
    DEPARTMENT ||--o{ EMPLOYEE   : "manager link"

    ACTIVITYLOG }o..o{ TASK      : "polymorphic entityId"
    ACTIVITYLOG }o..o{ PROJECT   : "polymorphic entityId"
    ACTIVITYLOG }o..o{ CLIENT    : "polymorphic entityId"
    ACTIVITYLOG }o..o{ INVOICE   : "polymorphic entityId"
```

> `entityId` on `ActivityLog` is a polymorphic reference — its target collection is determined at query time by the sibling `entity` field (`user`, `project`, `task`, `client`, `invoice`, `file`, `comment`, `notification`, `report`), not by a fixed Mongoose `ref`.

---

## 📖 Collection Reference

<details open>
<summary><b>🏢 Workspace</b> — the tenant root</summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `name`, `slug`, `domain` | String | `slug` and `domain` are unique; `slug` auto-generated from `name` |
| `company` | Object | Legal name, tax ID, address, logo |
| `branding` | Object | Colors, logo, custom domain |
| `settings` | Object | Timezone, currency, working hours, feature flags |
| `plan` | Enum | `free` · `starter` · `professional` · `enterprise` |
| `subscription` | Object | Status, trial/period dates, Stripe IDs, plan limits |
| `owner`, `admins[]`, `createdBy` | ObjectId → User | Ownership chain |
| `invitations[]` | Array | Embedded pending-invite records with token + expiry |

</details>

<details>
<summary><b>👤 User</b> — global identity, workspace-scoped access</summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `email`, `password` | String | Password bcrypt-hashed (cost 12), never returned by default (`select: false`) |
| `workspaceMemberships[]` | Embedded `Membership[]` | **A user belongs to N workspaces** — each membership embeds its own `role`, `permissions[]`, `isActive`, `invitedBy` |
| `isSuperAdmin` | Boolean | Grants cross-tenant `/super-admin/*` access, bypassing membership checks |
| `activeSessions[]` | Embedded | Hashed session tokens, capped at 5 concurrent devices |
| `passwordHistory[]` | Embedded | Last 5 hashes retained to block password reuse |
| `preferences` | Object | Theme, language, notification channels, timezone |

**Why embed memberships instead of a join table?** Every authenticated request needs "what can this user do in *this* workspace" resolved in a single document fetch — no second collection round-trip on the hottest path in the app.

</details>

<details>
<summary><b>🧑‍🤝‍🧑 Client</b> — the CRM record</summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `company` | Object | Name, industry, size, tax ID, logo |
| `contacts[]` | Embedded | Multiple people per client; `isPrimary` / `isDecisionMaker` flags |
| `status` | Enum | `active` · `inactive` · `lead` · `prospect` · `churned` · `on_hold` |
| `source` | Enum | `referral` · `website` · `social_media` · `cold_call` · `event` · `partner` · … |
| `notes[]`, `activityTimeline[]` | Embedded | Freeform CRM notes + a typed activity feed (`call`, `meeting`, `invoice_sent`, …) |
| `projects[]`, `invoices[]` | ObjectId[] → Project / Invoice | Denormalized for O(1) "this client's work" lookups |
| `customFields` | Map | Arbitrary workspace-defined key/value data |

</details>

<details>
<summary><b>📁 Project</b></summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `client` | ObjectId → Client | Required — every project belongs to exactly one client |
| `team[]` | Embedded | Each entry refs a `User` plus `role`, `hoursAllocated`, `hoursWorked` |
| `budget` | Object | Estimated/actual amounts, currency, embedded `expenses[]` |
| `timeline` | Object | Start, end, deadline, estimated/actual hours |
| `milestones[]` | Embedded | Title, due date, status, `completedBy` |
| `tasks[]` | ObjectId[] → Task | Denormalized alongside `Task.project` for bidirectional lookup |
| `progress` | Number (0–100) | Recomputed via `calculateProgress()` from live Task counts |

</details>

<details>
<summary><b>✅ Task</b> — the Kanban unit</summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `project` | ObjectId → Project | Required |
| `status` / `boardColumn` | Enum | `todo` · `in_progress` · `review` · `completed` — kept in sync by a pre-save hook |
| `assignedTo[]` | Embedded | Multiple assignees per task, each with `assignedBy` + timestamp |
| `checklist[]`, `comments[]`, `timeEntries[]`, `attachments[]` | Embedded | Everything read alongside the task detail view lives on the document |
| `dependencies[]` | Embedded | Typed self-references: `blocks` · `blocked_by` · `relates_to` · `duplicates` |
| `parentTask` | ObjectId → Task | Supports subtasks |

</details>

<details>
<summary><b>🧾 Invoice</b></summary>
<br/>

| Field | Type | Notes |
|---|---|---|
| `client`, `project` | ObjectId → Client / Project | Client required, project optional |
| `number` | String, unique per workspace | Auto-generated `INV-00001` sequence on save |
| `items[]` | Embedded | Line items, optionally linked to a `Task` for time-based billing |
| `status` | Enum | `draft` · `sent` · `paid` · `overdue` · `cancelled` · `refunded` — auto-transitions via pre-save hooks (e.g. past-due → `overdue`, fully paid → `paid`) |
| `payments[]` | Embedded | Each payment append-only, driving `amountPaid` / `balanceDue` |
| `recurring.parentInvoice` | ObjectId → Invoice | Self-reference chaining generated recurring invoices |

</details>

<details>
<summary><b>🧑‍💼 Employee & Department</b></summary>
<br/>

| Collection | Key Relationship |
|---|---|
| `Employee` | **1:1** with `User` (`Employee.user`) — extends a workspace member with HR data (position, salary, leave balance, attendance) without bloating the core `User` document |
| `Department` | Self-referencing `parentDepartment` for org-chart hierarchies; `manager` and `employees[]` both reference `User` |

</details>

<details>
<summary><b>🔔 Notification, 💬 ChatMessage, 🧾 ActivityLog, 📣 PlatformAnnouncement</b></summary>
<br/>

| Collection | Purpose | Notable Design |
|---|---|---|
| `Notification` | Per-user alerts | `metadata` holds optional refs to the task/project/invoice/client that triggered it; **TTL-expires after 90 days** |
| `ChatMessage` | Team chat, grouped by `roomId` | Self-referencing `replyTo` for threads; **TTL-expires after 90 days** |
| `ActivityLog` | Immutable audit trail | Polymorphic `entity` + `entityId` pair instead of 9 separate optional ref fields; **TTL-expires after 1 year** |
| `PlatformAnnouncement` | Super-admin → tenant broadcast | Not workspace-scoped — lives outside tenant isolation by design, since it targets *across* workspaces |

</details>

---

## 🔗 Relationship Catalog

| From | Field | → To | Cardinality | Storage |
|---|---|---|---|---|
| User | `workspaceMemberships[].workspace` | Workspace | M:N | Embedded array on User |
| Workspace | `owner`, `admins[]`, `createdBy` | User | N:1 / N:M | Referenced |
| Client | `workspace` | Workspace | N:1 | Referenced |
| Client | `assignedTo`, `accountManager` | User | N:1 | Referenced |
| Client | `projects[]`, `invoices[]` | Project / Invoice | 1:N (denormalized) | Referenced array |
| Project | `client` | Client | N:1 | Referenced |
| Project | `team[].user` | User | M:N | Embedded array |
| Project | `tasks[]` | Task | 1:N (denormalized) | Referenced array |
| Task | `project` | Project | N:1 | Referenced |
| Task | `assignedTo[].user`, `watchers[]` | User | M:N | Embedded / referenced array |
| Task | `parentTask`, `dependencies[].task` | Task | Self-ref | Referenced |
| Invoice | `client`, `project` | Client / Project | N:1 | Referenced |
| Invoice | `items[].task` | Task | N:1 | Referenced |
| Invoice | `recurring.parentInvoice` | Invoice | Self-ref | Referenced |
| Employee | `user` | User | 1:1 | Referenced (unique) |
| Employee | `department.manager` | User | N:1 | Referenced |
| Department | `parentDepartment` | Department | Self-ref | Referenced |
| Department | `employees[]` | User | M:N | Referenced array |
| Notification | `recipient`, `sender` | User | N:1 | Referenced |
| ChatMessage | `sender`, `mentions[]`, `replyTo` | User / ChatMessage | N:1 / Self-ref | Referenced |
| ActivityLog | `performedBy`, `entityId` | User / polymorphic | N:1 | Referenced |

---

## ⚖️ Embedded vs. Referenced — Why Each Choice

| Pattern | Used For | Rationale |
|---|---|---|
| **Embed** | `Client.contacts`, `Task.comments`, `Task.checklist`, `Project.milestones`, `User.workspaceMemberships` | Bounded, always fetched with the parent, no independent querying needed |
| **Reference** | `Task.project`, `Invoice.client`, `Employee.user` | Unbounded growth, needs independent indexing/querying, or is shared across multiple parents |
| **Both (denormalized)** | `Client.projects[]` ↔ `Project.client`, `Project.tasks[]` ↔ `Task.project` | Optimizes the two most frequent read directions without a `$lookup` aggregation on either side |

---

## 📇 Indexing Strategy

<details open>
<summary>Expand full index list (as defined in the Mongoose schemas)</summary>
<br/>

| Collection | Index | Purpose |
|---|---|---|
| **User** | `email` (unique) | Login lookup |
| | `workspaceMemberships.workspace` | Find all workspaces a user belongs to |
| | `workspaceMemberships.workspace + isActive`, `+ role` | Tenant membership & RBAC checks |
| | `firstName, lastName, email` (text) | Team member search |
| **Workspace** | `slug` (unique), `domain` (unique, sparse) | Tenant resolution from request headers |
| | `subscription.status + subscription.trialEndsAt` | Trial-expiry jobs |
| | `invitations.email + invitations.status` | Invitation lookup |
| **Client** | `workspace + status` | Filtered client lists |
| | `workspace + assignedTo` | "My clients" views |
| | `company.name, contacts.firstName, contacts.lastName` (text) | CRM search |
| **Project** | `workspace + status + isArchived` | Active project lists |
| | `workspace + client` | Client → project drilldown |
| | `timeline.deadline + status` | Deadline dashboards |
| **Task** | `workspace + project + boardColumn + boardOrder` | Kanban board rendering (compound, ordered) |
| | `workspace + status + priority` | Filtered task queues |
| | `assignedTo.user + status` | "My tasks" views |
| | `dueDate + status` | Overdue-task alerts |
| **Invoice** | `workspace + status + dueDate` | Aging/overdue reports |
| | `workspace + client + status` | Client billing history |
| | `workspace + number` (unique, sparse) | Invoice number uniqueness per tenant |
| **Employee** | `workspace + status` | Active roster |
| | `workspace + employeeId` (unique, sparse) | HR ID lookup |
| **Notification** | `recipient + isRead + createdAt` | Unread-first inbox rendering |
| | `createdAt` (TTL, 90d) | Automatic cleanup |
| **ChatMessage** | `workspace + roomId + createdAt` | Paginated chat history |
| | `createdAt` (TTL, 90d) | Automatic cleanup |
| **ActivityLog** | `workspace + entity + entityId + createdAt` | "History for this record" |
| | `createdAt` (TTL, 365d) | Automatic cleanup |

</details>

---

## ⏳ Data Lifecycle & TTL Policies

MongoDB TTL indexes automatically expire documents — no cron job required.

```mermaid
gantt
    title Document Retention Windows
    dateFormat  X
    axisFormat %s
    section Notification
    90-day TTL          :0, 90
    section ChatMessage
    90-day TTL           :0, 90
    section ActivityLog
    365-day TTL                                             :0, 365
```

| Collection | Retention | Reasoning |
|---|---|---|
| `Notification` | 90 days | Alerts lose relevance quickly; keeps the collection lean |
| `ChatMessage` | 90 days | Team chat is ephemeral by design, not a system of record |
| `ActivityLog` | 365 days | Long enough for audit/compliance review without unbounded growth |
| Everything else | Indefinite | Business records (clients, projects, tasks, invoices) are retained until explicitly archived/deleted |

---

## 🔐 Tenant Isolation Guarantee

Every workspace-scoped collection above carries a `workspace: ObjectId` field, and **every query issued by the API is automatically scoped to `req.workspace._id`** by the `tenantIsolation` middleware described in the [API documentation](./API_DOCUMENTATION.md#-multi-tenancy-workspace-headers). Combined with compound indexes that lead with `workspace`, this means:

- No cross-tenant document can be returned by any list or detail endpoint
- Every hot-path index is workspace-first, so tenant isolation doesn't cost query performance — it *is* the query plan

<br/>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2563eb,100:0f172a&height=120&section=footer" width="100%"/>

Diagrams generated directly from the live Mongoose schemas — if the code changes, so should this file.
</div>
