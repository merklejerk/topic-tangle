#!/usr/bin/env bash

set -e
ENV_FILE=".env.${DEPLOY_ENV:-production}"
source "$ENV_FILE"
npm run build
ENV_VARS='^::^'$(cat "$ENV_FILE" | sed -r '/^\s*$/d' | sed -r 's/^([^=]+)=("(.+?)"|'"'"'(.+?)'"'"'|(.+)?)/\1=\3\4\5/g' | awk 1 ORS='::')
gcloud functions deploy "$SERVICE_NAME" \
    -q \
    --project "$PROJECT_ID" \
    --gen2 \
    --runtime=nodejs22 \
    --update-build-env-vars="^,^GOOGLE_NODE_RUN_SCRIPTS=,NODE_ENV=production" \
    --region=us-central1 \
    --source=. \
    --entry-point=tangle \
    --trigger-http \
    --allow-unauthenticated \
    --memory 128Mi \
    --set-env-vars "$ENV_VARS"
