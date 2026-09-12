# Apps Script scheduler

The time-driven trigger calls the Cloud Run Jobs API and finishes as soon as the job execution has started. The
`bgg-scraping` job then scrapes BoardGameGeek and replaces the Google Sheets data only after validation succeeds.

## Google Cloud setup

Enable the APIs used for deployment, execution, and spreadsheet updates:

```bash
gcloud services enable run.googleapis.com sheets.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project=green-carrier-297111
```

Create the dedicated runtime service account referenced by the deployment workflow:

```bash
gcloud iam service-accounts create bgg-scraping --display-name="BGG scraping Cloud Run Job" --project=green-carrier-297111
```

The GitHub Actions deployer stored in `GCP_SA_KEY` must be allowed to attach this runtime identity. Replace
`GITHUB_ACTIONS_SERVICE_ACCOUNT` with that service account's email:

```bash
gcloud iam service-accounts add-iam-policy-binding bgg-scraping@green-carrier-297111.iam.gserviceaccount.com --member="serviceAccount:GITHUB_ACTIONS_SERVICE_ACCOUNT" --role="roles/iam.serviceAccountUser" --project=green-carrier-297111
```

After the deployment workflow creates the job, allow the Google account that owns the Apps Script project to execute
it. Replace `YOUR_GOOGLE_ACCOUNT` with the account's email:

```bash
gcloud run jobs add-iam-policy-binding bgg-scraping --region=asia-northeast1 --member="user:YOUR_GOOGLE_ACCOUNT" --role="roles/run.invoker" --project=green-carrier-297111
```

The same account also needs to inspect existing executions so the scheduler can skip a refresh while one is
already running:

```bash
gcloud run jobs add-iam-policy-binding bgg-scraping --region=asia-northeast1 --member="user:YOUR_GOOGLE_ACCOUNT" --role="roles/run.viewer" --project=green-carrier-297111
```

Share the target spreadsheet with
`bgg-scraping@green-carrier-297111.iam.gserviceaccount.com` as an editor. The job uses this identity through Application
Default Credentials; do not configure `GOOGLE_APPLICATION_CREDENTIALS`.

## Apps Script setup

1. Create a standalone Apps Script project linked to the `green-carrier-297111` standard Google Cloud project.
2. Copy `Code.gs` and `appsscript.json` into the project.
3. Add these script properties in **Project Settings**:

| Property         | Value                  |
| ---------------- | ---------------------- |
| `GCP_PROJECT_ID` | `green-carrier-297111` |
| `GCP_REGION`     | `asia-northeast1`      |
| `CLOUD_RUN_JOB`  | `bgg-scraping`         |

4. Run `runBggRefreshJob` manually once and approve its OAuth scopes.
5. Confirm that the Cloud Run execution succeeds and that the `data` and `metadata` sheets are updated.
6. Run `installDailyTrigger` once. The trigger runs daily around 03:00 JST.

`installDailyTrigger` replaces an existing trigger for the same function, so rerunning it does not create duplicates.
