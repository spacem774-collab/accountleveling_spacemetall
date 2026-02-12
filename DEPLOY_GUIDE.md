# Подробная инструкция: как выложить Space METALL для сотрудников

Это пошаговая инструкция, как сделать дашборд доступным для сотрудников в интернете.

---

## Что потребуется

- Аккаунт на [GitHub](https://github.com)
- Аккаунт на [Vercel](https://vercel.com) — бесплатный
- JSON-ключ Google Service Account (у вас уже есть в `.env`)
- 15–20 минут времени

---

## ЧАСТЬ 1: Выкладка кода на GitHub

GitHub — это хранилище кода. Так вы сохраните проект и сможете обновлять его.

### Вариант А: Загрузка вручную (без терминала)

**Шаг 1.** Зарегистрируйтесь на https://github.com (если ещё нет аккаунта).

**Шаг 2.** Создайте репозиторий:
- Нажмите **+** → **New repository**
- **Repository name:** `Profile_SpaceMETALL`
- **Public** → **Create repository**

**Шаг 3.** На странице нового репозитория найдите ссылку **«uploading an existing file»** (или кнопку **Add file** → **Upload files**).

**Шаг 4.** Откройте в Finder папку:
```
Downloads → Profile_SpaceMETALL
```

**Шаг 5.** Выделите всё содержимое внутри папки (Command+A), **кроме**:
- `node_modules` — не трогайте (скорее всего её нет, т.к. в .gitignore)
- `.next` — не трогайте
- `.env` — **никогда не загружайте** (в нём секреты!)

> **Важно:** Файлы `.env.example` и `.gitignore` могут быть скрыты. Чтобы их увидеть в Finder: нажмите **Command+Shift+.** (точка). Они желательны, но без них проект тоже заработает.

Перетащите выделенное в окно браузера GitHub. Должны попасть:
- папки: `app`, `config`, `lib`, `public`, `__mocks__`, `__tests__`
- файлы: `package.json`, `package-lock.json`, `README.md`, `.env.example`, `.gitignore`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `DEPLOY_GUIDE.md`

**Шаг 6.** Внизу страницы введите сообщение коммита (например, «Первый вариант проекта») и нажмите **Commit changes**.

Готово. Код загружен на GitHub.

---

### Вариант Б: GitHub Desktop (рекомендуется — без терминала)

Подходит, если не хотите вводить токены и работать в терминале. GitHub Desktop сам отправляет все папки и файлы.

#### Шаг 1. Скачайте и установите GitHub Desktop
- Перейдите на https://desktop.github.com
- Скачайте и установите приложение

#### Шаг 2. Войдите в GitHub
- Запустите GitHub Desktop
- В меню **File** → **Sign in to GitHub.com** (или кнопка **Sign in**)
- Откроется браузер — войдите в аккаунт **spacem774-collab**
- Разрешите доступ GitHub Desktop

#### Шаг 3. Подключите папку проекта
1. В GitHub Desktop: **File** → **Add local repository...**
2. Нажмите **Choose...** и выберите папку:
   ```
   /Users/alexandrkoreckiy/Downloads/Profile_SpaceMETALL
   ```
3. Нажмите **Add repository**

Если появится сообщение «This directory does not appear to be a Git repository» — нажмите **create a repository** и укажите ту же папку.

#### Шаг 4. Проверьте, что попало в коммит
- Слева в списке **Changes** должны быть файлы и папки
- В списке НЕ должно быть `.env` (он в .gitignore)
- Должны быть: `app/`, `config/`, `lib/`, `public/`, `package.json` и др.
- Если чего-то нет — нажмите **Show in Finder** и проверьте, что файлы существуют

#### Шаг 5. Сделайте первый коммит
1. В поле **Summary** внизу введите, например: `Space METALL: полный проект`
2. Нажмите синюю кнопку **Commit to main**

#### Шаг 6. Опубликуйте репозиторий
1. Вверху появится кнопка **Publish repository** (или **Push origin**)
2. Если **Publish repository**:
   - Снимите галочку **Keep this code private**, если хотите публичный репо
   - **Name:** оставьте `Profile_SpaceMETALL` или укажите `spacem774-collab`
   - **Description:** можно оставить пустым
   - Нажмите **Publish repository**
3. Если **Push origin** — просто нажмите её

Дождитесь окончания загрузки. Готово — проект на GitHub.

#### Шаг 7. (Если репозиторий уже есть) Свяжите с существующим
Если репо `spacem774-collab` уже создан на GitHub:
- **Repository** → **Repository settings...**
- В поле **Primary remote repository (origin)** введите: `https://github.com/spacem774-collab/spacem774-collab`
- Сохраните и нажмите **Push origin**

---

### Вариант В: Через терминал

**Шаг 1–2.** То же, что в Варианте А — создайте репозиторий на GitHub.

**Шаг 3.** В терминале выполните:

```bash
cd /Users/alexandrkoreckiy/Downloads/Profile_SpaceMETALL
git remote set-url origin https://github.com/ВАШ_ЛОГИН/Profile_SpaceMETALL.git
git push -u origin main
```

(Замените `ВАШ_ЛОГИН` на свой логин GitHub.)

---

## ЧАСТЬ 2: Размещение приложения на Vercel

Vercel — это хостинг, который позволит открывать дашборд в браузере по ссылке.

### Шаг 2.1: Регистрация на Vercel

1. Откройте https://vercel.com
2. Нажмите **Sign Up**
3. Выберите **Continue with GitHub** и войдите через свой GitHub-аккаунт
4. Разрешите Vercel доступ к репозиториям

### Шаг 2.2: Подключение проекта

1. На главной странице Vercel нажмите **Add New** → **Project**
2. В списке репозиториев найдите **Profile_SpaceMETALL** (или как вы его назвали)
3. Нажмите **Import** рядом с ним
4. **НЕ нажимайте Deploy сразу.** Сначала настроим переменные.

### Шаг 2.3: Переменные окружения (Environment Variables)

Откройте блок **Environment Variables** и добавьте переменные по одной.

| Имя переменной | Значение | Где взять |
|----------------|----------|-----------|
| `MODE` | `service_account` | Вводите вручную |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Весь JSON в одну строку | См. ниже |
| `GOOGLE_SHEETS_SALES_FUNNEL_ID` | `1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58` | ID таблицы «Воронка продаж» |
| `GOOGLE_SHEETS_CONNECTIONS_ID` | `1eUmK264I8OMDs69FlIuDiGXkE9B4gO2FnywxiWNnoDo` | ID таблицы «Количество связок» |
| `SALES_FUNNEL_SHEET_NAME` | `Сделки` | Имя листа в воронке |
| `CONNECTIONS_SHEET_NAME` | `Компании` | Имя листа в связках |
| `EXCLUDED_FROM_EMPLOYEES` | `Корецкий` | Чтобы вы не попадали в список |

**Как скопировать GOOGLE_SERVICE_ACCOUNT_JSON:**

1. Откройте файл `/Users/alexandrkoreckiy/Downloads/Profile_SpaceMETALL/.env` в редакторе
2. Найдите строку `GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...`
3. Скопируйте **всё значение** от `{` до `}` (весь JSON в одну строку)
4. Вставьте в поле Value в Vercel

Важно: JSON должен быть одной строкой, без переносов. Переносы внутри `\n` — оставляйте как есть.

### Шаг 2.4: Деплой

1. Проверьте, что все переменные добавлены
2. Нажмите **Deploy**
3. Подождите 1–3 минуты — идёт сборка и запуск

### Шаг 2.5: Получение ссылки

После успешного деплоя появится:

- Зелёная галочка **Congratulations!**
- Ссылка вида: `https://profile-space-metall-xxxxx.vercel.app`

Ссылку можно:
- Открыть в браузере
- Скопировать и отправить сотрудникам
- Добавить в закладки

---

## ЧАСТЬ 3: Проверка и доступ к таблицам Google

### Доступ Service Account к таблицам

Бот (Service Account) должен иметь доступ к вашим таблицам:

1. Откройте таблицу «Воронка продаж» в Google Sheets
2. Нажмите **Поделиться**
3. Добавьте email из JSON: `league-dashboard@api123123-487207.iam.gserviceaccount.com` (или ваш client_email из ключа)
4. Выдайте право **Редактор** или **Читатель**
5. То же самое сделайте для таблицы «Количество связок»

Без этого приложение не увидит данные.

---

## ЧАСТЬ 4: Обновление проекта

Когда вы что-то меняете в коде:

1. В терминале:
   ```bash
   cd /Users/alexandrkoreckiy/Downloads/Profile_SpaceMETALL
   git add .
   git commit -m "Описание изменений"
   git push
   ```

2. Vercel сам пересоберёт проект и обновит сайт в течение 1–2 минут.

---

## Возможные проблемы

### «Сотрудники не найдены»
- Проверьте, что Service Account добавлен в обе таблицы Google
- Убедитесь, что `CONNECTIONS_SHEET_NAME=Компании` и лист реально называется «Компании»
- Откройте `https://ваш-сайт.vercel.app/api/debug-sheets?raw=1` — там будут видны сырые данные и возможные ошибки

### Ошибка при деплое
- Проверьте переменные, особенно `GOOGLE_SERVICE_ACCOUNT_JSON` — должен быть полный валидный JSON
- Убедитесь, что в JSON нет лишних кавычек или запятых

### Сайт открывается, но данные не загружаются
- Подождите 30–60 секунд (первый запрос к Google может быть медленным)
- Обновите страницу

---

## Краткая схема

```
Ваш компьютер (код) 
    → git push → GitHub (хранилище кода)
                    → Vercel (сборка и запуск)
                        → Ссылка для сотрудников
```

Сотрудники открывают ссылку Vercel в браузере и работают с дашбордом. Данные берутся из ваших Google-таблиц.
