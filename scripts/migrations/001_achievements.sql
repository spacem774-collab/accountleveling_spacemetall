-- Миграции для PostgreSQL: achievements_catalog, user_achievements
-- При использовании JSON-хранилища эти миграции не требуются.

-- Каталог достижений (опционально — можно хранить в коде)
CREATE TABLE IF NOT EXISTS achievements_catalog (
  id VARCHAR(32) PRIMARY KEY,
  key VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(128) NOT NULL,
  description TEXT,
  threshold INTEGER NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'monthly_sales',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Связь пользователь — достижение — месяц
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  achievement_id VARCHAR(32) NOT NULL REFERENCES achievements_catalog(id),
  month_key VARCHAR(7) NOT NULL, -- YYYY-MM
  achieved BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, achievement_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_month
  ON user_achievements (user_id, month_key);

-- Наполнение каталога (если используется БД)
INSERT INTO achievements_catalog (id, key, title, description, threshold, type)
VALUES
  ('ms-5', 'monthly_sales_5', '5 продаж', '5 закрытых сделок за месяц', 5, 'monthly_sales'),
  ('ms-10', 'monthly_sales_10', '10 продаж', '10 закрытых сделок за месяц', 10, 'monthly_sales'),
  ('ms-20', 'monthly_sales_20', '20 продаж', '20 закрытых сделок за месяц', 20, 'monthly_sales'),
  ('ms-35', 'monthly_sales_35', '35 продаж', '35 закрытых сделок за месяц', 35, 'monthly_sales'),
  ('ms-50', 'monthly_sales_50', '50 продаж', '50 закрытых сделок за месяц', 50, 'monthly_sales')
ON CONFLICT (id) DO NOTHING;
