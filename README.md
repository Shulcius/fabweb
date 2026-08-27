# fabweb — запуск приложения

Offline-first платформа мини-фабрики и конструкторского бюро.

Текущая версия: см. файл [`VERSION`](./VERSION) в корне.

---

## Требования

- **Node.js** ≥ 20
- **pnpm** 9 (`corepack enable` или `npm i -g pnpm@9`)
- **PostgreSQL** 16 (локально или через Docker)
- Опционально: **Redis** (в docker-compose есть, для MVP API пока может работать без него)
- **Docker** — удобно поднять Postgres/Redis одной командой

---

## Быстрый старт

### 1. Клонирование и зависимости

```bash
git clone https://github.com/Shulcius/fabweb.git
cd fabweb
pnpm install
```

### 2. База данных

**Вариант A — Docker (рекомендуется):**

```bash
pnpm db:up
```

Поднимает Postgres (`localhost:5432`, user/password/db: `fabweb`) и Redis (`6379`).

**Вариант B — свой PostgreSQL:** создайте БД и пользователя `fabweb` / `fabweb`.

### 3. Переменные окружения

```bash
cp .env.example apps/api/.env
```

При необходимости отредактируйте `DATABASE_URL` и `JWT_SECRET` в `apps/api/.env`.

### 4. Схема БД и демо-данные

```bash
pnpm --filter @fabweb/shared build
pnpm --filter @fabweb/costing build
cd apps/api
npx prisma generate
npx prisma db push
pnpm db:seed
cd ../..
```

> Если у пользователя БД нет прав на `CREATE DATABASE` для shadow DB Prisma migrate — используйте `db push`, как выше.

### 5. Запуск в режиме разработки

В двух терминалах:

```bash
pnpm dev:api    # http://localhost:3000/api/v1
pnpm dev:web    # http://localhost:5173
```

Или одной командой (после сборки shared/costing):

```bash
pnpm start
```

Откройте в браузере: **http://localhost:5173**

Проверка API: **http://localhost:3000/api/v1/health**

---

## Демо-пользователи (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@fab.local` | `admin123` |
| Работник | `worker@fab.local` | `worker123` |
| Научрук | `supervisor@fab.local` | `supervisor123` |
| Гость | `guest@fab.local` | `guest123` |

---

## Полезные команды

| Команда | Назначение |
|---------|------------|
| `pnpm dev:api` | NestJS API с watch |
| `pnpm dev:web` | Vite + React |
| `pnpm db:up` | Postgres + Redis (Docker) |
| `pnpm --filter @fabweb/api db:seed` | Перезалить seed |
| `pnpm build` | Сборка всех пакетов |
| `pnpm version:sync` | Синхронизация версии из `/VERSION` |

---

## Структура

```
fabweb/
├── apps/api/       # NestJS + Prisma
├── apps/web/       # React + Vite
├── packages/shared/
├── packages/costing/
├── deploy/local/   # docker-compose
└── docs/           # правила, API, версионирование
```

Правила проекта: [`docs/RULES.md`](./docs/RULES.md).

---

## Остановка

Остановите процессы `pnpm dev:api` / `pnpm dev:web` (Ctrl+C).

Docker Postgres/Redis:

```bash
docker compose -f deploy/local/docker-compose.yml down
```

---

## Известные ограничения MVP

- Коннекторы станков (Moonraker/OctoPrint) — заглушки; статус станков задаётся вручную
- Нет auto-assignment очереди, склада, sync в облако
- Калькулятор в UI временно скрыт (API `/costing` доступен)
