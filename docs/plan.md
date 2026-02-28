# Eggent Implementation Plan — Suna Feature Parity Roadmap

## Цель
Внедрить в Eggent ключевые product/agent-фичи уровня Suna:
- зрелая память (операционка + контроль + наблюдаемость),
- knowledge base как отдельный слой,
- triggers/автозапуски,
- надежный MCP-runtime,
- sandbox pool для снижения cold-start,
- фоновые аналитические воркеры.

---

## Принципы внедрения
1. **Не ломаем текущий UX**: делаем инкрементально через feature flags.
2. **Сначала наблюдаемость, потом автоматизация**.
3. **Разделяем сущности**:
   - Chat Memory (короткая/операционная),
   - Long-term Memory (векторная память),
   - Knowledge Base (документы/артефакты).
4. **Fail-safe по умолчанию**: если новый модуль недоступен — чат продолжает работу.
5. **Каждый этап завершается**: API + UI + telemetry + docs + migration.

---

## Scope (что внедряем)

### A. Memory 2.0 (Always-on + управляемая)
- [ ] Always-on retrieval уже включен — доработать governance.
- [ ] API для памяти:
  - [ ] `GET /api/memory/stats`
  - [ ] `GET /api/memory/list`
  - [ ] `DELETE /api/memory/:id`
  - [ ] `POST /api/memory/toggle` (project/chat scoped)
- [ ] Политики памяти:
  - [ ] similarity threshold per project/chat,
  - [ ] retrieval top-k,
  - [ ] auto-save mode (off|important|all),
  - [ ] dedupe rule.
- [ ] UI:
  - [ ] индикатор memory hits в чате,
  - [ ] страница Memory в Settings,
  - [ ] ручное удаление/очистка.
- [ ] Метрики:
  - [ ] hit-rate,
  - [ ] precision proxy (feedback),
  - [ ] avg retrieval latency.

### B. Knowledge Base
- [ ] Модель данных:
  - [ ] folders,
  - [ ] entries (file, summary, embedding refs),
  - [ ] link entry ↔ project/agent.
- [ ] API:
  - [ ] CRUD folders,
  - [ ] upload entries,
  - [ ] assign folders to project/agent,
  - [ ] size limits/validation.
- [ ] Ingestion pipeline:
  - [ ] extract text,
  - [ ] chunk,
  - [ ] embed,
  - [ ] index.
- [ ] UI:
  - [ ] KB page (folder tree + file list),
  - [ ] attach/detach к проекту,
  - [ ] прогресс обработки.

### C. Triggers & Automation
- [ ] Trigger engine v1:
  - [ ] cron schedule,
  - [ ] webhook trigger,
  - [ ] manual test run.
- [ ] API:
  - [ ] `GET /api/triggers/providers`
  - [ ] `GET /api/triggers`
  - [ ] `POST /api/triggers`
  - [ ] `PATCH /api/triggers/:id`
  - [ ] `DELETE /api/triggers/:id`
  - [ ] `GET /api/triggers/upcoming`
- [ ] Runtime:
  - [ ] idempotency key,
  - [ ] retries + dead-letter,
  - [ ] execution logs.
- [ ] UI:
  - [ ] список триггеров,
  - [ ] upcoming runs,
  - [ ] run history.

### D. MCP Runtime Hardening
- [ ] Перейти на модель **ephemeral connect-use-disconnect**.
- [ ] Кешировать metadata MCP servers (TTL + LRU), не живые сессии.
- [ ] Ввести taxonomy ошибок:
  - [ ] config/auth/connect/tool-exec/timeout.
- [ ] Safe URL и security checks для MCP endpoints.
- [ ] UI/Logs:
  - [ ] tool health,
  - [ ] последние ошибки MCP.

### E. Sandbox Pool
- [ ] Pool service:
  - [ ] min/max pool size,
  - [ ] claim/replenish/cleanup,
  - [ ] keepalive.
- [ ] Метрики:
  - [ ] pool hit-rate,
  - [ ] claim latency,
  - [ ] expired count.
- [ ] Config:
  - [ ] feature flag,
  - [ ] лимиты ресурсов,
  - [ ] auto-disable при деградации.

### F. Background Conversation Analytics
- [ ] Очередь аналитики:
  - [ ] pending/processing/completed/failed,
  - [ ] retries (max attempts),
  - [ ] atomic claim (`SKIP LOCKED` pattern).
- [ ] Анализ:
  - [ ] intent/topic clustering,
  - [ ] quality signals,
  - [ ] tool-usage diagnostics.
- [ ] UI/экспорт:
  - [ ] dashboard с агрегатами,
  - [ ] фильтры по проекту/периоду.

---

## Архитектура (целевая)

### Data domains
1. **chat_messages** — текущие диалоги.
2. **memory_items** — факты/инсайты/предпочтения + embedding metadata.
3. **kb_folders / kb_entries** — документы и их индексация.
4. **trigger_defs / trigger_runs** — автоматизации.
5. **mcp_servers_cache** — кеш конфигов/метаданных MCP.
6. **sandbox_pool_state** — пул подготовленных окружений.
7. **conversation_analytics_queue/results** — асинхронный анализ.

### Runtime flow (chat)
1. User message →
2. always-on memory retrieval (top-k) + optional KB retrieval →
3. model/tools execution →
4. optional auto-save memory (policy-based) →
5. async analytics enqueue.

---

## Поэтапный план релизов

## Milestone 1 — Memory Governance + Observability (P0)
**Срок:** 3–5 дней  
**Deliverables:**
- Memory API + UI stats/list/delete,
- per-project memory policy,
- memory hit indicator,
- telemetry + docs.

**Acceptance criteria:**
- [ ] можно увидеть, что и почему попало из памяти;
- [ ] можно удалить/очистить;
- [ ] retrieval latency p95 в пределах target.

## Milestone 2 — Triggers v1 (P1)
**Срок:** 5–7 дней  
**Deliverables:**
- cron/webhook triggers,
- upcoming runs + history,
- retries/idempotency.

**Acceptance criteria:**
- [ ] триггер запускает агент без ручного чата;
- [ ] повторный delivery не дублирует эффект;
- [ ] ошибки видны в run history.

## Milestone 3 — Knowledge Base v1 (P1)
**Срок:** 5–8 дней  
**Deliverables:**
- KB folders/files,
- ingestion + embeddings,
- project/agent assignment,
- retrieval in prompt pipeline.

**Acceptance criteria:**
- [ ] можно загрузить документы и получить ответы с опорой на KB;
- [ ] ограничения по размеру/валидации работают;
- [ ] progress/processing status отображается.

## Milestone 4 — MCP Hardening (P2)
**Срок:** 4–6 дней  
**Deliverables:**
- ephemeral MCP execution,
- metadata cache,
- error taxonomy,
- health logs.

**Acceptance criteria:**
- [ ] нет утечек зависших MCP session;
- [ ] tool failures классифицированы и понятны;
- [ ] деградация не ломает чат.

## Milestone 5 — Sandbox Pool (P2)
**Срок:** 4–6 дней  
**Deliverables:**
- pool service + metrics,
- claim/replenish/cleanup,
- config flags.

**Acceptance criteria:**
- [ ] median cold-start заметно снижен;
- [ ] pool hit-rate стабилен;
- [ ] истекшие sandbox корректно чистятся.

## Milestone 6 — Background Analytics (P2)
**Срок:** 4–7 дней  
**Deliverables:**
- analytics queue + worker,
- basic clustering/reporting,
- dashboard summary.

**Acceptance criteria:**
- [ ] аналитика не влияет на latency online-ответа;
- [ ] queue стабильно обрабатывается;
- [ ] можно видеть тренды по качеству/темам.

---

## Технические задачи (конкретика для реализации)

### Backend
- [ ] Добавить schema migrations для memory/KB/triggers/analytics/pool.
- [ ] Вынести retrieval adapters:
  - [ ] `memoryRetrievalAdapter`
  - [ ] `kbRetrievalAdapter`
- [ ] Ввести unified feature flags в settings.
- [ ] Добавить job runner/worker bootstrap.
- [ ] Добавить structured logging + trace ids.

### Frontend
- [ ] Settings: Memory / KB / Triggers разделы.
- [ ] Chat: memory hits badge + источник контекста.
- [ ] KB manager UI.
- [ ] Trigger builder UI + upcoming runs.
- [ ] Analytics dashboard (MVP).

### DevOps
- [ ] Обновить docker-compose для worker сервисов.
- [ ] Healthchecks для API + worker + queue.
- [ ] Alerts по error rate и queue lag.

### QA
- [ ] E2E сценарии: memory retrieval, trigger execution, KB retrieval.
- [ ] Нагрузочный тест: first-token latency до/после.
- [ ] Chaos: отключение MCP/sandbox/worker.

---

## Риски и как страхуем
1. **Рост сложности** → внедрять по feature flags, этапами.
2. **Падение latency** → budgets + perf gates в CI.
3. **Некачественное auto-save memory** → confidence threshold + dedupe + review.
4. **Queue overload** → bounded concurrency + backoff + dead-letter.

---

## KPI/метрики успеха
- Time-to-first-token (p50/p95)
- Memory hit-rate + user feedback signal
- Trigger success rate
- KB retrieval relevance proxy
- MCP tool success rate
- Sandbox claim latency & pool hit-rate
- Queue lag and analytics completion rate

---

## Порядок выполнения (рекомендуемый)
1. Milestone 1 (Memory governance)
2. Milestone 2 (Triggers)
3. Milestone 3 (Knowledge Base)
4. Milestone 4 (MCP hardening)
5. Milestone 5 (Sandbox pool)
6. Milestone 6 (Analytics worker)

---

## Definition of Done (на каждый модуль)
- [ ] Код + тесты + миграции
- [ ] UI + telemetry
- [ ] Документация (`docs/*`)
- [ ] Feature flag + rollback strategy
- [ ] Production checklist пройден

---

## Следующий шаг
После утверждения этого `docs/plan.md`:
1) создать `docs/implementation-backlog.md` с разбивкой по задачам (issue-ready),
2) открыть batch задач по Milestone 1,
3) начать реализацию с Memory Governance.
