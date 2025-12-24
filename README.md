<div align="center">

# AdvancedGUI Community Editor

**Визуальный веб‑редактор GUI для AdvancedGUI (Minecraft)**  
Собирайте меню на холсте, настраивайте действия/проверки и экспортируйте проекты в JSON.

[![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-enabled-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)

</div>

## Что это
AdvancedGUI Community Editor — браузерный редактор, который помогает собирать GUI для AdvancedGUI быстрее и удобнее, чем вручную править структуру проекта.
Проекты сохраняются локально и легко переносятся через экспорт JSON.

## Возможности
- **Холст** — перетаскивание, изменение размера, выравнивание и привязка (snapping)
- **Дерево компонентов** — группировка, порядок слоёв и быстрый доступ к элементам
- **Действия и проверки** — настройка поведения GUI: клики, условия, переходы, задержки и т.д.
- **История изменений** — undo/redo для безопасных правок
- **Импорт/экспорт** — обмен проектами через JSON
- **Локальное хранение** — ничего не отправляется на сервер, всё хранится в браузере

## Быстрый старт
```bash
npm install
npm run dev
```

## Команды
- `npm run build` — production‑сборка
- `npm run preview` — предпросмотр production‑сборки локально
- `npm run lint` — проверка линтером

## Приватность и хранение
Проекты сохраняются в локальном хранилище браузера. Для бэкапа и переноса используйте экспорт в JSON.

## Лицензия
Этот проект распространяется под лицензией MIT. Подробности см. в файле [LICENSE](LICENSE).
