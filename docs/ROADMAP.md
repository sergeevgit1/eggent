# 🗺️ Roadmap: Suna → Eggent Migration

> Автономная агентная система с удобством Suna и возможностями OpenClaw
> 
> **Базовый план:** [suna-features-migration-plan.md](./suna-features-migration-plan.md)

---

## 📋 Прогресс

- [ ] Фаза 1: Архитектура + Sandbox (Недели 1-2)
- [ ] Фаза 2: Tool System + Browser (Недели 3-4)
- [ ] Фаза 3: Thread/Memory + UI/UX (Недели 5-6)
- [ ] Фаза 4: Интеграция + Polish (Недели 7-8)

---

## Фаза 1: Архитектура + Sandbox (Недели 1-2)

### 1.1 Sandbox Docker Service
**Сложность:** 7/10 | **Приоритет:** 🔴 Critical

- [ ] Создать Docker API wrapper
- [ ] Prebuilt образы для агентов (Node, Python, Playwright)
- [ ] Resource limits (CPU, RAM, disk)
- [ ] Volume mounts для workspace
- [ ] Cleanup policy для контейнеров

**Критерий успеха:**
- [ ] Агент может запустить код в изолированном контейнере
- [ ] Лимиты ресурсов работают
- [ ] Автоочистка старых контейнеров

**Альтернатива:** Docker API (native)

---

### 1.2 Tool Registry
**Сложность:** 6/10 | **Приоритет:** 🔴 Critical

- [ ] Schema definition для инструментов (Zod)
- [ ] Registry API (CRUD для инструментов)
- [ ] Permission system (какие инструменты доступны агенту)
- [ ] Rate limiting и quotas
- [ ] Tool discovery endpoint

**Критерий успеха:**
- [ ] Новый инструмент регистрируется через API
- [ ] Схема валидации входных/выходных данных
- [ ] Лимиты на вызовы работают

**Альтернатива:** Local registry (JSON/YAML)

---

### 1.3 Agent State Machine
**Сложность:** 5/10 | **Приоритет:** 🔴 Critical

- [ ] States: `planned → running → verifying → done/failed`
- [ ] State transitions с валидацией
- [ ] Persist state в SQLite/PostgreSQL
- [ ] Event hooks (onEnter, onExit)
- [ ] Resume from checkpoint

**Критерий успеха:**
- [ ] Задача проходит через все стейты
- [ ] Можно остановить и возобновить
- [ ] История переходов сохраняется

**Альтернатива:** XState (JS) или собственная реализация

---

### 1.4 Task Queue
**Сложность:** 5/10 | **Приоритет:** 🟡 High

- [ ] BullMQ или собственная очередь
- [ ] Приоритеты задач
- [ ] Retry logic с backoff
- [ ] Dead letter queue
- [ ] Queue monitoring UI

**Критерий успеха:**
- [ ] Задачи выполняются по порядку приоритета
- [ ] Failed задачи ретраятся с экспоненциальным backoff
- [ ] Можно посмотреть очередь в UI

---

## Фаза 2: Tool System + Browser (Недели 3-4)

### 2.1 Core Tools (Must Have)
**Сложность:** 4/10 | **Приоритет:** 🔴 Critical

- [ ] `shell_exec` — выполнение bash команд
- [ ] `python_exec` — выполнение Python кода
- [ ] `file_read` — чтение файлов
- [ ] `file_write` — запись файлов
- [ ] `file_edit` — редактирование файлов
- [ ] `git_ops` — clone, commit, diff, push
- [ ] `search_code` — ripgrep по репозиторию

**Критерий успеха:**
- [ ] Каждый инструмент работает в sandbox
- [ ] Результаты возвращаются в формате JSON
- [ ] Ошибки обрабатываются корректно

---

### 2.2 Web Tools
**Сложность:** 4/10 | **Приоритет:** 🟡 High

- [ ] `web_search` — поиск через SearXNG/Tavily
- [ ] `web_fetch` — fetch URL → markdown
- [ ] `http_request` — generic HTTP client
- [ ] `download_file` — скачивание файлов

**Критерий успеха:**
- [ ] Поиск возвращает релевантные результаты
- [ ] Fetch корректно парсит HTML в MD
- [ ] Поддержка кастомных headers/auth

---

### 2.3 Browser Automation (Playwright)
**Сложность:** 6/10 | **Приоритет:** 🟡 High

- [ ] Playwright в Docker контейнере
- [ ] `browser_navigate` — открыть страницу
- [ ] `browser_snapshot` — получить DOM/скриншот
- [ ] `browser_click` — клик по элементу
- [ ] `browser_type` — ввод текста
- [ ] `browser_eval` — выполнить JS в консоли

**Критерий успеха:**
- [ ] Браузер запускается в sandbox
- [ ] Можно автоматизировать формы
- [ ] Скриншоты сохраняются

**Альтернатива:** Playwright OSS (установлен)

---

### 2.4 VNC Viewer
**Сложность:** 4/10 | **Приоритет:** 🟢 Medium

- [ ] noVNC интеграция
- [ ] Отображение в UI
- [ ] VNC recording
- [ ] Takeover mode (ручное управление)

**Критерий успеха:**
- [ ] Можно смотреть что делает агент в браузере
- [ ] Запись сессии для replay

**Альтернатива:** noVNC (open source)

---

## Фаза 3: Thread/Memory + UI/UX (Недели 5-6)

### 3.1 Thread Management
**Сложность:** 6/10 | **Приоритет:** 🟡 High

- [ ] Thread context scoping
- [ ] Context limits (токены)
- [ ] Rolling summaries
- [ ] Branching (форки тредов)
- [ ] Thread search

**Критерий успеха:**
- [ ] Контекст не превышает лимит токенов
- [ ] Суммаризация работает автоматически
- [ ] Можно форкнуть тред и продолжить с другого места

---

### 3.2 Short-term Memory
**Сложность:** 5/10 | **Приоритет:** 🟡 High

- [ ] In-memory storage для активных тредов
- [ ] TTL для записей
- [ ] Key-value store
- [ ] Expiry policy

**Критерий успеха:**
- [ ] Данные доступны в рамках сессии
- [ ] Автоочистка старых данных

---

### 3.3 Long-term Memory (Vector DB)
**Сложность:** 6/10 | **Приоритет:** 🟢 Medium

- [ ] Qdrant интеграция (уже есть!)
- [ ] Embeddings через local модель
- [ ] Semantic search
- [ ] Memory injection в prompts

**Критерий успеха:**
- [ ] Агент вспоминает предыдущие разговоры
- [ ] Релевантный контекст подставляется автоматически

**Альтернатива:** Qdrant (уже работает)

---

### 3.4 Summarization
**Сложность:** 6/10 | **Приоритет:** 🟢 Medium

- [ ] Auto-summarize при достижении порога
- [ ] Retain vs drop policy
- [ ] Source attribution
- [ ] Summary storage

**Критерий успеха:**
- [ ] Длинные треды автоматически суммаризируются
- [ ] Важная информация не теряется

---

### 3.5 UI Components (Suna-style)
**Сложность:** 5/10 | **Приоритет:** 🟡 High

- [ ] Task timeline component
- [ ] Tool call inspector
- [ ] File browser + preview
- [ ] Browser panel
- [ ] Log viewer
- [ ] Memory summary panel

**Критерий успеха:**
- [ ] Компоненты отображаются корректно
- [ ] Реактивные обновления через WebSocket
- [ ] Responsive design

---

### 3.6 Layout Suna-style
**Сложность:** 5/10 | **Приоритет:** 🟢 Medium

- [ ] Компактный чат + панель действий
- [ ] Side-панели файлов/инструментов
- [ ] Статусы шагов и логов
- [ ] Превью браузера/файлов
- [ ] Темизация (светлая/тёмная)

**Критерий успеха:**
- [ ] Layout похож на Suna
- [ ] Адаптирован под design-system Eggent

---

## Фаза 4: Интеграция + Polish (Недели 7-8)

### 4.1 OpenClaw Adapter
**Сложность:** 4/10 | **Приоритет:** 🟡 High

- [ ] Маппинг tool calls на OpenClaw API
- [ ] Unified error model
- [ ] Telemetry в Eggent UI
- [ ] Session management

**Критерий успеха:**
- [ ] OpenClaw инструменты доступны в Eggent
- [ ] Ошибки отображаются корректно
- [ ] Метрики видны в UI

---

### 4.2 File Conversion Stack
**Сложность:** 5/10 | **Приоритет:** 🟢 Medium

- [ ] PDF ↔ Markdown
- [ ] DOCX → Markdown
- [ ] XLSX → CSV
- [ ] Image convert/resize
- [ ] OCR (optional)

**Критерий успеха:**
- [ ] Конвертация работает для всех форматов
- [ ] Форматирование сохраняется

**Альтернативы:** Pandoc, ImageMagick, Tesseract

---

### 4.3 Observability
**Сложность:** 6/10 | **Приоритет:** 🟢 Medium

- [ ] Structured logging
- [ ] Metrics (prometheus)
- [ ] Tracing (opentelemetry)
- [ ] Alerting
- [ ] Replay functionality

**Критерий успеха:**
- [ ] Логи структурированы и searchable
- [ ] Метрики собираются
- [ ] Можно replay сессию

**Альтернатива:** OpenTelemetry (OSS)

---

### 4.4 Calendar/Email Integration
**Сложность:** 6/10 | **Приоритет:** 🔵 Low

- [ ] Google Calendar read/add
- [ ] Gmail send/read
- [ ] Outlook integration

**Критерий успеха:**
- [ ] Можно создавать события
- [ ] Чтение email работает

---

### 4.5 Notion/Sheets/Docs
**Сложность:** 6/10 | **Приоритет:** 🔵 Low

- [ ] Notion API integration
- [ ] Google Sheets read/write
- [ ] Google Docs create/update

**Критерий успеха:**
- [ ] CRUD операции работают
- [ ] Форматирование сохраняется

---

### 4.6 Documentation & Tests
**Сложность:** 4/10 | **Приоритет:** 🟡 High

- [ ] API documentation (OpenAPI)
- [ ] User guide
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

**Критерий успеха:**
- [ ] Документация полная и актуальная
- [ ] Тесты проходят в CI

---

## 📊 Статистика

| Фаза | Задач | Критических | Выполнено | Прогресс |
|------|-------|-------------|-----------|----------|
| Фаза 1 | 4 | 3 | 0 | 0% |
| Фаза 2 | 4 | 1 | 0 | 0% |
| Фаза 3 | 6 | 2 | 0 | 0% |
| Фаза 4 | 6 | 1 | 0 | 0% |
| **Итого** | **20** | **7** | **0** | **0%** |

---

## 🎯 Приоритеты

### 🔴 Critical (Блокирует запуск)
1. Sandbox Docker Service
2. Tool Registry
3. Agent State Machine
4. Core Tools (shell, python, file)

### 🟡 High (Нужно для MVP)
5. Task Queue
6. Web Tools
7. Browser Automation
8. UI Components
9. Thread Management

### 🟢 Medium (Улучшает UX)
10. VNC Viewer
11. Short-term Memory
12. Long-term Memory
13. Summarization
14. Layout Suna-style
15. OpenClaw Adapter
16. File Conversion
17. Observability

### 🔵 Low (Nice to have)
18. Calendar/Email
19. Notion/Sheets/Docs

---

## 📝 Правила работы с Roadmap

1. **После выполнения задачи:**
   - [x] Пометить галочкой в этом файле
   - [ ] Закоммитить изменение roadmap
   - [ ] Обновить статистику прогресса

2. **Если задача блокируется:**
   - Создать issue с тегом `blocked`
   - Указать причину и зависимости

3. **При добавлении новой задачи:**
   - Оценить сложность (1-10)
   - Определить приоритет
   - Добавить критерий успеха

---

## 🔗 Ссылки

- **План миграции:** [suna-features-migration-plan.md](./suna-features-migration-plan.md)
- **Репозиторий:** https://github.com/eggent-ai/eggent
- **Suna (reference):** https://github.com/kortix-ai/suna

---

*Последнее обновление: 2026-03-01*
*Следующее обновление roadmap: после завершения Фазы 1*
