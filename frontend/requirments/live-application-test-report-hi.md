# Live Application Test Report (Hindi)

**Test date:** 29 September 2026  
**Application:** https://demo-project-tracker.workarya.com/app/dashboard.html  
**Test account role:** Admin / System Admin (password report mein store nahi kiya)  
**Reference requirements:** `frontend/requirments/extracted-requirements-hindi.txt`  
**Test method:** Live browser UI (Edge headless) aur live API responses. Yeh smoke test hai; destructive actions aur email dispatch nahi kiye gaye.

## 1. Test ka result

| Flow | Result | Evidence |
|---|---|---|
| Login | PASS | Demo Admin se sign-in hua; dashboard load hua. |
| Project create | PASS | Dashboard ke `+ Create Project` se project save hua. |
| Task create | PASS | Planning ke `+ Task` se task save hua aur task table mein dikhा. |
| Project dropdown | PARTIAL | Project 19 select karne par ID persist hui aur reload start hua; reload ke baad final task table ko isi click ke saath conclusively verify nahi kiya. |
| Reports page | PASS (partial) | Report list, Custom Export modal, Monthly Report form aur Portfolio table khule. |
| Financial / Handover report types | FAIL | Dono types Portfolio ke hi columns dikhate hain; dedicated report layout/data nahi hai. Neeche issue #1 dekhein. |
| PM-29 permission variants | NOT VERIFIED | Live test Admin role se hua. Restricted Project Manager/Site/Finance accounts se section redaction verify nahi ki. |
| Email send, PDF/CSV export, project close | NOT RUN | External email ya irreversible action se bachne ke liye buttons submit nahi kiye. |

## 2. Banaye gaye test records

Yeh records live demo database mein abhi maujood hain; test ke baad delete nahi kiye gaye, kyunki create-flow test ke liye unki zaroorat thi.

| Record | ID | Naam / Code | Details |
|---|---:|---|---|
| Project | 19 | `QA-Live-UI-20260929-170701` / `PRJ-002` | Status `Active`; owner System Admin; test description ke saath. |
| Task | 14 | `QA UI Task-20260929-171205` | Project 19; status `In Progress`; owner System Admin. |

**Project creation verification:** Modal se project form fill kiya, `Create Project` submit kiya, API response se ID 19 capture hui, aur dashboard reload ke baad project selector mein project dikhा.  
**Task creation verification:** Project 19 ke Planning page par `+ Task` form khola, title/description/status bhare, `Save` submit kiya; toast `Task created` aaya aur task ID 14 table mein dikhा.

## 3. Button guide: kya karta hai aur kaise kaam karta hai

`PASS / clicked` ka matlab live UI mein action chalaya. `Observed` ka matlab button/flow live page mein dekha, lekin save/export/send action nahi chalaya.

### Dashboard aur Projects

| Button / control | Expected kaam aur flow | Test |
|---|---|---|
| `+ Create Project` | N-Level Project form kholta hai. Resort, optional parent, title, owner/team, dates, status, description, client/sponsor, currency, notes aur optional attachment le sakta hai. Save par project API call hoti hai; code auto-assign ho sakta hai. | **Clicked — PASS**, project 19 bana. |
| Project row/name | Selected project ke detail/workspace page par le jata hai. | Observed; QA project detail ke sare actions nahi chalaye. |
| Project picker (`PROJECT`) | Projects ke beech context badalta hai; Planning page reload hokar chosen project ke tasks dikhati hai. | **Partial**; valid selection par project 19 persist hua aur reload shuru hua. Reload ke baad same click ka final rendered table verify karna baaki hai. |
| Resort selector | Resort ke hisaab se project lists/pages scope karta hai. | Is run mein independently test nahi kiya. |

### Planning / Tasks

| Button / control | Expected kaam aur flow | Test |
|---|---|---|
| `+ Task` | Task create modal: title, owner, dependency, milestone, start/due date, status, description aur completion evidence. `Save` task ko selected project se link karke table reload karta hai. | **Clicked — PASS**, task 14 bana. |
| `+ Progress Update` | Daily/site update form kholta hai; task/sub-task, status, progress %, text/remark aur evidence/attachment submit karne ka flow. | Observed; update submit nahi kiya. |
| Per-row `Update` | Us task/sub-task ka daily progress update kholta hai. Dependency-blocked item par button disabled ho sakta hai. | Observed; submit nahi kiya. |
| Per-row `History` | Chune hue task/sub-task ke purane updates/remarks dekhne ka history view kholta hai. | Observed; history button nahi khola. |
| Per-row `Edit` | Task ka title, owner, dates, status aur details badalne ka form kholta hai. | Observed; save nahi kiya. |
| Per-row `Sub-Task` | Main Task ke andar child/sub-task banata hai. | Observed; test data aur nahi banaya. |
| Per-row `Child` | Nested sub-task ke andar child task banata hai. | Observed; use nahi kiya. |
| `Depend` / `Undepend` | Task ya sub-task dependency set/clear karta hai; dependency complete hone tak item `Waiting` ho sakta hai. | Button state dekha; dependency nahi badli. |
| Per-row `Delete` | Task/sub-task delete operation. | **Nahi chalaya** — destructive action. |
| Rows-per-page / Prev / Next | Table pagination size aur pages badalte hain. | Buttons live table par dikhे; full pagination cases verify nahi kiye. |

### Reports

| Button | Expected kaam aur flow | Test |
|---|---|---|
| `Custom Export & Send` | Report type, project/date, daily ya cumulative scope, columns aur recipients chunta hai. `Print / PDF` print dialog kholta hai; `Export CSV` CSV download karta hai; `Send to selected internal team` report save karke selected team ko bhejta hai. | Modal khola; recipients ko mail nahi bheji, export buttons nahi chalaye. |
| `Monthly Project Report` | Project aur calendar month chunta hai; decisions input ke baad scope, progress, milestones, financials, risks, decisions aur next actions ka report banata hai; Print/Save PDF deta hai. | Form khola; report generate/print nahi ki. |
| `View Portfolio` | Authorized projects ka consolidated status table load karta hai; admin view mein budget RAG aur open issues bhi dikhte hain. | **Clicked — PASS**, table data load hua. |
| `Comparable projects` | Completed projects ko filters ke saath compare karne ka form kholta hai. | Button dekha; comparison run nahi kiya. |
| `+ Report Config` | Saved report configuration banane ka form kholta hai. | Save nahi kiya. |
| Report row `Export` | Saved report configuration ka CSV/export action chalata hai. | Existing report list dekhi; export nahi kiya. |
| Recipient list | Internal user list se email recipients choose karne deta hai; free-text email field nahi dikha. | Modal mein dekha. Is test mein email send nahi hua. |

### Dusre primary modules: button intent guide

Neeche ke actions live smoke test mein submit nahi hue; yeh UI/module flow ke operating guide ke liye hain, inhe PASS test na samjhein.

| Page / button | Kya karta hai |
|---|---|
| Milestones: `+ Milestone` / template/import/backward plan | Project milestone add/edit, reusable milestone list import/clone, aur completion date se pichhe schedule dates banane ka flow. Save par milestone project schedule mein link hota hai. |
| Daily Report: date/project filter, Excel upload, export | Chuni hui date tak site updates dikhata hai; supported sheet upload se task status import karta hai; report/export selected period ka snapshot deta hai. |
| Budget: `+ Budget`, `+ Cost Center`, `Revise`, `Allocate`, `History` | Budget baseline/cost center create, amount allocate, approved budget revise aur revision history dekhne ke liye. |
| Costs: purchase/actual entry/import | Project, BOQ ya cost-center level par purchase/actual cost capture karta hai; variance/budget position update hoti hai. |
| Issues: `Log New Issue`, `Comment`, `Escalate` | What/Where/When/reporter/impact/priority record karta hai; comments history mein add hote hain; high/critical priority notification/email rule trigger kar sakti hai. Email behavior is test mein run nahi kiya. |
| Inventory: `Add Inventory` | Leftover inventory record karta hai. Kuch na bacha ho to zero quantity ka “No leftover inventory” record closure checklist ke liye hota hai. |
| Inventory: `Generate Handover Report` | Project data se printable handover/completion draft banata hai. Signed final report ko separately upload karna hota hai. |
| Inventory: `Close Project` | Closure form/API chalata hai; signed report, inventory reconciliation aur Project Manager permission required hain. Close action destructive/final hai, isliye test nahi kiya. |
| Project Detail tabs/actions | Project dates, milestones, task progress, budget/cost-center, BOQ, recent activity, risks aur outstanding actions dikhate hain; child module buttons usi project context ko kholte hain. |

## 4. Errors / gaps jo fix ya verify karne hain

### Issue 1 — Financial aur Handover report type galat report banate hain (High)

- Custom Export dropdown `Financial Budget vs Actual & RAG` aur `Project Handover & Completion Summary` types dikhata hai.
- Dono types select karke live modal mein dekha: **dono ke liye Portfolio columns** dikhte hain (Project, Status, Owner, Budget, RAG, % Complete, Milestone, Issues, Variance Reasons).
- Financial report mein Purchase Commitment aur Actual Cost ke dedicated columns/data nahi milte.
- Handover report mein signed completion report, inventory reconciliation, handover details ya closure information ke dedicated columns/sections nahi hain.
- Frontend report builder bhi `financial` aur `handover` ko Portfolio row builder/group par map karta hai; server CSV path mein bhi in type names ka alag builder nazar nahi aata.
- **Fix:** dono types ke liye alag column sets, permission-aware data builders aur CSV/PDF generation banayein; ya jab tak ready na hon, dropdown options hata/disable karein.

### Issue 2 — Monthly report ki history retain hoti hai ya nahi, verify/fix karein (Medium)

- Monthly Project Report ka form/report preview open hua, par is run mein generate/print nahi kiya.
- Code path inspection mein Monthly report generation HTML render aur print ke through dikha; `CreateReport`/report history save call us flow mein nazar nahi aayi. Isliye PM-28 ke “generated report history” ke saath mismatch ho sakta hai.
- **Fix/verification:** ek monthly report generate karke Reports history page par dekhein. Agar entry nahi banti, monthly generate/print se pehle/baad report record aur generated file reference store karein.

### Issue 3 — PM-29 authorization matrix role-wise live test pending

- Is test mein sirf Admin login use hua. Admin portfolio mein financial columns expected hain.
- Site/Project Manager/Finance/External stakeholders ke login se section visibility aur API response verify nahi hui.
- **Next test:** limited-access users banakar ek-ek project par Projects, Tasks, Milestones, Issues, Budgets, Costs aur Reports permissions vary karein; UI ke saath API/export response mein bhi unauthorized fields na aane ki पुष्टि करें.

### Issue 4 — Closure, notification email aur destructive buttons ka end-to-end test pending

- Signed report upload, leftover inventory gate, Project Manager-only close, high-priority issue email aur report email dispatch submit nahi kiye gaye.
- SMTP/recipient delivery ko test mailbox ke saath alag controlled run mein verify karna hoga; is smoke test se email delivery ka PASS claim nahi hai.

## 5. Agla test sequence

1. Issue #1 mein Financial/Handover report types ko dedicated report logic se fix karein.
2. Monthly report history save karke PM-28 history behavior verify karein.
3. Role-wise PM-29 authorization cases run karein.
4. Test mailbox ke saath notifications/email verify karein.
5. Signed completion upload + inventory prerequisite ke saath closure gate test karein.
6. QA project 19 / task 14 ko test environment mein archive/delete karein agar business ko test records rakhne ki zaroorat na ho. Live demo record deletion is report run mein nahi ki gayi.

---

# QA rerun — requirement-based end-to-end API test

**Test date:** 30 September 2026  
**Environment:** local ASP.NET app + a newly created disposable PostgreSQL database (`wisetrack_qa_codex_20260930`). Test DB and its seeded records were removed after the run. A 45-byte placeholder closure document uploaded during testing was also removed. Existing application/demo databases were not used for test writes.  
**Coverage:** authenticated API operations, permission checks, business gates, static frontend routes and API-backed workflows. The browser click-through itself was not automated in this run.

## Workflow verified

1. **Sign-in and access:** wrong password returned 401; seeded Admin login succeeded and returned a JWT. Protected API calls without a token returned 401; logout returned 200.
2. **Resort and project setup:** created/edited a resort and property, then a root project, sub-project and work package. Detail, hierarchy and update calls succeeded.
3. **Planning and site progress:** created/edited a milestone and tasks; added nested sub-tasks, dependencies and progress updates; read task list, history, exceptions and daily report. Dependency endpoints returned 204. Bulk task update imported one row successfully.
4. **Budget and procurement:** created/edited a budget, revised its amount, created/edited a cost center and allocation, recorded purchase/actual costs and imported a cost batch. RAG checks returned Green at 79.9%, Amber at 80%, and Red above 100%.
5. **BOQ and master data:** JSON BOQ import, item-master BOQ, CSV preview/commit, baseline/revision and revision-line edit succeeded. Item, brand, category, unit and project-type create/edit/delete flows succeeded.
6. **Issues and notifications:** issue creation, detail, comment, list, notification without email, inbox/read status and escalation-rule create/pause succeeded. With SMTP explicitly disabled, a high-priority issue was auto-escalated and the explicit escalation action returned 200.
7. **Reports and audit:** portfolio/comparable reports, saved report configuration/history, CSV export, daily export route and audit list returned successfully. Site Engineer portfolio responses hid budget, purchase and actual amounts; the costs endpoint returned 403.
8. **Closure:** a Site Engineer inventory write was denied (403). A Project Manager without project-scoped Closure permission was also denied. After granting scoped Closure access, the signed-document requirement rejected a missing document, a zero-quantity “No leftover inventory” record was accepted, the uploaded placeholder document was recognized, and closure changed the QA project status to Closed.
9. **Delete paths:** task/sub-task, an empty project tree, property, resort, item, unused role, permission, brand, category, unit and project type deletes succeeded. All 22 static HTML routes returned successfully.

## Findings

| Result | Finding |
|---|---|
| **FAIL** | Financial and Handover CSV report types both exported the generic Portfolio header/columns. They lack the dedicated financial and signed-handover data required by the report types. |
| **FAIL** | Monthly Project Report is assembled in the browser and printed, but its generation path does not save a report-history record. This is a code-path finding; interactive browser generation was not run. |
| **FAIL** | Deleting a role referenced by an escalation rule returned HTTP 500 from a PostgreSQL foreign-key violation. Deleting an unused role succeeded; the referenced-role case should be handled as a clear validation/conflict response. |
| **FAIL / environment dependent** | With the configured SMTP setting enabled, a high-priority issue request returned HTTP 500 when SMTP socket access was blocked. The notification/issue path passed after explicitly disabling email in the disposable test run. Actual delivery was not verified. |
| **NOT AVAILABLE** | `DELETE /api/users/{id}` returned 405; `UsersController` has no delete route. The current user screen also has no user-delete action. |
| **PASS** | Project hierarchy, task/progress, finance/RAG, BOQ/CSV, master-data CRUD, notifications, role permission checks, report export endpoints and closure gates passed in the disposable DB. |
| **PARTIAL** | Static pages and routes were checked, but interactive browser UI behavior, PDF printing and external email delivery were not exercised. |

**Test hygiene:** all database writes were confined to the disposable QA database; it was dropped after the test. The only physical test upload was removed. Application code was unchanged; this QA report was updated.
