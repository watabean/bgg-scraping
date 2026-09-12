const REFRESH_HANDLER = "runBggRefreshJob";

/**
 * Starts the Cloud Run Job and returns without waiting for its execution.
 */
function runBggRefreshJob() {
  const projectId = requireScriptProperty_("GCP_PROJECT_ID");
  const region = requireScriptProperty_("GCP_REGION");
  const jobName = requireScriptProperty_("CLOUD_RUN_JOB");
  const endpoint =
    "https://run.googleapis.com/v2/projects/" +
    encodeURIComponent(projectId) +
    "/locations/" +
    encodeURIComponent(region) +
    "/jobs/" +
    encodeURIComponent(jobName) +
    ":run";

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: "{}",
    muteHttpExceptions: true,
  });
  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Cloud Run Jobs API returned " + statusCode + ": " + responseBody.slice(0, 500));
  }

  const operation = JSON.parse(responseBody);
  console.log("BGG refresh job started: " + operation.name);
  return operation;
}

/**
 * Installs one daily trigger. Existing triggers for the same handler are replaced.
 */
function installDailyTrigger() {
  removeDailyTrigger();
  ScriptApp.newTrigger(REFRESH_HANDLER).timeBased().everyDays(1).atHour(3).create();
  console.log("Daily BGG refresh trigger installed");
}

function removeDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() === REFRESH_HANDLER;
    })
    .forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });
}

function requireScriptProperty_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || !value.trim()) {
    throw new Error("Missing script property: " + name);
  }
  return value.trim();
}
