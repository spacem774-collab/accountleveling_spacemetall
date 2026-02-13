#!/bin/bash
# Пример запуска cron job ачивок.
# Добавьте в crontab: каждые 30 минут или 1 раз в день.

# Каждые 30 минут
# */30 * * * * /path/to/cron-achievements.sh

# Или 1 раз в день в 6:00
# 0 6 * * * /path/to/cron-achievements.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "WARNING: CRON_SECRET not set. Endpoint may reject the request."
fi

curl -s -X POST "${BASE_URL}/api/cron/achievements" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"

echo ""
