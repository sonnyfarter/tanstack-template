#!/usr/bin/env bash
# Bootstrap the local GSI bid pipeline directory and database.
# Safe to run repeatedly — will not overwrite existing files.

set -euo pipefail

PIPELINE_DIR="${GSI_PIPELINE_DIR:-$HOME/gsi-bid-pipeline}"
SKILL_DIR="$(cd "$(dirname "$0")/../../.claude/skills/bid-opportunity-scraper" && pwd)"

mkdir -p "$PIPELINE_DIR/daily_reports"

DB_FILE="$PIPELINE_DIR/bid_database.json"
if [[ ! -f "$DB_FILE" ]]; then
  cp "$SKILL_DIR/database_schema.json" "$DB_FILE"
  echo "Created $DB_FILE from skill template."
else
  echo "$DB_FILE already exists — leaving it alone."
fi

LOG_FILE="$PIPELINE_DIR/scan_log.json"
if [[ ! -f "$LOG_FILE" ]]; then
  printf '{"scans": []}\n' > "$LOG_FILE"
  echo "Created $LOG_FILE."
else
  echo "$LOG_FILE already exists — leaving it alone."
fi

echo "Pipeline ready at: $PIPELINE_DIR"
