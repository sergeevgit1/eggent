# 🤖 Инструкции для агента-разработчика

> Коджи и другие агенты — читайте перед началом работы

---

## 📋 Чеклист перед задачей

- [ ] Прочитать [ROADMAP.md](./ROADMAP.md) — понять текущий прогресс
- [ ] Определить в какой фазе и задаче работаем
- [ ] Проверить зависимости (что должно быть готово до этого)

---

## ✅ Что делать ПОСЛЕ выполнения задачи

**Обязательно:**

1. **Обновить ROADMAP.md:**
   ```bash
   # Найти свою задачу и пометить галочкой
   - [x] Название задачи (было - [ ])
   ```

2. **Обновить статистику прогресса:**
   - Увеличить счётчик "Выполнено"
   - Пересчитать процент прогресса

3. **Закоммитить изменения:**
   ```bash
   git add docs/ROADMAP.md
   git commit -m "feat: задача X выполнена, прогресс Y%"
   git push origin main
   ```

4. **Если задача часть большой фичи:**
   - Создать PR вместо прямого push
   - Указать связанные задачи в описании

---

## 🎯 Критерии качества

### Код
- [ ] TypeScript строгой типизацией
- [ ] Комментарии для сложной логики
- [ ] Обработка ошибок
- [ ] Логирование ключевых событий

### Тесты
- [ ] Unit tests для core logic
- [ ] Integration tests для API
- [ ] Проверка граничных случаев

### Документация
- [ ] JSDoc для функций
- [ ] Обновление API docs (если менялось)
- [ ] Примеры использования

---

## 🚨 Что делать если задача блокируется

1. **Создать issue:**
   - Заголовок: `[Blocked] Название задачи`
   - Теги: `blocked`, приоритет
   - Описание: что блокирует, почему

2. **Обновить ROADMAP:**
   - Добавить пометку `(blocked by #XXX)`

3. **Сообщить команде:**
   - Упомянуть в чате/канале
   - Предложить workaround если есть

---

## 📁 Структура проекта

```
egent/
├── src/
│   ├── lib/
│   │   ├── agent/         # Agent runtime
│   │   ├── tools/         # Tool implementations
│   │   ├── sandbox/       # Sandbox service
│   │   ├── memory/        # Memory/vector store
│   │   ├── threads/       # Thread management
│   │   └── mcp/           # MCP integration
│   └── app/               # Next.js app
├── docs/
│   ├── ROADMAP.md         # ⬅️ ОБНОВЛЯТЬ ПОСЛЕ ЗАДАЧИ
│   ├── AGENT_INSTRUCTIONS.md  # ⬅️ ЭТОТ ФАЙЛ
│   └── suna-features-migration-plan.md
└── tests/
```

---

## 🛠️ Технологии

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes + FastAPI (sandbox)
- **DB:** SQLite (Drizzle ORM)
- **Cache:** Redis (BullMQ)
- **Vector DB:** Qdrant
- **Sandbox:** Docker API
- **Testing:** Vitest, Playwright

---

## 🔗 Полезные ссылки

- **ROADMAP:** [ROADMAP.md](./ROADMAP.md) — прогресс и задачи
- **План миграции:** [suna-features-migration-plan.md](./suna-features-migration-plan.md)
- **Suna reference:** https://github.com/kortix-ai/suna (только идеи!)
- **OpenClaw docs:** https://docs.openclaw.ai

---

## 💡 Принципы

1. **MIT License** — сохраняем свободу использования
2. **Suna = reference** — не копируем код, берём идеи
3. **OpenClaw integration** — максимальная совместимость
4. **Autonomous agents** — строим самостоятельных агентов
5. **Local-first** — работаем без облака где возможно

---

## 📞 Контакты

- **Босс:** @boss (Product Owner)
- **Асиса:** @asisa (AI Assistant)
- **Коджи:** @kodzhi (Coding Agent)

---

*Последнее обновление: 2026-03-01*
