# fabweb — AI Context

> Этот документ предназначен для AI-ассистентов (Cursor, Copilot и др.).
> Читай его первым при работе с проектом.

---

## Что это

**fabweb** — offline-first веб-приложение для мини-фабрики и конструкторского бюро (КБ).

Два домена:
1. **Производство 3D** (commercial) — очередь печати, станки, склад, калькулятор стоимости
2. **Конструкторское бюро** (design_bureau) — проекты любого типа: механика, электроника, прошивки

---

## Ключевые решения (не менять без обсуждения)

| Решение | Значение |
|---------|----------|
| Offline-first | Local Hub (Raspberry Pi 4) = primary, облако = replica |
| Единая сущность производства | `WorkOrder` (не Order + Job + Task) |
| Проекты — дерево | `parent_project_id` для веток, НЕ копирование деталей |
| Согласование WorkOrder | Только `admin` (supervisor — только КБ и статьи) |
| Fast-track | `admin` и `supervisor` могут одобрить без workflow |
| Файлы | Local FS first → sync to cloud; explicit versioning |
| Конфликты sync | Manual merge UI (не CRDT) |
| Валюта | RUB |
| Compliance | 152-ФЗ (ПД, consent, audit) |
| **Версия** | Файл `/VERSION` → `pnpm version:sync` (см. `docs/VERSIONING.md`, `docs/RULES.md`) |

---

## Структура репозитория (целевая)

```
fabweb/
├── apps/
│   ├── api/              # NestJS backend
│   ├── web/              # React + Vite PWA
│   ├── mobile/           # React Native (Expo)
│   └── machine-gateway/  # Moonraker/OctoPrint connectors
├── packages/
│   ├── shared/           # TypeScript types, constants
│   ├── costing/          # FDM/SLA/Laser calculator
│   └── sync/             # Outbox pattern, conflict resolution
├── deploy/
│   ├── local/            # docker-compose for Pi 4
│   └── cloud/            # docker-compose for VPS
├── docs/
│   ├── AI_CONTEXT.md     # ← ты здесь
│   ├── COSTING.md        # Calculator spec
│   └── API.md            # OpenAPI contracts
└── ARCHITECTURE.md       # Full architecture doc
```

---

## Доменные сущности (кратко)

```
User          — role + micro_roles[]
Project       — tree, domain, status, showcase
Artifact      — kind, versions[], files
WorkOrder     — source, priority, status, tech, cost_breakdown
Machine       — type, capabilities, live_status, connector
InventoryItem — category, qty, alert_threshold_pct
Article       — udc, authors, body, status
AuditLog      — immutable
```

Полные TypeScript-интерфейсы: `ARCHITECTURE.md` §3.

---

## Роли

| Role | Code | Ключевое |
|------|------|----------|
| Админ | `admin` | Всё + склад + согласование WorkOrder |
| Работник | `worker` | Создание, станки, списание |
| Научрук | `supervisor` | Согласование КБ + статей, fast-track WorkOrder |
| Гость | `guest` | Только showcase (фото + описание) |

Micro-roles: `constructor`, `electronics`, `programmer`.

---

## Workflow статусы

**WorkOrder:** draft → pending_approval → approved → queued → assigned → in_progress → post_process → done | failed

**Project (КБ):** draft → pending_review → active → completed → archived

**Article:** draft → pending_review → published | rejected

---

## Станки

| Type | Examples | Connector |
|------|----------|-----------|
| fdm_printer | K1 Max | Moonraker |
| resin_printer | M7 Max | Moonraker |
| laser | Falcon A1 | custom |
| solder | — | manual |
| wash | SLA post-process | manual/auto |
| uv_cure | SLA post-process | manual/auto |

Queue: общая, auto-assignment по capabilities (material, bed_size, max_temp).

---

## Costing

Калькулятор: FDM / SLA / Laser. Полная спека: `docs/COSTING.md`.

```typescript
import { calcFDM, calcSLA, calcLaser } from '@fabweb/costing';
```

Тарифы редактируются админом через `cost_config` table.

---

## Файлы

Путь на Local Hub:
```
/data/artifacts/{project_id}/{artifact_id}/v{version}/{filename}
```

Форматы:
- 3D: STL, STEP, 3MF, DXF, PDF, G-code
- PCB: .kicad_pcb, Gerber, Altium
- Firmware: .hex, .bin, C/C++, Arduino, PlatformIO

G-code генерируется и хранится в папке модели.

---

## Sync (offline-first)

1. Все записи → local PostgreSQL + outbox event
2. Файлы → local HDD → background upload to MinIO (cloud)
3. Sync agent push outbox to cloud when online
4. Conflicts → manual merge UI (show diff, user picks)
5. Mobile → SQLite cache, sync via LAN to Local Hub

---

## API conventions

- Base: `/api/v1/`
- Auth: JWT Bearer
- Pagination: `?page=1&limit=20`
- Filtering: query params
- Errors: `{ error: { code, message, details? } }`
- Audit: middleware logs all mutations

Полные контракты: `docs/API.md`

---

## Coding conventions

- **Language:** TypeScript everywhere (backend, frontend, shared)
- **Backend:** NestJS modules per domain (auth, projects, workorders, ...)
- **Frontend:** React functional components, TanStack Query for data
- **Naming:** snake_case in DB, camelCase in TS
- **IDs:** UUID v4
- **Dates:** ISO 8601 UTC in API, local TZ in UI
- **Tests:** vitest (unit), playwright (e2e) — только meaningful
- **Comments:** только non-obvious business logic
- **Commits:** conventional commits (feat:, fix:, docs:)

---

## Правила (обязательно)

Читать: [`docs/RULES.md`](RULES.md) — версия, роли, workflow, conventions.

## Версионирование

- Источник: `/VERSION`
- Синхронизация: `pnpm version:sync`
- Правила: `docs/VERSIONING.md` / `docs/RULES.md`
  - patch `X.Y.Z+1` — мелкие правки
  - minor `X.Y+1.0` — средние фичи / новый доменный модуль в `0.x`
  - major `X+1.0.0` — breaking / готовый MVP (`1.0.0`)

Текущая версия: см. `/VERSION`

## MVP scope

См. ARCHITECTURE.md §9. Не реализовывать post-MVP без явного запроса:
- Auto-integration принтеров
- Live status WebSocket
- Mobile offline
- Conflict merge UI
- IoT/MQTT

---

## Частые задачи для AI

| Задача | Где смотреть |
|--------|-------------|
| Добавить endpoint | `apps/api/src/{module}/`, `docs/API.md` |
| Новый статус WorkOrder | `packages/shared/src/workorder.ts`, workflow в ARCHITECTURE.md §4 |
| Изменить расчёт стоимости | `packages/costing/`, `docs/COSTING.md` |
| Новый тип артефакта | `packages/shared/src/artifact.ts`, allowed mime types |
| Права доступа | `apps/api/src/auth/guards/`, матрица в ARCHITECTURE.md §2.3 |
| Docker deploy | `deploy/local/docker-compose.yml` |

---

*Обновляй этот файл при изменении архитектурных решений.*
