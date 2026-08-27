# fabweb — Архитектура системы

> Внутренний инструмент мини-фабрики и конструкторского бюро (КБ).
> Offline-first, локальный хаб на Raspberry Pi 4, синхронизация с облаком.

---

## 1. Обзор

**fabweb** объединяет два домена в одной системе:

| Домен | Назначение | Коммерция | Согласование |
|-------|------------|-----------|--------------|
| **Производство 3D** | Очередь, станки, склад, калькулятор, списание | Да | Админ |
| **Конструкторское бюро (КБ)** | Проекты: механика, электроника, прошивки | Нет | Научный руководитель |

### Ключевые принципы

- **Offline-first:** Local Hub (Pi 4 + HDD) — primary source of truth на площадке
- **Единая сущность WorkOrder** для всех производственных задач (коммерческих и внутренних)
- **Проекты — дерево веток**, детали не дублируются между проектами
- **152-ФЗ:** минимум ПД, согласие, аудит, ограничения по ролям
- **Модульность:** независимые доменные модули, общее ядро

---

## 2. Роли и права

### 2.1 Системные роли

| Роль | Код | Описание |
|------|-----|----------|
| Админ | `admin` | Полный доступ, склад, станки, согласование WorkOrder |
| Работник | `worker` | Создание проектов/заявок, работа со станками |
| Научный руководитель | `supervisor` | Согласование проектов КБ и статей |
| Гость | `guest` | Публичная витрина завершённых работ КБ |

### 2.2 Micro-roles (профиль работника)

Один пользователь может иметь несколько micro-roles:

| Micro-role | Код | Артефакты |
|------------|-----|-----------|
| Инженер-конструктор | `constructor` | STL, STEP, 3MF, DXF, PDF |
| Электронщик | `electronics` | .kicad_pcb, Gerber, Altium |
| Программист | `programmer` | .hex, .bin, C/C++, Arduino, PlatformIO |

Micro-roles фильтруют UI и доступные типы артефактов.

### 2.3 Матрица прав

| Действие | admin | worker | supervisor | guest |
|----------|:-----:|:------:|:----------:|:-----:|
| Создать проект КБ | ✓ | ✓ | ✓ | — |
| Создать WorkOrder (3D) | ✓ | ✓ | ✓ | — |
| Согласовать WorkOrder (commercial) | ✓ | — | — | — |
| Fast-track WorkOrder (без согласования) | ✓ | — | ✓ | — |
| Согласовать проект КБ | ✓ | — | ✓ | — |
| Согласовать статью | ✓ | — | ✓ | — |
| Управлять станками | ✓ | ✓* | — | — |
| Пополнить склад | ✓ | — | — | — |
| Списание (auto/manual) | ✓ | ✓ | — | — |
| Видеть стоимость | ✓ | ✓ | ✓ | — |
| Отчёты по затратам | ✓ | ✓ | ✓ | — |
| Аудит-лог | ✓ | — | ✓ | — |
| Публичная витрина КБ | ✓ | ✓ | ✓ | ✓ |
| Всё остальное | ✓ | ✓ | ✓ | — |

\* worker — если micro-role включает работу со станками

**Правила согласования:**
- **WorkOrder (commercial/internal 3D):** worker создаёт → admin согласует. Admin/supervisor могут создать и сразу одобрить (fast-track).
- **Проекты КБ и статьи:** supervisor согласует. Admin/supervisor могут fast-track.

---

## 3. Доменная модель

### 3.1 Диаграмма сущностей

```
User ──────────────┬──────── Project (tree)
  │ roles          │              │
  │ micro_roles[]  │              ├── Artifact[]
  │                │              ├── Article[]
  │                │              ├── CostLedgerEntry[] (commercial only)
  │                │              └── parent_project? (ветка)
  │                │
  ├────────────────┼──────── WorkOrder
  │                │              │
  │                │              ├── artifact_ref
  │                │              ├── machine_ref (auto-assigned)
  │                │              ├── priority
  │                │              ├── cost_breakdown
  │                │              └── sub_jobs[] (post-process)
  │                │
  ├────────────────┼──────── Machine
  │                │              │
  │                │              ├── capabilities
  │                │              ├── live_status
  │                │              └── connector_config
  │                │
  ├────────────────┼──────── InventoryItem
  │                │              │
  │                │              └── InventoryMovement[]
  │                │
  └────────────────┴──────── AuditLog (immutable)
```

### 3.2 User

```typescript
interface User {
  id: UUID;
  email: string;
  full_name: string;
  phone?: string;           // ПД — с согласием
  role: 'admin' | 'worker' | 'supervisor' | 'guest';
  micro_roles: ('constructor' | 'electronics' | 'programmer')[];
  pd_consent_at?: Date;     // 152-ФЗ
  created_at: Date;
  updated_at: Date;
}
```

### 3.3 Project

```typescript
interface Project {
  id: UUID;
  title: string;
  description: string;
  type: 'diy' | 'machine_part' | 'device' | 'pcb' | 'firmware' | 'mixed';
  domain: 'design_bureau' | 'commercial_3d';
  status: 'draft' | 'pending_review' | 'active' | 'completed' | 'archived';
  parent_project_id?: UUID;   // ветка — НЕ копия детали
  owner_id: UUID;
  showcase?: {              // для guest-витрины
    published: boolean;
    photos: string[];
    public_description: string;
  };
  created_at: Date;
  updated_at: Date;
}
```

**Правило:** одна деталь не повторяется в другом проекте. Эволюция — через `parent_project_id` (новая ветка).

### 3.4 Artifact

```typescript
interface Artifact {
  id: UUID;
  project_id: UUID;
  kind: 'model_3d' | 'pcb' | 'firmware' | 'document' | 'other';
  title: string;
  versions: ArtifactVersion[];
  current_version: number;
}

interface ArtifactVersion {
  version: number;          // явная нумерация
  files: FileRef[];         // STL, STEP, 3MF, DXF, PDF, G-code, kicad, gerber, hex, bin, etc.
  gcode_path?: string;      // generated, stored in model folder
  created_by: UUID;
  created_at: Date;
  changelog?: string;
}

interface FileRef {
  path: string;             // /data/artifacts/{project_id}/{artifact_id}/v{n}/filename
  mime_type: string;
  size_bytes: number;
  synced_to_cloud: boolean;
}
```

**Поддерживаемые форматы:**
- 3D: STL, STEP, 3MF, DXF, PDF, G-code
- Электроника: .kicad_pcb, Gerber, Altium
- Прошивки: .hex, .bin, C, C++, Arduino, PlatformIO

### 3.5 WorkOrder

```typescript
interface WorkOrder {
  id: UUID;
  source: 'commercial' | 'internal';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'queued'
    | 'assigned'
    | 'in_progress'
    | 'post_process'      // wash, uv_cure для SLA
    | 'done'
    | 'failed'
    | 'cancelled';
  artifact_id: UUID;
  project_id?: UUID;
  requested_by: UUID;
  approved_by?: UUID;
  machine_id?: UUID;
  tech: 'fdm' | 'sla' | 'laser';
  slicer_estimate?: SlicerEstimate;
  cost_breakdown?: CostBreakdown;
  deduction_mode: 'auto' | 'manual';
  sub_jobs?: SubJob[];      // post-process steps
  created_at: Date;
  updated_at: Date;
}

interface SubJob {
  id: UUID;
  machine_type: 'wash' | 'uv_cure' | 'solder';
  status: WorkOrder['status'];
  machine_id?: UUID;
}
```

### 3.6 Machine

```typescript
interface Machine {
  id: UUID;
  name: string;
  type: 'fdm_printer' | 'resin_printer' | 'laser' | 'solder' | 'wash' | 'uv_cure';
  model: string;
  purpose: string;
  capabilities: {
    materials: string[];      // PLA, ABS, resin, etc.
    max_temp_c?: number;
    bed_size: { x: number; y: number; z: number };
    max_power_pct?: number;   // laser
  };
  loaded_material?: string;
  motor_hours: number;
  status: 'idle' | 'busy' | 'error' | 'maintenance';
  live_status?: {
    progress_pct?: number;
    temps?: Record<string, number>;
    camera_url?: string;
    last_seen: Date;
  };
  connector: {
    type: 'moonraker' | 'octoprint' | 'custom';
    host: string;
    port: number;
  };
}
```

**Станки на площадке:**
- 3D FDM (K1 Max) × N
- 3D SLA (M7 Max) × N
- Лазер (Falcon A1)
- Паяльные станции × 2
- Станция промывки (SLA post-process)
- Станция засветки (SLA post-process)

### 3.7 Inventory

```typescript
interface InventoryItem {
  id: UUID;
  name: string;
  category: 'filament' | 'resin' | 'electronics' | 'consumables' | 'blanks' | 'other';
  sku?: string;
  qty: number;
  unit: 'g' | 'ml' | 'pcs' | 'm' | 'kg' | 'l';
  cost_per_unit: number;    // RUB
  alert_threshold_pct: number; // default 20%
  initial_qty: number;      // для расчёта 20%
  created_at: Date;
}

interface InventoryMovement {
  id: UUID;
  item_id: UUID;
  type: 'in' | 'out' | 'adjustment';
  qty: number;
  cost?: number;
  work_order_id?: UUID;
  created_by: UUID;
  note?: string;
  created_at: Date;
}
```

### 3.8 Article (научная)

```typescript
interface Article {
  id: UUID;
  project_id?: UUID;
  udc: string;              // УДК
  title: string;
  authors: { user_id: UUID; name: string; affiliation?: string }[];
  abstract: string;
  body: string;             // единый шаблон для журналов РФ
  keywords: string[];
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  format_version: string;   // версия шаблона
  reviewed_by?: UUID;
  published_at?: Date;
}
```

### 3.9 AuditLog

```typescript
interface AuditLog {
  id: UUID;
  actor_id: UUID;
  action: string;           // 'work_order.approved', 'inventory.out', etc.
  entity_type: string;
  entity_id: UUID;
  payload: Record<string, unknown>;
  ip_address?: string;
  created_at: Date;         // immutable, no updated_at
}
```

---

## 4. Workflow

### 4.1 WorkOrder (3D-печать / лазер)

```
[draft]
  → worker создаёт, прикрепляет artifact + параметры
  → калькулятор считает cost_breakdown

[pending_approval]
  → worker отправляет на согласование
  → admin/supervisor fast-track: draft → approved напрямую

[approved]
  → попадает в общую очередь

[queued]
  → queue engine фильтрует станки по capabilities
  → сортировка: priority DESC, queue_position ASC, motor_hours ASC

[assigned]
  → станок назначен, job отправлен через connector

[in_progress]
  → live status с принтера/лазера
  → auto-spисание материала (или manual override)

[post_process]  (только SLA)
  → sub-jobs: wash → uv_cure

[done | failed]
  → failed: новая ветка проекта или возврат в draft
  → done: обновление showcase (optional), cost в ledger
```

### 4.2 Project (КБ)

```
[draft] → worker/supervisor создаёт проект, добавляет artifacts
[pending_review] → отправка научруку
[active] → работа, версии, вложенные WorkOrder при необходимости
[completed] → showcase для guest-витрины
[archived]
```

### 4.3 Article

```
[draft] → автор пишет по шаблону (UDK, тема, авторы, текст)
[pending_review] → научрук
[published | rejected]
```

---

## 5. Очередь с автоназначением

```typescript
function assignMachine(job: WorkOrder, machines: Machine[]): Machine | null {
  const candidates = machines.filter(m =>
    m.status === 'idle' &&
    m.type matches job.tech &&
    m.capabilities.materials.includes(job.material) &&
    m.capabilities.bed_size >= job.part_size &&
    (m.capabilities.max_temp_c ?? Infinity) >= job.required_temp
  );

  if (candidates.length === 0) {
    job.status = 'queued'; // waiting_capability
    notifyAdmin('Нет подходящего станка');
    return null;
  }

  candidates.sort((a, b) =>
    a.motor_hours - b.motor_hours  // балансировка износа
  );

  return candidates[0];
}
```

**Приоритет очереди:** `urgent` > `high` > `normal` > `low`, затем FIFO.

---

## 6. Архитектура развёртывания

```
                    ┌─────────────────────────────────┐
                    │         Cloud (VPS)             │
                    │  API replica + PostgreSQL       │
                    │  MinIO (files) + Sync hub       │
                    └───────────────┬─────────────────┘
                                    │ HTTPS sync (when online)
                    ┌───────────────▼─────────────────┐
                    │   Local Hub (Raspberry Pi 4)    │
                    │  ┌─────────────────────────────┐│
                    │  │ fabweb-api (primary)        ││
                    │  │ PostgreSQL + Redis          ││
                    │  │ /data/ (HDD) — artifacts    ││
                    │  │ sync-agent (outbox)         ││
                    │  └─────────────────────────────┘│
                    │  ┌─────────────────────────────┐│
                    │  │ machine-gateway             ││
                    │  │ Moonraker/OctoPrint/MQTT    ││
                    │  └─────────────────────────────┘│
                    └───────────────┬─────────────────┘
                                    │ LAN
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
         FDM/SLA Printers      Laser            Solder/Wash/UV
```

### 6.1 Offline-first sync

| Компонент | Поведение |
|-----------|-----------|
| **Запись** | Всегда локально → outbox event |
| **Файлы** | Сначала HDD Pi → фоновая загрузка в облако |
| **Конфликты** | UI ручной merge (diff двух версий) |
| **Мобилка** | SQLite cache + sync по LAN; без LAN — read-only |
| **Облако offline** | Локальный Hub продолжает работать |

### 6.2 Доступность

| Компонент | Целевой SLA | Примечание |
|-----------|-------------|------------|
| Local Hub (Pi) | 99% | Фабрика не зависит от интернета |
| Облако | best effort / 99% | Удалённый доступ |
| Machine Gateway | auto-restart (systemd) | Watchdog + healthcheck |

---

## 7. Модули приложения

```
fabweb/
├── apps/
│   ├── api/                 # NestJS / Go backend
│   ├── web/                 # React + Vite PWA
│   ├── mobile/              # React Native / Flutter
│   └── machine-gateway/     # Connectors к станкам
├── packages/
│   ├── shared/              # Types, constants, utils
│   ├── costing/             # Калькулятор 3D (FDM/SLA/Laser)
│   └── sync/                # Outbox, conflict resolution
├── deploy/
│   ├── local/               # docker-compose для Pi 4
│   └── cloud/               # docker-compose / k8s для VPS
└── docs/
    ├── AI_CONTEXT.md
    ├── COSTING.md
    └── API.md
```

| Модуль | Ответственность |
|--------|-----------------|
| `auth` | JWT, роли, micro-roles, 152-ФЗ consent |
| `projects` | дерево проектов, ветки, artifacts |
| `workorders` | workflow, priority, status machine |
| `queue` | общая очередь, auto-assignment |
| `machines` | реестр, live status, connectors |
| `inventory` | склад, алерты 20%, списание |
| `costing` | калькулятор, ledger, отчёты |
| `files` | версии, local FS, cloud sync |
| `articles` | шаблон, UDK, workflow |
| `showcase` | публичная витрина для guest |
| `audit` | immutable log |
| `sync` | outbox, manual merge UI |
| `notifications` | in-app, push |

---

## 8. Стек

| Слой | Технология | Обоснование |
|------|------------|-------------|
| Backend | **NestJS** (TypeScript) | Модули, DI, OpenAPI, 1–3 devs |
| DB | **PostgreSQL 16** | JSON, надёжность, Pi 4 тянет |
| Cache/Queue | **Redis 7** | Live status, job queue |
| Web | **React 19 + Vite + TanStack Query** | PWA offline, модульность |
| Mobile | **React Native** (Expo) | Offline SQLite, shared types |
| Files | Local FS + **MinIO** (cloud) | S3-compatible |
| Deploy | **Docker Compose** | Pi 4 + VPS |
| Machine API | Moonraker / OctoPrint REST | Klipper/Marlin стандарт |
| Docs | Markdown + OpenAPI 3.1 | AI-friendly |

---

## 9. MVP vs Roadmap

### MVP (v0.1–0.4)

- [x] Auth + роли + micro-roles + 152-ФЗ consent
- [x] Projects КБ: CRUD, файлы/assets, wizard, showcase
- [x] WorkOrder: workflow + priority + admin approval + очередь
- [x] Machines: реестр + ручной статус (коннекторы — stub/planned)
- [ ] Queue: rule-based auto-assignment
- [ ] Inventory: CRUD, алерты 20%, ручное списание
- [x] Costing: калькулятор FDM/SLA/Laser (см. docs/COSTING.md) — в WO и /costing
- [ ] Local Hub на Pi (docker-compose)
- [ ] Базовый sync → облако (outbox, без merge UI)
- [ ] Articles: шаблон + draft/review/publish
- [x] Showcase: guest-витрина
- [ ] Audit log
- [ ] machine-gateway: Moonraker / OctoPrint / SLA custom

### v0.4+ / post-MVP

- [ ] Auto-integration принтеров (Moonraker)
- [ ] Live status + WebSocket
- [ ] Auto-списание из slicer
- [ ] SLA post-process sub-jobs (wash/UV)
- [ ] Conflict merge UI
- [ ] Отчёты по затратам проекта
- [ ] Mobile offline
- [ ] Laser auto-integration
- [ ] IoT (розетки, свет) via MQTT
- [ ] Push-уведомления
- [ ] Email alerts (склад)

---

## 10. 152-ФЗ и безопасность

- **ПД:** ФИО, email, телефон — только с явным согласием (`pd_consent_at`)
- **Хранение:** PostgreSQL на Local Hub, шифрование at-rest (LUKS на HDD)
- **Аудит:** все CRUD-операции, согласования, списания — immutable log
- **Guest:** без ПД, только публичная витрина
- **RBAC:** middleware на каждый endpoint, проверка role + micro_role
- **Backup:** ежедневный pg_dump + rsync файлов на облако

---

## 11. Guest Showcase (публичная витрина)

Guest видит только `project.showcase.published === true` AND `project.status === 'completed'`:

- Фото готовых работ
- Публичное описание
- Автор(ы) — только имя, без контактов
- Без доступа к файлам, стоимости, внутренним заметкам

---

*Документ версии 0.4 — 2026-08-26. Версия приложения: см. `/VERSION` и `docs/VERSIONING.md`*
