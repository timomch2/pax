#!/bin/sh
set -eu

read_secret() {
  secret_file="$1"
  variable_name="$2"

  if [ ! -r "$secret_file" ]; then
    echo "Required secret file for ${variable_name} is not readable." >&2
    exit 1
  fi

  tr -d '\r\n' < "$secret_file"
}

if [ -z "${DATABASE_URL:-}" ] && [ -n "${DATABASE_PASSWORD_FILE:-}" ]; then
  database_password="$(read_secret "$DATABASE_PASSWORD_FILE" DATABASE_PASSWORD_FILE)"
  database_host="${DATABASE_HOST:-postgres}"
  database_port="${DATABASE_PORT:-5432}"
  database_name="${DATABASE_NAME:-pax_dev}"
  database_user="${DATABASE_USER:-pax_app}"
  export DATABASE_URL="postgresql://${database_user}:${database_password}@${database_host}:${database_port}/${database_name}?schema=public&connection_limit=5&pool_timeout=5"
  unset database_password
fi

if [ -z "${NEXTAUTH_SECRET:-}" ] && [ -n "${NEXTAUTH_SECRET_FILE:-}" ]; then
  NEXTAUTH_SECRET="$(read_secret "$NEXTAUTH_SECRET_FILE" NEXTAUTH_SECRET_FILE)"
  export NEXTAUTH_SECRET
fi

exec "$@"
