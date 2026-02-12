#!/bin/bash
# Скрипт для push в GitHub — запустите в своём терминале

cd "$(dirname "$0")"

# Вариант 1: репозиторий spacem774/spacem774-collab (если вы collaborator)
REPO1="https://github.com/spacem774/spacem774-collab.git"
# Вариант 2: ваш репозиторий spacem774-collab/spacem774-collab
REPO2="https://github.com/spacem774-collab/spacem774-collab.git"

echo "📤 Push в GitHub..."
echo ""
echo "Попытка 1: spacem774/spacem774-collab"
git remote set-url origin "$REPO1"
if git push -u origin main 2>&1; then
  echo "✅ Готово! Проект загружен"
  exit 0
fi

echo ""
echo "Попытка 2: spacem774-collab/spacem774-collab"
git remote set-url origin "$REPO2"
if git push -u origin main 2>&1; then
  echo "✅ Готово! Проект загружен"
  exit 0
fi

echo ""
echo "❌ Не удалось. Проверьте:"
echo "   1. Репозиторий создан на GitHub"
echo "   2. Токен новый, с правами repo"
echo "   3. Username: spacem774-collab"
