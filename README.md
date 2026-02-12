# League Dashboard MVP

Веб-приложение dashboard системы лиг на Next.js с данными из Google Sheets.

## Возможности

- Определение лиги пользователя по количеству компаний с заполненным контактом
- Расчёт конверсии из счета в продажу
- Распределение продаж по 5 диапазонам сумм
- Поле «О себе» с сохранением в лист About

## Стек

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS
- Google Sheets API v4 (Service Account)
- Vitest

## Быстрый старт

### Установка

```bash
npm install
```

### Локальный запуск (мок-данные)

По умолчанию используется `MODE=mock` — данные загружаются из `__mocks__/data.ts`.

```bash
npm run dev
```

Откройте: [http://localhost:3000](http://localhost:3000) — выберите сотрудника, затем откроется его дашборд.

Доступные тестовые `user_id`:
- `demo_user` — Silver (250 компаний), полная статистика по счетам
- `user_0` — 0 компаний с контактом (Bronze)
- `user_99` — Bronze (99 компаний)
- `user_100` — Silver (100)
- `user_300` — Gold
- `user_900` — Platinum
- `user_1200` — Diamond
- `user_1500` — Master
- `user_15000` — Legend

### Подключение ваших Google-таблиц

**Почему показываются мок-данные?** По умолчанию `MODE=mock`. Чтобы видеть данные из ваших таблиц:

1. **Создайте Service Account и скачайте ключ**

   **Шаг 1.1.** Откройте [Google Cloud Console](https://console.cloud.google.com/). Вверху слева выберите проект или нажмите «Create Project» и создайте новый.

   **Шаг 1.2.** Включите Google Sheets API:  
   слева «APIs & Services» → «Library» → найдите «Google Sheets API» → «Enable».

   **Шаг 1.3.** Создайте Service Account:  
   слева «IAM & Admin» → «Service Accounts» → кнопка «+ Create Service Account».  
   Название — любое (например, `league-dashboard`) → «Create and Continue» → «Done».

   **Шаг 1.4.** Скачайте ключ:  
   Откройте созданный Service Account (клик по нему в списке).  
   Вкладка «Keys» → «Add Key» → «Create new key» → выберите **JSON** → «Create».  
   Файл JSON автоматически скачается на компьютер.

2. **Откройте доступ к таблицам**
   - В JSON-ключе найдите `client_email` (типа `xxx@project.iam.gserviceaccount.com`)
   - [Воронка продаж](https://docs.google.com/spreadsheets/d/1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58) → «Настройки доступа» → добавьте этот email с правом **Редактор**
   - [Количество связок](https://docs.google.com/spreadsheets/d/1eUmK264I8OMDs69FlIuDiGXkE9B4gO2FnywxiWNnoDo) → «Настройки доступа» → добавьте этот email с правом **Редактор**

3. **Создайте `.env` в корне проекта** (скопируйте из `.env.example`):

```env
MODE=service_account
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"xxx@xxx.iam.gserviceaccount.com",...}

# Ваши таблицы (ID уже заданы)
GOOGLE_SHEETS_SALES_FUNNEL_ID=1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58
GOOGLE_SHEETS_CONNECTIONS_ID=1eUmK264I8OMDs69FlIuDiGXkE9B4gO2FnywxiWNnoDo

# Имена листов (по умолчанию «Сделки» для обеих таблиц)
SALES_FUNNEL_SHEET_NAME=Сделки
CONNECTIONS_SHEET_NAME=Сделки
```

   **ВАЖНО:** `GOOGLE_SERVICE_ACCOUNT_JSON` — весь JSON из скачанного файла **в одну строку** (переносы в private_key оставьте как `\n`).

4. **Перезапустите dev-сервер**: `npm run dev`

### Подключение единой таблицы (альтернатива)

Если всё в одной таблице с листами Companies, Invoices, About:

```
MODE=service_account
GOOGLE_SHEETS_SPREADSHEET_ID=<ID таблицы>
GOOGLE_SERVICE_ACCOUNT_JSON={...}
```

### Формат листов Google Sheets

**Companies:** `user_id`, `company_id`, `company_name`, `contact_name`, `created_at`

**Invoices:** `user_id`, `invoice_id`, `invoice_amount`, `invoice_date`, `status`, `paid_date`  
(status: ISSUED | PAID | CANCELLED)

**About:** `user_id`, `about_text`, `updated_at`, `avatar_url` (опционально)

### Две отдельные таблицы

Для воронки продаж и количества связок можно использовать две разные таблицы:
- **Воронка продаж:** `GOOGLE_SHEETS_SALES_FUNNEL_ID` — ID таблицы [воронка](https://docs.google.com/spreadsheets/d/1Ibc0FSJg3gFTfElZQ6jbAaU2-F7wf89Wf-gHp-klL58)
- **Связки:** `GOOGLE_SHEETS_CONNECTIONS_ID` — ID таблицы [связки](https://docs.google.com/spreadsheets/d/1eUmK264I8OMDs69FlIuDiGXkE9B4gO2FnywxiWNnoDo)

Колонки воронки (ищутся по названию):
- `user_id` / `ответственный` — сотрудник
- `Номер счета` — если заполнен = счёт выставлен
- `Сумма продажи` — для диапазона и суммы оплат
- `Бюджет` — сумма продаж для оплаченных
- `Сумма закупки` — для расчёта маржи: (продажа − закупка) / продажа × 100
- `Имя статуса` / `Статус сделки` — "Успешно реализовано" = оплачено

### Режим Public CSV (MODE=public_csv)

Экспортируйте листы в CSV (File → Share → Publish to web) и укажите URL в `.env`:

```
MODE=public_csv
PUBLIC_CSV_COMPANIES_URL=https://...
PUBLIC_CSV_INVOICES_URL=https://...
PUBLIC_CSV_ABOUT_URL=https://...
```

**Ограничение:** запись «О себе» в режиме `public_csv` недоступна (только чтение).

### Сборка и тесты

```bash
npm run build
npm test
```

### Деплой (Vercel)

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения в Vercel Dashboard
3. Деплой выполняется автоматически при push

```bash
# или через CLI
vercel
```

### Структура проекта

```
app/
  dashboard/page.tsx   # UI dashboard
  api/
    metrics/route.ts   # GET /api/metrics?user_id=XXX
    about/route.ts     # GET & POST /api/about
config/league.ts       # LEAGUES, BUCKETS, getLeague()
lib/
  sheets.ts            # fetchCompanies, fetchInvoices, fetchAbout, writeAbout
  metrics.ts           # computeMetrics, getCompaniesCount, aggregateByBuckets
__mocks__/data.ts      # Мок-данные
public/badges/         # Иконки лиг
```
