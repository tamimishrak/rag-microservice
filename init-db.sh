#!/bin/bash
set -e

DATABASES="auth_db user_db document_db conversation_db stats_db knowledge_db"

echo "Wiping existing databases and creating fresh instances..."

for db in $DATABASES; do
  DB_EXISTS=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'")
  
  if [ "$DB_EXISTS" = "1" ]; then
    echo "Terminating connections and dropping database: $db"
    
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db' AND pid <> pg_backend_pid();" > /dev/null
    
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "DROP DATABASE $db;"
  fi

  echo "Creating fresh database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "CREATE DATABASE $db;"
done

echo "All databases reset and recreated successfully!"