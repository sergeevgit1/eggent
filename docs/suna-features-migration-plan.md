# Suna → Eggent: план миграции фич и архитектуры

> Контекст: Eggent (MIT) — базовая платформа. Suna (KPSL) — только reference. Код не копируем, берём идеи/архитектуру/UX. Цель — автономная агентная система. UI/UX Suna можно переиспользовать полностью.

## 1. Архитектура интеграции

### Что берем из Suna (идеи, паттерны)
- **Agent-centric ядро**: планирование → выполнение → контроль качества → пост‑обработка.
- **Tool-first дизайн**: инструменты как расширяемые плагины с декларативными схемами ввода/вывода.
- **Sandbox-per-task**: изоляция окружения, воспроизводимость, безопасность.
- **Пакетная асинхронность**: фоновые задачи, мониторинг, retries, streaming‑статусы.
- **Unified UI**: чат + панель инструментов + файловый менеджер + лог задач.
- **Reasoning trace/steps** (опционально): для диагностики и объяснимости.
- **Thread & memory policy**: контролируемое хранение контекста + суммаризация.

### Что оставляем в Eggent
- **Кодовую базу и лицензирование MIT.**
- **Существующий стек (Next.js/TS/Node)** и текущие API/модули.
- **Собственные сервисы** (например, data-слой, auth, UI компоненты Eggent).
- **Общий подход к dev‑процессам, CI/CD и тестам.**

### Общая схема системы
- **UI (Eggent)**: Chat, Task Runner, Files, Tools, Browser, Logs.
- **Orchestrator**: планирование/маршрутизация действий + state‑машина.
- **Sandbox Service**: изолированные среды для tool‑исполнения.
- **Tool Registry**: схемы, доступы, рейтинги надёжности, политики.
- **Memory/Thread Service**: хранение, суммаризация, retrieval.
- **Observability**: логи, метрики, трассировки, replay.

---

## 2. Sandbox System

### Зачем агенту sandbox
- **Безопасность**: изоляция исполнения кода/файлов/браузера.
- **Воспроизводимость**: одинаковая среда для повторных запусков.
- **Ограничение ресурсов**: CPU/RAM/FS лимиты.
- **Управление зависимостями**: prebuilt образы, быстрый запуск.

### Opensource альтернативы
- **Daytona** (workspaces, dev containers)
- **E2B** (micro‑VMs, быстрый lifecycle)
- **Свой Docker‑оркестратор** (docker API + prebuilt images)

### Сравнение, выбор, обоснование
| Критерий | Daytona | E2B (OSS часть) | Свой Docker |
|---|---|---|---|
| Запуск за сек | средне | быстро | зависит от образов |
| Изоляция | контейнеры | microVM | контейнеры |
| Стоимость внедрения | средняя | средняя | высокая |
| Контроль инфраструктуры | высокий | средний | максимальный |
| Offline/локально | да | частично | да |

**Рекомендация**: старт с **своего Docker‑оркестратора** (максимальный контроль, MIT‑friendly), затем оценить интеграцию **Daytona** для dev‑workflow. E2B — опционально для micro‑VM, если нужна жёсткая изоляция.

---

## 3. Tool System

### Какие инструменты нужны (30+; список ориентирован на Suna‑подход)
**Core/OS**
1. Shell exec (bash)
2. Python exec
3. Node exec
4. Git (clone, commit, diff, PR)
5. File read/write/edit
6. Search in repo (ripgrep)
7. Environment info (os, disk, memory)

**Web/Network**
8. Web search
9. Web fetch (HTML→MD)
10. HTTP client (REST)
11. Download/upload files
12. RSS/feeds fetch

**Browser/Automation**
13. Browser open/navigate
14. Browser snapshot
15. Browser click/type
16. Browser upload
17. Browser console eval
18. VNC session attach

**Data/Docs**
19. CSV parse/transform
20. JSON/YAML validate
21. Markdown render/convert
22. PDF extract
23. Image resize/convert
24. OCR (optional)

**Productivity**
25. Calendar read/add
26. Email send/read
27. Task manager (Todoist)
28. Notion create/update
29. Sheets read/write
30. Docs create/update

**DevOps/Infra**
31. Docker build/run
32. Logs/metrics fetch
33. Service healthcheck
34. Secrets/Env manager

**AI/Agent**
35. Summarize thread
36. Memory store/retrieve
37. Critic/validator tool
38. Planner tool (task decomposition)

> Можно расширить в следующих итерациях (Slack/Discord/Jira/Linear/Figma). Главное — стандартизировать схемы и политики.

### Приоритеты
**Must have**
- Shell/Python/Node exec
- File ops (read/write/edit)
- Web search + fetch
- Browser automation (open/snapshot/click/type)
- Git базовые операции
- Summarize + memory store

**Nice to have**
- Calendar/Email/Docs/Sheets/Notion
- OCR, PDF, image tools
- DevOps: healthcheck, logs
- VNC control

### Local реализации
- Использовать OpenClaw инструменты как backend: `exec`, `read`, `write`, `edit`, `browser`, `web_search`, `web_fetch`, `nodes`.
- Слой абстракции в Eggent для регистрации/политик/ограничений (timeouts, retries, size limits).

---

## 4. Agent Runner

### Автономное выполнение задач
- Очередь задач (FIFO/priority)
- Стейт‑машина: `planned → running → verifying → done/failed`
- Лимиты времени и числа шагов
- Фоновое выполнение + live‑лог

### State management
- Persisted state: steps, tool calls, outputs, errors
- Checkpointing для resumable задач
- Версионирование prompt/context

### Обработка ошибок и retry
- Политика retry по классам ошибок
- Backoff стратегии
- Auto‑fallback на альтернативные инструменты
- Manual intervention hooks

---

## 5. Thread Management

### Контекст диалогов
- Scoping: task‑specific context + глобальный профиль
- Политика максимального контекста
- Контекстные сводки (rolling summaries)

### Память агента
- Краткосрочная (в рамках треда)
- Долгосрочная (векторное хранилище)
- Permissions/PII фильтры

### Суммаризация
- Автоматическая при достижении порогов
- Политика «retain vs drop»
- Ссылки на источники (tool outputs)

---

## 6. Browser Automation

### Playwright в sandbox
- Запуск Playwright в контейнере
- Автоподготовленные браузерные образы
- Ограничение сети/ресурсов

### VNC доступ
- VNC для «живого» наблюдения
- Снимки/рекорды
- Возможность takeover пользователем

### Сценарии использования
- Авторизация в веб‑сервисах
- Заполнение форм
- Парсинг динамического контента
- Проверка UI/UX изменений

---

## 7. File Operations

### Работа с файлами в sandbox
- Read/write/edit
- Upload/download
- Versioning файлов

### Конвертация форматов
- PDF↔MD
- DOCX→MD
- XLSX→CSV
- Image convert/resize

### Preview и редактирование
- Preview в UI
- Inline‑редактор
- Diff‑view

---

## 8. UI/UX из Suna

### Что нравится в интерфейсе Suna
- Компактный чат + панель действий
- Side‑панели файлов/инструментов
- Статусы шагов и логов
- Превью браузера/файлов

### Как адаптировать для Eggent
- Сохранить layout, адаптировать под design‑system Eggent
- Модульная структура UI
- Темизация

### Компоненты для реализации
- Task timeline
- Tool call inspector
- File browser + preview
- Browser panel
- Log viewer
- Memory summary panel

---

## 9. OpenClaw Integration

### Инструменты OpenClaw
- `exec`, `read`, `write`, `edit`
- `web_search`, `web_fetch`
- `browser` (snapshot/act)
- `nodes` (screen/camera)

### Сессии и агенты
- Каждая задача → отдельная сессия
- Суб‑агенты под сложные эпики
- Лимиты на параллелизм

### Связка с Eggent
- Adapter слой для маппинга tool calls
- Unified error model
- Telemetry в Eggent UI

---

## 10. Roadmap

### Фазы внедрения по неделям
**Недели 1–2: Архитектура + Sandbox**
- (1) Sandbox Docker‑service
- (2) Tool registry + базовые инструменты
- (3) State machine для задач

**Недели 3–4: Tool System + Browser**
- (4) Browser automation (Playwright)
- (5) File ops + conversion
- (6) Observability

**Недели 5–6: Thread/Memory + UI/UX**
- (7) Thread management + summarization
- (8) UI компоненты Suna‑style
- (9) OpenClaw integration

### Приоритеты
1) Sandbox + Tool system
2) Agent Runner
3) Browser + File ops
4) Thread/Memory
5) UI/UX polish

### Оценка сложности (1–10) и описание фич
| Фича | Что внедряем | Зачем агенту | Что даст системе | Альтернатива (OSS/локально) | Сложность |
|---|---|---|---|---|---|
| Sandbox Docker | контейнеры для tool‑run | безопасность/изоляция | стабильность, контроль | Docker API | 7 |
| Tool Registry | реестр инструментов | расширяемость | быстрее подключать инструменты | local registry | 6 |
| Agent State Machine | стейты задач | устойчивость | управляемые пайплайны | xstate | 5 |
| Playwright in Sandbox | браузер‑авто | web‑tasks | автоматизация UI | Playwright OSS | 6 |
| VNC Viewer | наблюдение | контроль | прозрачность | noVNC | 4 |
| File Ops | файловые операции | data work | удобство работы | fs + converters | 4 |
| Conversion Stack | PDF/DOCX/IMG | контент | совместимость | pandoc, imagemagick | 5 |
| Thread Summarizer | авто‑сводки | экономия токенов | качество контекста | local LLM | 6 |
| Long‑term Memory | векторный поиск | recall | персонализация | Qdrant | 6 |
| UI Suna Layout | интерфейс | UX | adoption | local UI | 5 |
| Observability | логи/метрики | дебаг | стабильность | OpenTelemetry | 6 |
| OpenClaw Adapter | слой интеграции | совместимость | быстрый запуск | local adapter | 4 |
