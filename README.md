# Data processing platform on Azure

A governed data processing platform, authored and instantiated with the
[Fractal Cloud TypeScript SDK](https://www.npmjs.com/package/@fractal_cloud/sdk).

## What it provisions

```
DistributedDataProcessing (analytics-workspace)  Azure Databricks workspace (premium)
  ├─ ComputeCluster (analytics-cluster)          Databricks cluster
  ├─ DataProcessingJob (etl-job)                 Scheduled ETL job (needs the cluster)
  └─ MlExperiment (fraud-model)                  MLflow experiment tracker
Datalake (acmebigdatalake)                       ADLS Gen2 storage account, versioning on
```

## Layout

```
src/
  fractal.ts   Vendor-agnostic blueprint: structure, guardrails, operations
  azure.ts     Specializes the Fractal, maps components to Azure offers, deploys
  fatal.ts     Failure reporting that never prints credentials
.github/workflows/
  ci.yml       Compile + lint + audit on every PR and push to main
  deploy.yml   Manual deploy to a chosen environment
```

Guardrails (max workers, auto-termination, retries, lake versioning) are locked
in `fractal.ts`. The app only decides names and schedule via operations. The
Azure offer mapping lives in the `select` map in `azure.ts`.

`acmebigdatalake` becomes an Azure storage account name, which is global across
Azure, lowercase alphanumeric, 24 characters max. Change it in `fractal.ts` and
`azure.ts` together if it is taken.

## Prerequisites

1. A Fractal Cloud service account (client id + secret).
2. Your owner UUID.
3. A Fractal Cloud **environment** with the same name you deploy to (`dev` by
   default), already connected to an Azure subscription. This repo deploys a Live
   System into an environment; it does not create the environment.

## Run locally

```bash
cp .sample.env .env    # fill in the blanks
./deploy.sh            # npm install, compile, deploy
```

Or manually: `npm ci && npm run deploy` with the variables exported.

| Variable | Required | Description |
|---|---|---|
| `SERVICE_ACCOUNT_ID` | yes | Service account id |
| `SERVICE_ACCOUNT_SECRET` | yes | Service account secret |
| `OWNER_ID` | yes | Owner UUID |
| `BC_NAME` | no | Bounded context name (default `data-platform`) |
| `ENVIRONMENT_NAME` | no | Environment (default `dev`) |
| `LIVE_SYSTEM_NAME` | no | Live System name (default `data-processing-platform`) |
| `DEPLOY_MODE` | no | `wait` (default) or `fire-and-forget` |

## GitHub Actions

`ci.yml` runs on pull requests and pushes to `main`.

`deploy.yml` is manual (**Actions → Deploy data processing platform → Run
workflow**). Pick the environment and mode. Deploys to the same environment are
serialized.

Configure these per GitHub environment (`dev`, `staging`, `prod`; add required
reviewers on `prod`):

| Kind | Name | Value |
|---|---|---|
| Secret | `FRACTAL_SERVICE_ACCOUNT_ID` | Service account id |
| Secret | `FRACTAL_SERVICE_ACCOUNT_SECRET` | Service account secret |
| Variable | `FRACTAL_OWNER_ID` | Owner UUID |
| Variable | `FRACTAL_BC_NAME` | Bounded context name (optional) |

The selected environment name is passed as `ENVIRONMENT_NAME`, so each GitHub
environment targets the Fractal environment of the same name.
