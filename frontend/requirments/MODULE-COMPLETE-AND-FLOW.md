# Wisetrack — Module complete status & flow

Source spec: `Engg. Project Tracking-Wisetrack-v0.1.docx` (PM-01 … PM-30 + extras).  
This file records **module-wise completion** and the **operating flow** of each module.

**Overall:** Application modules required by v0.1 are **complete** in this product.  
External systems that are not part of this repo (live SMTP mailbox, separate RFQ application, native `.mpp` / scanned PDF parsers) stay as **integration hooks**, not missing in-app modules.

---

## Master product flow (run in this order)

```
Login
  → Users & Access (Admin grants View / Edit / Update / Delete per user, project, module)
    → Resorts → N-level Projects → Project Workspace (team)
      → Item Master → BOQ (import / from master)
        → Budget + Cost Centers (baseline, revise, 80% RAG)
          → Milestones (templates + backward plan from handover)
            → Tasks / Sub-tasks → Daily Report (site Excel)
              → Issues (What / Where / When / Impact)
                → Purchases & Actuals + variance explanations
                  → Dashboard / Reports / Audit / Notifications
                    → Inventory leftover → signed completion report → Close Project
```

Same sequence is clickable on **Workflow Guide**.

---

## 1. Login & session — COMPLETE

**PM:** access gate for all later modules.

**Flow**
1. Open `/app/login.html`.
2. Sign in with email + password (JWT).
3. Server returns `isAdmin` and permission rows.
4. Sidebar shows only modules the user may view. Admin sees everything.

---

## 2. Users & Access — COMPLETE

**PM-02, PM-03, PM-04.** Admin-only page.

**Flow**
1. Admin opens **Users & Access**.
2. Create / edit user (email, name, active, internal vs external).
3. Open **User Permissions Manager**.
4. Search and add **only the projects** that person needs (1–2 of ~50 is enough).
5. Per tab (Dashboard, Resort, Project, Tasks, BOQ, Budget, Costs, Issues, Reports, Closure, Audit, Module) set **View / Edit / Update / Delete**.
6. Global tabs (Dashboard, Resort, Audit, Module) apply with no project id.
7. External users get the same matrix; they only see granted projects.

Field-level financial locks (optional in PM-03) are covered at **module** level: no Budgets/Costs view ⇒ financial columns hidden on reports.

---

## 3. Dashboard — COMPLETE

**PM-25.** Portfolio KPIs, resort velocity, all-projects matrix, live activity, RAG alerts.

**Flow**
1. After login, open **Dashboard**.
2. Review project count, **active / on-track**, alerts, approved budget vs committed.
3. Open a row → Tasks for that package.
4. Activity stream shows **who** did **what** (user name from audit).

---

## 4. Resorts — COMPLETE

**Extra hierarchy required with projects.**

**Flow**
1. Create **Resort**.
2. Add **Properties** under the resort.
3. Add **Project Types** (Civil, MEP, …).
4. Top-bar resort selector scopes later screens.

---

## 5. Projects (N-level WBS) — COMPLETE

**PM-01, PM-06.**

**Flow**
1. Open **Projects**.
2. Create parent package under a resort (code, owner, dates, status, currency, notes).
3. Add child / sub-packages to any depth (MEP, Civil, renovation, etc.).
4. Each node is a first-class project (own team, budget, BOQ, tasks).
5. Filter by resort; tree and card views.

---

## 6. Project Workspace — COMPLETE

**PM-02, PM-26.**

**Flow**
1. Select project.
2. See dates, progress, budget RAG, exceptions, variance notes.
3. Assign team members + site role.
4. Jump to Tasks / Budget / Issues / Costs for the same package.

---

## 7. Item Master (Module) — COMPLETE

**PM-12** (catalog). RFQ lives in a **separate app**; items here are the shared catalog.

**Flow**
1. Create Brands, Units, Categories.
2. Create Items (code, description, unit, purchase price, brand, image).
3. Reuse these items on BOQ (From Master).

---

## 8. BOQ — COMPLETE

**PM-10, PM-11, PM-13, PM-14.**

**Flow**
1. Select project.
2. **From Master** — pick catalog items, set qty / rate / remark / attachment.
3. **Import** — paste or upload vendor CSV/TSV (flexible headers, not a fixed template).
4. **Validate only** → downloadable error rows → then commit.
5. Versions retained; current baseline identified.

---

## 9. Budgets & Cost Centers — COMPLETE

**PM-07, PM-08, PM-09.**

**Flow**
1. Select project (parent or sub-project).
2. Set **approved baseline** and split across cost centers.
3. Sub-projects act as CCs on the parent roll-up.
4. **Revise** keeps history (reason, date, approver).
5. Spend ≥ 80% of a CC → **RAG** flag + escalation rule (mail when SMTP is configured).

---

## 10. Milestones — COMPLETE

**PM-15, PM-16, PM-17, PM-18.**

**Flow**
1. Select project.
2. Add free-form milestones (dates, owner, dependency, evidence).
3. **Templates / Excel import** — paste names from Excel / MSP export, save or clone.
4. **Plan backward (PM-17)** — enter handover date + days per step; system creates  
   Procurement → Payment → Manufacture → Shipment → Arrival → Installation → Commissioning → Handover  
   working **back from completion**.

Native Microsoft Project `.mpp` binary and scanned PDF OCR are not in-app parsers; Excel / line-list import is the supported template path.

---

## 11. Tasks & Planning — COMPLETE

**PM-18, PM-19.**

**Flow**
1. Create **Task-N**.
2. Add **Task-N-Sub-M**.
3. Site user: status dropdown, optional text, remark, attachment, daily %.
4. **% completion** change is owner-gated.
5. Exception radar: overdue / no progress in 7 days.

---

## 12. Daily Report — COMPLETE

**PM-18, PM-28 (daily pack).**

**Flow**
1. Submit daily update on a task / sub-task.
2. Or **Upload Excel CSV** (standard site sheet).
3. Charts show completed / in-progress / delayed until date.

---

## 13. Issues — COMPLETE

**Extra spec: Incident tracker.**

**Flow**
1. Log What / Where / When / Impact / reporter / priority.
2. Comment and escalate.
3. High-priority notify stakeholders (in-app; email via escalation matrix + SMTP).

---

## 14. Purchases & Actuals — COMPLETE

**PM-21, PM-22, PM-24.**

**Flow**
1. Enter purchase and actual against project / BOQ / CC.
2. Screen shows approved vs purchase vs actual + RAG.
3. Record **Cost** or **Schedule** variance explanation (also shown on Project Workspace and usable in reports).

---

## 15. Reports — COMPLETE

**PM-23, PM-27, PM-28, PM-29, PM-30 (status pack).**

**Flow**
1. **Portfolio** — all authorized projects, milestone, schedule risk, issues; **Budget RAG hidden** if user has no Budgets/Costs view.
2. **Comparable** — completed similar projects (type / budget / duration); money hidden without finance rights.
3. **Custom Export & Send** — pick columns; recipient list is **internal emails only**.
4. Monthly / branded PDF + history when export is run.

---

## 16. Notifications — COMPLETE

**PM-07 mail, PM-20.**

**Flow**
1. In-app inbox for date, milestone, variance, issue triggers.
2. Admin configures **escalation rules** (who, when, channel).
3. Email sends when SMTP is set in server config. Without SMTP, in-app alerts still work.

---

## 17. Audit Logs — COMPLETE

**PM-05.**

**Flow**
1. Open **Audit Logs**.
2. Each material create / update / import / permission / report action is stored with **user name + timestamp**.
3. Dashboard activity stream uses the same feed.

---

## 18. Inventory & Closure — COMPLETE

**PM-30 + leftover inventory + PM close.**

**Flow**
1. Update leftover inventory lines.
2. Upload **signed project completion / handover report** (mandatory).
3. **Project Manager** (or Admin) closes the project.
4. Closed status appears on portfolio / one-page project status report.

---

## 19. Settings & Workflow Guide — COMPLETE

**Flow**
- Settings: API base, session, logout.
- Workflow Guide: numbered runbook mapped to PM-01…PM-30.

---

## Requirement map (PM-01 … PM-30)

| ID | Status | Where it lives |
|----|--------|----------------|
| PM-01 | Complete | Projects |
| PM-02 | Complete | Users & Access + Project Workspace team |
| PM-03 | Complete | Four rights per module/project; finance hidden without Budgets/Costs |
| PM-04 | Complete | Internal flag + project matrix |
| PM-05 | Complete | Audit Logs + dashboard stream (named user) |
| PM-06 | Complete | Project profile + resort tree |
| PM-07 | Complete | Budget CC + RAG + escalation |
| PM-08 | Complete | Budget revise history |
| PM-09 | Complete | Budget / purchase / actual roll-up |
| PM-10 | Complete | Flexible BOQ import |
| PM-11 | Complete | Validate-only + error download |
| PM-12 | Complete | Item master (RFQ is external app) |
| PM-13 | Complete | BOQ from master |
| PM-14 | Complete | BOQ versions |
| PM-15 | Complete | Free-form milestones |
| PM-16 | Complete | Templates + Excel/MSP name import |
| PM-17 | Complete | Plan backward from handover |
| PM-18 | Complete | Tasks, sub-tasks, daily update, Excel DSR |
| PM-19 | Complete | Exception radar |
| PM-20 | Complete | In-app + escalation; email when SMTP on |
| PM-21 | Complete | Purchases & actuals |
| PM-22 | Complete | Variance + RAG |
| PM-23 | Complete | Comparable projects |
| PM-24 | Complete | Variance explanation UI |
| PM-25 | Complete | Portfolio dashboard |
| PM-26 | Complete | Project Workspace one-pager |
| PM-27 | Complete | Monthly export pack |
| PM-28 | Complete | Custom columns + internal mail list |
| PM-29 | Complete | Financial sections follow permissions |
| PM-30 | Complete | Signed report + inventory + PM close |

**Extras:** Issue tracker — Complete. RFQ app / native MSP binary / live mailbox — outside this codebase; hooks exist (item master, Excel import, SMTP settings).
