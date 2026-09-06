# AFTERGLOW Drift — Docker deployment

Собирает игру в статические файлы (`dist/client`) и раздаёт через nginx.

## Требования
- Docker (build daemon + compose), версия с поддержкой BuildKit (по умолчанию).

## Сборка и запуск (docker compose)

```bash
docker compose up -d --build
# игра доступна на http://localhost:8080
```

## Только образ / только контейнер

```bash
docker build -t afterglow-drift:latest .
docker run -d -p 8080:80 --name afterglow-drift afterglow-drift:latest
```

## Структура
- `Dockerfile` — многостадийный сбор: `node:22-alpine` (npm install + `npm run build`) → `nginx:1.27-alpine`.
- `nginx.conf` — статика + gzip; SPA-fallback на `index.html`; кэш ассетов:
  - `/_next/static/*` — `immutable, max-age=31536000`
  - `/maps/*.json` — `immutable, max-age=31536000` + CORS `*` (карты Würzburg/Svitlodarsk)
  - `*.glb` — `max-age=31536000` (модели транспорта)
- `docker-compose.yml` — порт `8080:80`, `restart: unless-stopped`.

## Замечания
- Сборка статическая: `npm run build` даёт `output: 'export'` в `dist/client`.
- GLB/JSON-карты кладутся в статику автоматически (копируются в `dist/client`).
- Порт внутри контейнера `80`; снаружи меняй `8080` в `docker-compose.yml`.
