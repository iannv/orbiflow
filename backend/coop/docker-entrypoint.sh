#!/bin/sh
set -e

# If the configured Postgres host is the local `db` service, wait until it's reachable.
if [ "${POSTGRES_HOST:-}" = "db" ]; then
  echo "Waiting for local Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}..."
  python - <<'PY'
import os, sys, time
import psycopg2

host = os.environ.get('POSTGRES_HOST')
port = int(os.environ.get('POSTGRES_PORT') or 5432)
user = os.environ.get('POSTGRES_USER')
db = os.environ.get('POSTGRES_DB')
pw = os.environ.get('POSTGRES_PASSWORD')

while True:
    try:
        conn = psycopg2.connect(host=host, port=port, user=user, password=pw, database=db, connect_timeout=3)
        conn.close()
        print('Postgres available')
        break
    except Exception as e:
        print('Waiting for Postgres:', e, file=sys.stderr)
        time.sleep(2)
PY
fi

# If a direct command is given (e.g. `python`, `bash`), run it as-is.
if [ "$#" -gt 0 ]; then
  case "$1" in
    python|bash|sh|/bin/sh)
      exec "$@"
      ;;
  esac
fi

echo "Running migrations..."
python manage.py migrate --noinput || true

# Choose server based on DJANGO_ENV (local -> runserver, otherwise gunicorn)
if [ "${DJANGO_ENV:-}" = "local" ]; then
  echo "Starting Django development server (runserver)"
  exec python manage.py runserver 0.0.0.0:8000
else
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
  echo "Starting Gunicorn"
  exec gunicorn coop.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
