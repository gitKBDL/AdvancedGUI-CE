import { ref, computed } from "vue";

export type Language = "en" | "ru";

const saved = localStorage.getItem("language") as Language | null;
const stored: Language = saved === "en" || saved === "ru" ? saved : "ru";
export const language = ref<Language>(stored);

const translations: Record<Language, Record<string, string>> = {
  en: {},
  ru: {
    "header.shortcuts": "Горячие клавиши",
    "header.sizeFrames": "кадров",
    "header.save": "Сохранить",
    "header.download": "Скачать",
    "header.about.title": "О редакторе",
    "header.about.body":
      "AdvancedGUI Community Editor — проект сообщества для более удобного редактирования GUI в AdvancedGUI. AdvancedGUI — расширение для Minecraft. Плагин доступен на SpigotMC. Редактор с открытым исходным кодом на GitHub. Текущая версия формата: {version}.",
    "header.shortcuts.title": "Горячие клавиши",
    "header.dev.title": "Режим разработчика",
    "header.dev.body":
      "Включите иконкой tune рядом с «Общие настройки», чтобы изменить границы, ID, предварительный просмотр item-frame сетки и прямой ввод RGBA.",
    "header.unsaved":
      "Несохраненные изменения! Сохраните проект перед выходом.",
    "header.lang": "Язык",
    "header.discard": "Выйти и не сохранять",
    "header.backToProjects": "К проектам",
    "app.unsavedLeave":
      "Похоже, вы редактируете проект. Если уйти, не сохранив изменения, данные будут потеряны.",

    "shortcuts.copy": "Копировать компонент",
    "shortcuts.paste": "Вставить компонент",
    "shortcuts.cut": "Копировать и удалить компонент",
    "shortcuts.delete": "Удалить компонент",
    "shortcuts.undo": "Отменить",
    "shortcuts.redo": "Повторить",
    "shortcuts.zoom": "Масштабирование",
    "shortcuts.move1": "Передвинуть на 1 пиксель",
    "shortcuts.move10": "Передвинуть на 10 пикселей",
    "shortcuts.download": "Скачать сохранение",
    "shortcuts.snap":
      "Зажмите SHIFT при перемещении, чтобы привязаться по оси X или Y",
    "shortcuts.snapToggle": "Включить/выключить привязку",
    "shortcuts.duplicateDrag": "Дублировать при перетаскивании",

    "dev.move": "Перемещать компонент за границы холста",
    "dev.id": "Изменять ID компонентов",
    "dev.preview": "Смотреть разбиение на item-frame карты",
    "dev.rgba": "Вводить RGBA напрямую (полезно для переменных шаблонов)",

    "componentTree.add": "Добавить компонент",
    "textInput.bg": "Цвет фона",
    "textInput.bgActive": "Цвет активного фона",
    "textInput.placeholder": "Плейсхолдер",
    "textInput.default": "Текст по умолчанию",
    "textInput.maxLength": "Макс. длина",
    "textInput.textStyle": "Стиль текста",
    "textInput.placeholderColor": "Цвет плейсхолдера",
    "textInput.position": "Позиция",
    "textInput.padding": "Отступ",
    "textInput.info":
      "Ввод пользователя доступен через плейсхолдер %advancedgui_textinput_{id}%. Требуется PlaceholderAPI.",
    "rect.radius": "Скругление углов",
    "rect.dimensions": "Размеры",
    "font.size": "Размер",
    "font.font": "Шрифт",
    "font.upload": "Загрузить шрифт",
    "color.default": "Цвет",
    "color.dev": "Dev цвет",
    "toolbar.zoom": "МАСШТАБ",
    "toolbar.snapToggle": "Переключить привязку",
    "text.text": "Текст",
    "text.colors":
      "Можно менять цвет слов с помощью цветовых кодов Minecraft (например, §aTest — зелёный).",
    "text.containsPlaceholder": "Содержит плейсхолдеры",
    "text.preview": "Текст предпросмотра",
    "text.style": "Стиль",
    "text.position": "Позиция",
    "text.color": "Цвет",
    "check.showNegative": "Показывать отрицательный компонент",
    "check.type": "Тип проверки",
    "check.hint":
      "Компонент-проверка содержит два компонента: первый виден при успехе, второй — при провале.",
    "listNext.viewId": "ID просмотра",
    "listNext.notView": " не является View",
    "listNext.goTo": "Перейти на",
    "listNext.next": "следующий",
    "listNext.previous": "предыдущий",
    "listNext.pageIfPossible": "страницу, если возможно",
    "listNext.checkIf": "Проверить, есть ли",
    "listNext.page": "страница",
    "listNext.target": "ЦЕЛЬ",
    "listNext.notFound": " НЕ НАЙДЕНА!",
    "money.amount": "Сумма",
    "money.desc":
      "Проверяет, что у игрока есть не меньше указанной суммы (через Vault)",
    "delay.ticks": "тики",
    "delay.desc":
      "Это действие задержит дочерние действия на указанное количество тиков (1 тик = 50мс)",
    "image.gif": "GIF",
    "image.image": "Изображение",
    "image.upload": "Загрузить",
    "image.dimensions": "Размеры",
    "image.keepRatio": "Сохранять пропорции",
    "image.fillCanvas": "На весь холст",
    "image.dithering": "Дизеринг",
    "image.pause": "Пауза по умолчанию",
    "image.imageName": "Имя изображения",
    "permission.permission": "Разрешение",

    "sidebar.general": "Общие настройки",
    "sidebar.name": "Название",
    "sidebar.id": "ID",
    "sidebar.visibility": "Видимость",
    "sidebar.lock": "Блокировка",
    "sidebar.align.scope": "Относительно",
    "sidebar.align.canvas": "Холст",
    "sidebar.align.parent": "Родитель",
    "sidebar.align.horizontal": "По горизонтали",
    "sidebar.align.vertical": "По вертикали",
    "sidebar.clickAction": "Действия при клике",
    "sidebar.addAction": "Добавить действие",
    "sidebar.paste": "Вставить",
    "sidebar.edit": "Редактировать",
    "sidebar.noneSelected": "компонент не выбран",

    "modal.ok": "Ок",

    "projectExplorer.yourProjects": "Ваши проекты",
    "projectExplorer.import": "Импортировать проект",
    "projectExplorer.about": "О редакторе",
    "projectExplorer.devMode": "Режим разработчика",
    "projectExplorer.create": "Создать новый проект",
    "projectExplorer.open": "ОТКРЫТЬ",
    "projectExplorer.download": "Скачать",
    "projectExplorer.delete": "Удалить",
    "projectExplorer.openToUpdate": "Открыть и обновить",
    "projectExplorer.subtitle":
      "Удобный редактор GUI для Minecraft от сообщества",
    "projectExplorer.lead":
      "Собирайте меню просто: перетаскивайте элементы, выравнивайте и экспортируйте, когда всё готово.",
    "projectExplorer.stats.projects": "Проектов",
    "projectExplorer.stats.storage": "Хранилище",
    "projectExplorer.title": "Проводник проектов",
    "projectExplorer.tips.title": "С чего начать",
    "projectExplorer.tips.one":
      "Создайте проект и укажите размер холста (в кадрах).",
    "projectExplorer.tips.two":
      "Держите порядок в дереве компонентов — так проще ориентироваться.",
    "projectExplorer.tips.three":
      "Включайте привязку и выравнивание — так всё будет ровно.",
    "projectExplorer.tips.note":
      "Всё хранится у вас в браузере — на сервер ничего не отправляется.",
    "projectExplorer.search": "Поиск проектов",
    "projectExplorer.needsUpdate": "Обновить",
    "projectExplorer.empty.title": "Ничего не найдено",
    "projectExplorer.empty.body":
      "Попробуйте другое имя или создайте новый проект.",
    "projectExplorer.empty.firstTitle": "Проектов пока нет",
    "projectExplorer.empty.firstBody": "Создайте первый проект, чтобы начать.",

    "loading.errorTitle": "Что-то пошло не так",
    "loading.close": "Закрыть",

    "template.addVariable": "Добавить переменную",
    "template.help":
      "Используйте #имяПеременной в текстах или действиях. Убедитесь, что у каждой переменной есть значение. В числовых полях можно нажать '#' для текстового ввода (если поддерживается).",
    "list.addVariable": "Добавить переменную",
    "list.addEntry": "Добавить запись",
    "list.entryVars": "Переменные записей",
    "list.entries": "Записи",
    "list.offset": "Смещение записей",
    "list.entriesPerPage": "Записей на страницу",
    "list.showPage": "Показать страницу ({current}/{total})",
    "list.help":
      "Используйте #имяПеременной в текстовых полях или действиях. Убедитесь, что каждой переменной присвоено значение. В числовых полях можно нажать '#' для ввода текста.",

    "componentList.add": "Добавить компонент",
    "update.migrated":
      "Ваш проект был в формате <b>{old}</b> и обновлён до версии <b>{new}</b>",
    "placeholder.placeholder": "Плейсхолдер",
    "placeholder.compType": "Тип сравнения",
    "placeholder.textEq": "Текст совпадает",
    "placeholder.textEqShort": "текст =",
    "placeholder.value": "Значение",
    "placeholder.descText":
      'Проверяет, что плейсхолдер {ph} имеет значение "{val}"',
    "placeholder.descNumber": "Проверяет: {ph} {cmp} {val}",

    "command.command": "Команда",
    "command.console": "Выполнить от консоли",

    "message.message": "Сообщение",

    "metadata.key": "Ключ метаданных",
    "metadata.newValue": "Новое значение",
    "metadata.deleteValue": "Удалить значение",
    "metadata.desc":
      "Это действие изменяет значение %meta.{key}%. Метаданные можно использовать в GUI, например в проверках плейсхолдеров.",

    "money.negativeHint":
      "Используйте отрицательные значения, чтобы снять деньги с игрока.",
    "money.actionResult": "Это действие будет {mode} {amount} денег у игрока.",
    "money.add": "добавит",
    "money.remove": "спишет",

    "permission.add": "ДОБАВИТЬ",
    "permission.or": "или",
    "permission.remove": "УДАЛИТЬ",
    "permission.permissionLower": "разрешение",

    "gif.targetId": "ID GIF-компонента",
    "gif.target": "ЦЕЛЬ",
    "gif.notFound": " НЕ НАЙДЕН!",
    "gif.notGif": " не GIF",
    "gif.pause": "Пауза GIF",
    "gif.reset": "Сброс GIF",
    "gif.pauseDesc": "Действие поставит GIF на паузу",
    "gif.unpauseDesc": "Действие запустит GIF",
    "gif.resetDesc": "и сбросит его на первый кадр",

    "view.viewId": "ID просмотра",
    "view.target": "ЦЕЛЬ",
    "view.notFound": " НЕ НАЙДЕНА!",
    "view.notView": " не является View",
    "view.targetId": "Целевой ID",
    "view.notChild": "не является прямым дочерним компонентом view",
    "view.desc":
      "Это действие заставит указанный view показать указанный target для игрока.",
    "view.default": "По умолчанию",
    "view.showComponent": "Показать компонент",
    "view.componentDesc":
      "View — это группа нескольких компонентов. Первый отображается по умолчанию; действием смены view можно показать остальные.",

    "visibility.componentId": "ID компонента",
    "visibility.visible": "Видимый",
    "visibility.makeVisible": "Действие сделает компонент видимым",
    "visibility.makeInvisible": "Действие сделает компонент невидимым",
    "visibility.checkDesc": "Проверяет, виден ли компонент игроку",

    "item.amount": "Количество",
    "item.name": "Название предмета",
    "item.desc":
      "Проверяет, что у игрока есть хотя бы указанное количество предмета. Нажмите F3+H в игре и наведите курсор на предмет, чтобы увидеть его имя.",

    "standby.desc":
      "Эта проверка не имеет настроек. Проверяет, что игрок находится вне радиуса взаимодействия GUI.",

    "click.show": "Показать компонент при клике",
    "click.desc":
      "Компонент Click Animation — группа из двух компонентов. Первый отображается обычно; второй кратко показывается при клике по основному.",

    "hover.show": "Показать компонент при наведении",
    "hover.desc":
      "Hover — группа из двух компонентов. Первый отображается обычно; второй показывается при наведении.",

    "empty.none": "У этого компонента нет отдельных настроек",

    "image.previewLoading": "Показывать компонент загрузки",

    "replica.templateId": "ID шаблона",
    "replica.target": "ЦЕЛЬ",
    "replica.notFound": " НЕ НАЙДЕН!",
    "replica.notTemplate": " не является Template",
    "replica.position": "Позиция",

    "common.number": "Число",
    "common.text": "Текст",

    "component.Rect": "Прямоугольник",
    "component.Text": "Текст",
    "component.Image": "Изображение",
    "component.Remote Image": "Удалённое изображение",
    "component.GIF": "GIF",
    "component.Group": "Группа",
    "component.Hover": "Наведение",
    "component.Click Animation": "Анимация клика",
    "component.Check": "Проверка",
    "component.Text-Input": "Текстовое поле",
    "component.View": "Экран (View)",
    "component.Template": "Шаблон",
    "component.Replica": "Реплика",
    "component.List": "Список",
    "component.Dummy": "Заглушка",

    "action.Command": "Команда",
    "action.Message": "Сообщение",
    "action.Visibility": "Видимость",
    "action.Money": "Деньги",
    "action.Permission": "Разрешение",
    "action.GIF Control": "Управление GIF",
    "action.View": "Сменить экран (View)",
    "action.View Next": "Следующий экран (View)",
    "action.List next": "Следующий экран (legacy)",
    "action.Metadata": "Метаданные",
    "action.Delay": "Задержка",
    "action.List": "Список",
    "action.Check": "Проверка",
    "action.Item Check": "Проверка предмета",
    "action.Money Check": "Проверка денег",
    "action.Permission Check": "Проверка разрешения",
    "action.Visibility Check": "Проверка видимости",
    "action.Placeholder Check": "Проверка плейсхолдера",
    "action.Number Placeholder Check": "Числовая проверка плейсхолдера",
    "action.List Next Check": "Проверка следующего View",
    "action.List next Check": "Проверка следующего View (legacy)",
    "action.Standby Check": "Проверка радиуса",

    "componentList.addChild": "Добавить дочерний",
    "componentList.delete": "Удалить",
    "componentList.copy": "Копировать",
    "componentList.duplicate": "Дублировать",
    "componentList.show": "Показать",
    "componentList.hide": "Скрыть",

    "project.invalid": "Это не похоже на файл проекта AdvancedGUI.",
    "project.defaultName": "Стартовый",
    "project.unnamed": "Без названия",
    "project.unnamedNumber": "{name} {num}",

    "export.error": "Ошибка при экспорте: {message}",
    "import.singleComponent":
      "Импортировать компонент можно только из файлов с одним Group или Template.",
  },
};

export const availableLanguages = computed(() => [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
]);

export function setLanguage(lang: Language) {
  language.value = lang;
  localStorage.setItem("language", lang);
}

export function t(key: string, fallback: string): string {
  const current = translations[language.value]?.[key];
  if (current) return current;
  return fallback;
}
