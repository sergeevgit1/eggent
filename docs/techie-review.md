# Techie Review — Roadmap Suna → Eggent

Дата: 2026‑03‑01

## Краткий вывод
План в целом логичен, но есть **перекос по зависимостям и приоритетам**: OpenClaw Adapter и базовая Observability должны начаться раньше; Task Queue ближе к critical для устойчивого MVP; UI/UX недооценена по сложности. Для 3 агентов (Коджи, Докер, Верстальщик) 8 недель **плотно** — без ранней вертикальной «сквозной» сборки риски по интеграции и срокам высокие.

---

## 1) Корректность фаз и приоритетов
**Ок:**
- Фаза 1 — инфраструктурная база (sandbox + registry + state machine).
- Фаза 2 — инструменты и браузер.
- Фаза 3 — контекст/память + UI.
- Фаза 4 — интеграция/полировка.

**Что стоит поправить:**
- **OpenClaw Adapter** должен быть **раньше** (Фаза 2), т.к. без него часть tool-системы не заработает и тестирование будет искусственным.
- **Task Queue** по рискам и влиянию на стабильность ближе к **Critical** (или ранний MVP вариант очереди в Фазе 1.5).
- **Observability (минимум логирование/метрики)** начать с Фазы 1, иначе отладка sandbox/tools будет болезненной.
- **UI Components** как «high» ок, но **дизайн/реактивность** недооценены — фактически 6/10 и сквозная зависимость для валидации фич.

---

## 2) Оценки сложности (1–10) — корректировки
**Рекомендованные сдвиги:**
- Sandbox Docker Service: **7 → 8** (лимиты, volume mounts, cleanup, безопасность).
- Tool Registry: **6 → 7** (schema + permissions + rate limit + quotas).
- Agent State Machine: **5 → 6** (persist, transitions, resume).
- Browser Automation: **6 → 7** (Playwright в контейнере, стабильность, storage).
- Thread Management: **6 → 7** (контекст/summary/branching/search).
- UI Components: **5 → 6** (WS, панели, инспекторы, responsive).
- Calendar/Email: **6 → 7** (OAuth, quotas, edge cases).

Остальные оценки выглядят реалистично.

---

## 3) Последовательность зависимостей
**Критические зависимости (явно зафиксировать):**
- Core Tools **зависят** от Sandbox + Tool Registry.
- Web Tools **зависят** от Core Tools (http client + файловые операции).
- Browser Automation **зависит** от Sandbox + Core Tools.
- VNC Viewer **зависит** от Browser Automation.
- Thread Management **зависит** от State Machine + Task Queue.
- Short-term Memory **зависит** от Thread Management.
- Long-term Memory **зависит** от embeddings pipeline + thread context.
- Summarization **зависит** от Thread Management/Memory.
- UI Components **зависят** от core событий/логов/модели сессий.
- Layout **зависит** от UI Components.
- OpenClaw Adapter **должен быть до** полной Tool System (иначе «моки»).

---

## 4) Достаточность ресурсов (3 агента)
**Риски:**
- 3 человека на 20 крупных задач, 8 недель — **на грани**.
- Бэкенд-часть (Коджи) перегружена: registry, state machine, queue, tools, memory, adapter.
- Docker-агент перегружен: sandbox, images, limits, Playwright/VNC, file conversion stack.
- Верстальщик может простаивать в Фазе 1, если не дать ранний скелет UI.

**Вывод:** ресурсов достаточно только при **жесткой параллелизации** и **ранней вертикальной сборке** MVP.

---

## 5) Критические пути и риски
**Критический путь (MVP):**
1) Sandbox Docker →
2) Tool Registry →
3) Core Tools →
4) Agent State Machine + Task Queue →
5) OpenClaw Adapter →
6) Минимальный UI (chat + tool inspector + logs) →
7) Browser Automation (если критична для parity)

**Риски:**
- Docker security/limits/cleanup (утечки ресурсов, подвисшие контейнеры).
- Playwright в контейнере (зависимости, стабильность, видео/скриншоты).
- Rate limits/permissions в tool registry — без них система небезопасна.
- Контекст/summary: риск деградации качества без корректного retention.
- UI real‑time (WebSocket) + инсайды — сложнее, чем кажется.
- OAuth интеграции (Calendar/Gmail) — задержки из‑за consent экранов.

---

## Рекомендации по оптимизации и параллелизации
1) **Сделать вертикальный срез (неделя 1–2):**
   - Мини‑sandbox + 2 инструмента (shell/file_read) + минимальный UI (лог/чат).
   - Это снизит риск интеграции и ускорит обратную связь.

2) **Переместить OpenClaw Adapter в Фазу 2** (или 1.5), чтобы tools сразу шли по боевому пути.

3) **Разделить фронтенд и бэкенд по потокам:**
   - Верстальщик начинает **UI skeleton + layout** уже в Фазе 1 (на моках событий).
   - Координация через контракт событий/логов (JSON‑schema в Tool Registry).

4) **Минимальная Observability с первого дня:**
   - Структурные логи + request id + tool call id.

5) **Снизить scope Фазы 3:**
   - Для MVP оставить rolling summaries + thread scoping, а branching и search — отложить.

6) **Ревизия приоритетов:**
   - Task Queue → поднять до **Critical**.
   - OpenClaw Adapter → **High** и раньше.
   - VNC Viewer можно сдвинуть после базового Browser Automation.

---

## Предложенная переразбивка фаз (кратко)
**Фаза 1 (нед 1–2):** Sandbox, Tool Registry, State Machine, **минимальная Observability**, UI skeleton.

**Фаза 2 (нед 3–4):** Core Tools, Task Queue, OpenClaw Adapter, Web Tools.

**Фаза 3 (нед 5–6):** Browser Automation + VNC, Thread/Memory (минимум), UI components.

**Фаза 4 (нед 7–8):** Polish, File Conversion, Observability full, Docs/Tests.

---

## Итог
Roadmap рабочий, но для успеха при 3 агентах нужен **ранний MVP‑сквозняк**, перенос адаптера OpenClaw раньше, усиление observability и небольшое сокращение scope по memory/UI до стабилизации основной цепочки. Это снизит риск завала на интеграции и ускорит выпуск работоспособного ядра.
