# Prompt Memory — Project Context

## Что это за приложение

**Prompt Memory** — высокопроизводительная система управления промптами.
Хранит, организует, ищет и отображает 50k+ AI-промптов с привязанными изображениями.

**Стек:**
- Next.js 15 (App Router) + React 19
- TailwindCSS v4 + Framer Motion
- React Query v5 + @tanstack/react-virtual
- SQLite (better-sqlite3) — миграция на PostgreSQL предусмотрена архитектурно
- Sharp — обработка изображений на сервере

---

## Что уже сделано

### ✅ Step 1 — Project Bootstrap

**Файлы:**
- `package.json` — все зависимости
- `tsconfig.json` — strict TypeScript, path alias `@/*`
- `next.config.ts` — unoptimized images (Sharp сам ресайзит), immutable cache headers
- `tailwind.config.ts` — полная дизайн-система через CSS-переменные
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `.gitignore` — игнорирует `data/`, `uploads/`
- `.env.local` — `DB_PATH`, `UPLOADS_DIR`, `NEXT_PUBLIC_APP_NAME`
- `src/lib/types.ts` — все доменные типы: `Prompt`, `PromptImage`, `Tag`, `PromptListItem`, `PromptFilters`, `PaginatedResponse`
- `src/lib/constants.ts` — `DEFAULT_PAGE_SIZE`, `IMAGE_VARIANTS`, `ROUTES`, размеры виртуальной сетки
- `src/lib/utils.ts` — `cn()`, форматтеры дат, `imageUrl()`, `formatBytes()`, `truncate()`
- `src/app/globals.css` — тёмная дизайн-система, skeleton shimmer, `.prose-prompt`
- `src/app/layout.tsx` — root layout, шрифты Geist
- `src/app/providers.tsx` — React Query Provider (staleTime 30s, gcTime 5m, retry 1)
- `src/app/page.tsx` — redirect на `/prompts`

**Дизайн-токены (CSS vars):**
```
--surface, --surface-raised, --surface-overlay
--border, --border-subtle
--text, --text-muted, --text-subtle
--accent (violet), --danger
--radius-sm/md/lg/xl
```

---

### ✅ Step 2 — Database Layer

**Файлы:**
- `src/lib/db/index.ts` — singleton с 7 pragma (WAL, 64MB cache, 512MB mmap, temp=MEMORY, busy_timeout=5s), автозапуск миграций при первом подключении
- `src/lib/db/migrations/001_initial.ts` — полная схема
- `src/lib/db/migrate.ts` — CLI runner: `migrate`, `--status`, `--rollback <version>`
- `src/lib/db/queries/prompts.ts` — репозиторий промптов
- `src/lib/db/queries/images.ts` — репозиторий изображений
- `src/lib/db/queries/tags.ts` — репозиторий тегов

**Схема БД:**
```sql
prompts          -- id (ULID), title, body, model, notes, is_favorite, created_at, updated_at
tags             -- id (autoincrement), name (UNIQUE COLLATE NOCASE)
prompt_tags      -- prompt_id FK, tag_id FK  (M:N)
prompt_images    -- id (ULID), prompt_id FK, filename, width, height, size_bytes, created_at
prompts_fts      -- FTS5 virtual table (content='prompts', porter unicode61)
schema_migrations -- version, name, applied_at
```

**Индексы:**
```
idx_prompts_created_at, idx_prompts_updated_at
idx_prompts_is_favorite (partial WHERE is_favorite=1)
idx_prompts_model (partial WHERE model IS NOT NULL)
idx_prompts_favorite_created
idx_prompt_tags_tag_id
idx_prompt_images_prompt_id, idx_prompt_images_created_at
```

**Триггеры:**
- `prompts_updated_at` — автообновление updated_at
- `prompts_fts_ai/ad/au` — синхронизация FTS5 индекса

**Ключевые функции репозиториев:**

`queries/prompts.ts`:
- `findManyPrompts(filters)` — keyset pagination (O(1) на любой глубине), CTE + GROUP_CONCAT (0 N+1 запросов), поддержка FTS5 поиска, фильтр по тегам (AND-семантика), модели, избранному
- `findPromptById(id)` — промпт с тегами и изображениями
- `createPrompt(input)` — транзакция: вставка + назначение тегов
- `updatePrompt(id, input)` — динамический SET, пересинхронизация тегов
- `deletePrompt(id)`
- `toggleFavorite(id)`
- `searchPrompts(query, filters)` — обёртка над findMany с FTS5
- `getPromptStats()` — total, favorites, with_images, models

`queries/images.ts`:
- `findImagesByPromptId`, `findImageById`, `createImage`, `deleteImage`, `deleteImagesByPromptId`, `countImagesByPromptId`, `getImageStorageStats`

`queries/tags.ts`:
- `findAllTags`, `findTagByName`, `findOrCreateTag`, `getPopularTags(limit)`, `searchTags(query)`, `deleteTag`, `pruneOrphanTags`, `renameTag`

**Pagination стратегия:**
Cursor кодируется как `base64url(JSON({ val, id }))`. Курсор несёт значение sort-колонки + id последней строки для tiebreaking. Это O(1) в отличие от OFFSET.

---

### ✅ Seed Script

**Файл:** `src/lib/db/seed.ts`

```bash
npm run db:seed   # добавить seed-данные
npm run db:reset  # очистить и пересидировать
```

**100 промптов** в 12 категориях:
- Writing & Content (10), Code & Engineering (12), AI Image Generation (10)
- Data Analysis (8), Product & Strategy (8), Research & Reasoning (6)
- System & Meta Prompts (8), Customer & UX (6), Growth & Marketing (6)
- Operations & HR (6), Education & Learning (10), Finance & Productivity (10)

**Данные:** 38 избранных, 96 тегов, 340 tag-assignments, 10 моделей, даты размазаны на ~53 дня назад.

---

## Что сделано дополнительно

### ✅ Step 3 — Storage Layer
**Файлы к созданию:**
- `src/lib/storage/index.ts` — Sharp pipeline: при загрузке генерирует `thumb.webp` (320×320) и `medium.webp` (1280×1280) + сохраняет `original.{ext}`
- Структура папок: `uploads/{imageId}/original.ext`, `uploads/{imageId}/thumb.webp`, `uploads/{imageId}/medium.webp`
- Функции: `saveImage(file, imageId)`, `deleteImageFiles(imageId)`, `getImagePath(imageId, variant)`

### ✅ Step 4 — API Routes
**Файлы к созданию:**
```
src/app/api/prompts/route.ts          GET list + POST create
src/app/api/prompts/[id]/route.ts     GET one + PATCH update + DELETE
src/app/api/images/route.ts           POST upload
src/app/api/images/[id]/route.ts      DELETE
src/app/api/images/[id]/file/route.ts GET file (с ?v=thumb|medium|original)
src/app/api/tags/route.ts             GET list + GET search
src/app/api/stats/route.ts            GET stats
```

### ✅ Step 5 — React Query Hooks
```
src/hooks/usePrompts.ts     usePrompts, usePrompt, useCreatePrompt, useUpdatePrompt, useDeletePrompt, useToggleFavorite
src/hooks/useImages.ts      useUploadImage, useDeleteImage
src/hooks/useTags.ts        useTags, useSearchTags
```

### ✅ Step 6 — UI Primitives (src/components/ui/)
```
Button.tsx, Input.tsx, Textarea.tsx, Badge.tsx
Dialog.tsx, Tooltip.tsx, Dropdown.tsx
Skeleton.tsx, EmptyState.tsx, Spinner.tsx
```

### ✅ Step 7 — Layout Components (src/components/layout/)
```
Sidebar.tsx      — навигация, статистика, фильтр по тегам
Header.tsx       — поиск, кнопка "New Prompt"
AppShell.tsx     — обёртка с sidebar + main content
```

### ✅ Step 8 — Domain Components
```
src/components/prompts/
  PromptCard.tsx          — карточка в сетке (lazy image, теги, модель)
  PromptGrid.tsx          — виртуализированная сетка (react-virtual)
  PromptList.tsx          — виртуализированный список
  PromptFilters.tsx       — панель фильтров (поиск, теги, модель, избранное)
  PromptForm.tsx          — форма создания/редактирования
  PromptDetail.tsx        — детальный вид промпта

src/components/images/
  ImageUploader.tsx       — drag & drop + preview
  ImageGallery.tsx        — сетка изображений промпта
  ImageLightbox.tsx       — полноэкранный просмотр
```

### ✅ Step 9 — Pages
```
src/app/prompts/page.tsx        — главная страница (сетка/список + фильтры)
src/app/prompts/new/page.tsx    — создание промпта
src/app/prompts/[id]/page.tsx   — детальный вид промпта
```

---

## NPM скрипты

```bash
npm run dev          # Next.js dev server (turbopack)
npm run build        # production build
npm run db:migrate   # применить pending миграции
npm run db:seed      # добавить seed данные
npm run db:reset     # очистить БД и пересидировать
```

---

## Архитектурные решения для будущего

| Решение | Почему |
|---|---|
| Keyset pagination | OFFSET деградирует на 50k+ строк — O(N) против O(1) |
| CTE + GROUP_CONCAT в одном запросе | Нет N+1 для тегов и изображений в списке |
| Repository pattern | Изолирует SQL — при миграции на PostgreSQL меняется только драйвер в `src/lib/db/index.ts` |
| Sharp на сервере, unoptimized в Next.js | Полный контроль над вариантами, immutable URLs |
| ULID как PK | Lexicographically sortable + collision-free + URL-safe |
| FTS5 content table с триггерами | Нет дублирования данных, автосинхронизация |
| WAL mode + busy_timeout | Concurrent reads без блокировок |

---

## Следующий шаг

**Все шаги (3–9) завершены.** Приложение полностью реализовано.

Для запуска:
```bash
npm run db:seed   # заполнить БД 100 промптами
npm run dev       # запустить dev-сервер
```

Открыть: http://localhost:3000
