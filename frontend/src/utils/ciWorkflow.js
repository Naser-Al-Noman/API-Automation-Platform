/**
 * Ready-to-copy GitHub Actions YAML for triggering a platform CI run.
 */
export function buildCiWorkflowYaml({ collectionId, environmentId }) {
  const cid = collectionId ?? 'YOUR_COLLECTION_ID';
  const eid = environmentId ?? 'YOUR_ENVIRONMENT_ID';

  return `# API Automation Platform — CI regression
# Secrets (Settings → Secrets and variables → Actions):
#   BACKEND_URL — your deployed backend base URL (no trailing slash)
#   API_KEY     — generate under /api-keys in the platform (shown once)

name: API Regression

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  regression:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Trigger Newman run on platform
        env:
          BACKEND_URL: \${{ secrets.BACKEND_URL }}
          API_KEY: \${{ secrets.API_KEY }}
        run: |
          set -euo pipefail
          BACKEND_URL="\${BACKEND_URL%/}"
          COLLECTION_ID=${cid}
          ENVIRONMENT_ID=${eid}

          RESPONSE=$(curl -sS -X POST "\${BACKEND_URL}/api/ci/executions" \\
            -H "Content-Type: application/json" \\
            -H "X-API-Key: \${API_KEY}" \\
            -d "{\\"collectionId\\": \${COLLECTION_ID}, \\"environmentId\\": \${ENVIRONMENT_ID}}")

          echo "Start response: \${RESPONSE}"
          EXEC_ID=$(echo "\${RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
          [ -n "\${EXEC_ID}" ] || { echo "Failed to parse execution id"; exit 1; }

          STATUS="running"
          ATTEMPTS=0
          while [ "\${STATUS}" = "running" ] && [ "\${ATTEMPTS}" -lt 120 ]; do
            sleep 5
            ATTEMPTS=$((ATTEMPTS + 1))
            POLL=$(curl -sS "\${BACKEND_URL}/api/ci/executions/\${EXEC_ID}/status" -H "X-API-Key: \${API_KEY}")
            STATUS=$(echo "\${POLL}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
            REPORT_URL=$(echo "\${POLL}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('report_url') or '')")
            echo "Poll #\${ATTEMPTS}: status=\${STATUS}"
          done

          if [ -n "\${REPORT_URL}" ]; then
            case "\${REPORT_URL}" in
              http*) echo "Report URL: \${REPORT_URL}" ;;
              *) echo "Report URL: \${BACKEND_URL}\${REPORT_URL}" ;;
            esac
          fi

          [ "\${STATUS}" = "passed" ] || { echo "API regression failed (status=\${STATUS})"; exit 1; }
          echo "API regression passed"
`;
}
