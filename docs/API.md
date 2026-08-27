# fabweb — API Contracts (v0.1 draft)

> Base URL: `/api/v1`
> Auth: `Authorization: Bearer <jwt>`
> Content-Type: `application/json`
> Errors: `{ "error": { "code": "string", "message": "string", "details": {} } }`

---

## Auth

### POST /auth/login
```json
// Request
{ "email": "user@fab.local", "password": "..." }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "role": "worker", "micro_roles": ["constructor"] }
}
```

### POST /auth/consent
152-ФЗ — фиксация согласия на обработку ПД.
```json
{ "accepted": true }
```

### GET /auth/me
```json
{ "id": "uuid", "email": "...", "full_name": "...", "role": "worker", "micro_roles": ["constructor", "programmer"], "pd_consent_at": "2026-01-01T00:00:00Z" }
```

---

## Projects

### GET /projects
Query: `?domain=design_bureau&status=active&page=1&limit=20`

```json
{
  "data": [{
    "id": "uuid",
    "title": "Датчик влажности IoT",
    "type": "mixed",
    "domain": "design_bureau",
    "status": "active",
    "parent_project_id": null,
    "owner": { "id": "uuid", "full_name": "..." },
    "created_at": "..."
  }],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

### POST /projects
```json
{
  "title": "Новый проект",
  "description": "...",
  "type": "device",
  "domain": "design_bureau",
  "parent_project_id": "uuid-or-null"
}
```

### PATCH /projects/:id
```json
{ "status": "pending_review" }
```

### GET /projects/:id/tree
Дерево веток проекта.

### POST /projects/:id/showcase
Публикация на guest-витрину.
```json
{
  "published": true,
  "photos": ["file-uuid-1", "file-uuid-2"],
  "public_description": "Описание для гостей"
}
```

---

## Artifacts

### POST /projects/:projectId/artifacts
```json
{
  "title": "Корпус датчика",
  "kind": "model_3d"
}
```

### POST /artifacts/:id/versions
Загрузка новой версии (multipart/form-data).
```
files[]: File (STL, STEP, ...)
changelog: "Исправлен крепёж"
```

### GET /artifacts/:id/versions/:version
```json
{
  "version": 2,
  "files": [{ "path": "...", "mime_type": "model/stl", "size_bytes": 1234567 }],
  "gcode_path": ".../v2/model.gcode",
  "created_by": { "id": "uuid", "full_name": "..." },
  "created_at": "...",
  "changelog": "..."
}
```

---

## WorkOrders

### GET /workorders
Query: `?status=queued&priority=high&tech=fdm`

Ответ — массив WorkOrder (с `requester`, `approver`, `project`, `cost_breakdown`).

### GET /workorders/queue
Активная очередь: `queued | assigned | in_progress | post_process`,  
сортировка: priority DESC → queue_position ASC.

### POST /workorders
```json
{
  "title": "Корпус датчика",
  "notes": "PLA, чёрный",
  "source": "commercial",
  "priority": "normal",
  "tech": "fdm",
  "deduction_mode": "manual",
  "project_id": "uuid-optional",
  "fast_track": false,
  "cost_input": {
    "tech": "fdm",
    "material_price_per_kg": 1500,
    "calc_type": "weight",
    "weight_g": 50,
    "material": "PLA",
    "print_hours": 3,
    "print_minutes": 0,
    "modeling_hours": 0,
    "markup_pct": 50
  }
}
```
`fast_track: true` (admin/supervisor) → сразу `approved`.

### PATCH /workorders/:id
Обновление черновика (title, notes, priority, cost_input…).

### PATCH /workorders/:id/status
```json
{ "status": "in_progress" }
```
Переходы по state machine + проверка ролей.

### POST /workorders/:id/submit
`draft → pending_approval`

### POST /workorders/:id/approve
Admin: `pending_approval|draft → approved`.  
Supervisor: только fast-track `draft → approved`.

### POST /workorders/:id/reject
Admin: `pending_approval → draft`

### POST /workorders/:id/enqueue
`approved → queued` (+ `queue_position`)

---

## Machines

### GET /machines
Query: `?type=fdm_printer&status=idle&enabled=true`

Реестр станков. Пока коннекторы — **заглушки** (`integration_status`: `stub` | `planned` | `connected`).

### GET /machines/:id
### GET /machines/:id/live-status
До подключения gateway: `{ connected: false, live_status: { message: "…" } }`.

### POST /machines
Admin. Создание станка (capabilities, connector_type, notes…).

### PATCH /machines/:id
Admin — полные поля; worker — status / loaded_material / motor_hours.

### PATCH /machines/:id/status
```json
{ "status": "idle" }
```
`offline | idle | busy | error | maintenance`

Парк в seed: K1 Max, Kobra×2, Photon M7 Max, Falcon A1.

---

## Inventory

### GET /inventory
Query: `?category=filament&low_stock=true`

### POST /inventory
Admin only.
```json
{
  "name": "PLA Black",
  "category": "filament",
  "qty": 1000,
  "unit": "g",
  "cost_per_unit": 1.5,
  "alert_threshold_pct": 20,
  "initial_qty": 1000
}
```

### POST /inventory/:id/movements
```json
{
  "type": "in",
  "qty": 500,
  "note": "Поставка от ..."
}
```

Auto-spисание создаёт movement с `work_order_id` автоматически.

### GET /inventory/alerts
```json
{
  "data": [{
    "item": { "id": "uuid", "name": "PLA Black" },
    "current_qty": 180,
    "threshold_qty": 200,
    "pct_remaining": 18
  }]
}
```

---

## Costing

### POST /costing/calculate
Preview без создания WorkOrder.
```json
{
  "tech": "fdm",
  "material_price_per_kg": 1500,
  "weight_g": 50,
  "material": "PLA",
  "print_hours": 3,
  "modeling_hours": 1,
  "markup_pct": 50
}
```

### GET /projects/:id/cost-report
Query: `?from=2026-01-01&to=2026-12-31`

---

## Articles

### POST /articles
```json
{
  "project_id": "uuid",
  "udc": "004.896",
  "title": "Применение IoT-датчиков...",
  "authors": [{ "user_id": "uuid", "name": "Иванов И.И.", "affiliation": "КБ fabweb" }],
  "abstract": "...",
  "body": "...",
  "keywords": ["IoT", "3D-печать"]
}
```

### PATCH /articles/:id/status
```json
{ "status": "pending_review" }
```

### POST /articles/:id/review
Supervisor only.
```json
{ "decision": "published", "comment": "..." }
```

---

## Showcase (public, guest-accessible)

### GET /showcase
Без auth или с guest token.
```json
{
  "data": [{
    "project_id": "uuid",
    "title": "Робот-манипулятор",
    "public_description": "...",
    "photos": ["https://.../photo1.jpg"],
    "authors": ["Иванов И.И."],
    "completed_at": "2026-06-01"
  }]
}
```

---

## Audit

### GET /audit
Admin/supervisor only.
Query: `?entity_type=work_order&entity_id=uuid&from=...&to=...`

```json
{
  "data": [{
    "id": "uuid",
    "actor": { "id": "uuid", "full_name": "..." },
    "action": "work_order.approved",
    "entity_type": "work_order",
    "entity_id": "uuid",
    "payload": { "previous_status": "pending_approval", "new_status": "approved" },
    "created_at": "..."
  }]
}
```

---

## Sync

### GET /sync/status
```json
{
  "last_sync_at": "2026-08-26T11:00:00Z",
  "pending_events": 3,
  "cloud_reachable": true
}
```

### GET /sync/conflicts
```json
{
  "data": [{
    "id": "uuid",
    "entity_type": "project",
    "entity_id": "uuid",
    "local_version": { "updated_at": "...", "data": {} },
    "remote_version": { "updated_at": "...", "data": {} }
  }]
}
```

### POST /sync/conflicts/:id/resolve
```json
{ "resolution": "local" | "remote" | "merged", "merged_data": {} }
```

---

## WebSocket events

Connect: `ws://local-hub/ws?token=<jwt>`

```json
// machine.status_changed
{ "type": "machine.status_changed", "machine_id": "uuid", "status": "busy", "progress_pct": 45 }

// workorder.status_changed
{ "type": "workorder.status_changed", "work_order_id": "uuid", "status": "in_progress" }

// inventory.alert
{ "type": "inventory.alert", "item_id": "uuid", "pct_remaining": 15 }
```

---

*Draft v0.1 — endpoints будут генерироваться из NestJS OpenAPI decorator'ов*
