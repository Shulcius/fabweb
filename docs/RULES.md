# fabweb — Правила разработки

Обязательные правила для людей и AI-ассистентов.  
Детали архитектуры: [`ARCHITECTURE.md`](../ARCHITECTURE.md), контекст для AI: [`AI_CONTEXT.md`](AI_CONTEXT.md).

---

## 1. Версионирование

Формат: `MAJOR.MINOR.PATCH` (`X.Y.Z`).  
Источник: файл [`/VERSION`](../VERSION).

| Тип | Когда | Инкремент | Пример |
|-----|-------|-----------|--------|
| **Мелкая правка** | UI-fix, typo, мелкий баг, refactor без API | `X.Y.Z+1` | 0.2.1 → **0.2.2** |
| **Средняя правка** | новый экран, расширение API, новые поля, workflow | `X.Y+1.0` | 0.2.1 → **0.3.0** |
| **Глобальное / новый модуль** | новый доменный модуль, breaking API, auth/sync/mobile | `X+1.0.0` | 0.3.0 → **1.0.0** |

### Workflow при каждом изменении кода

1. Отредактировать `/VERSION`
2. Выполнить `pnpm version:sync`
3. Добавить строку в таблицу истории [`VERSIONING.md`](VERSIONING.md)
4. При major — также обновить `ARCHITECTURE.md` / `AI_CONTEXT.md`

Версия в UI и `/health` берётся из `@fabweb/shared` (`APP_VERSION`). **Не хардкодить.**

Полная спецификация: [`VERSIONING.md`](VERSIONING.md).

> До `1.0.0` API ещё нестабилен. Первый `1.0.0` — готовый MVP площадки (Pi + offline sync).  
> Новый доменный модуль в `0.x` поднимает **major** только если это breaking / смена платформы; иначе обычно **minor** (как Auth→Projects: `0.1→0.2`).  
> Явный major в `0.x→1.0` — когда закрыт MVP checklist.

---

## 2. Архитектурные инварианты

Не менять без обсуждения:

| Решение | Значение |
|---------|----------|
| Offline-first | Local Hub (Pi 4) = primary, облако = replica |
| Производство | одна сущность `WorkOrder` |
| Проекты | дерево через `parent_project_id` |
| Согласование WO | только `admin` (supervisor — КБ и статьи; fast-track WO — admin/supervisor) |
| Файлы | Local FS → sync; явные версии |
| Конфликты | manual merge UI |
| Валюта | RUB |
| ПД | 152-ФЗ: consent + audit + RBAC |

---

## 3. Роли и доступ

| Role | Код | Кратко |
|------|-----|--------|
| Админ | `admin` | Всё + склад + approve WorkOrder |
| Работник | `worker` | Создание WO/проектов, станки, списание |
| Научрук | `supervisor` | Ревью КБ/статей, fast-track WO |
| Гость | `guest` | Только публичная витрина |

Micro-roles: `constructor`, `electronics`, `programmer`.

---

## 4. Workflow WorkOrder

```
draft → pending_approval → approved → queued → assigned → in_progress → [post_process] → done | failed
                                                                                         ↘ cancelled
```

- Worker: create, submit, cancel (свой draft)
- Admin: approve / reject; любые переходы статуса
- Admin / supervisor: fast-track `draft → approved`
- Guest: нет доступа к WO

---

## 5. Coding conventions

- TypeScript везде
- NestJS: модуль на домен (`workorders`, `projects`, …)
- React: функциональные компоненты
- БД: `snake_case`; TS API types: как в shared
- ID: UUID; даты API: ISO 8601 UTC
- Комментарии — только неочевидная бизнес-логика
- Не создавать markdown/docs без нужды; при изменении API — обновить `docs/API.md`
- Не коммитить без явной просьбы пользователя

---

## 6. Чеклист перед сдачей изменения

- [ ] Версия bumped + `pnpm version:sync`
- [ ] История в `VERSIONING.md`
- [ ] API/типы в `docs/API.md` и `@fabweb/shared` согласованы
- [ ] Сборка: `pnpm --filter @fabweb/shared build && pnpm --filter @fabweb/api build && pnpm --filter @fabweb/web build`
- [ ] Роли и workflow не нарушены
