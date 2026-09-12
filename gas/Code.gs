const REFRESH_HANDLER = "runBggRefreshJob";

/**
 * Starts the Cloud Run Job and returns without waiting for its execution.
 */
function runBggRefreshJob() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const projectId = requireScriptProperty_("GCP_PROJECT_ID");
    const region = requireScriptProperty_("GCP_REGION");
    const jobName = requireScriptProperty_("CLOUD_RUN_JOB");
    const jobEndpoint =
      "https://run.googleapis.com/v2/projects/" +
      encodeURIComponent(projectId) +
      "/locations/" +
      encodeURIComponent(region) +
      "/jobs/" +
      encodeURIComponent(jobName);
    const requestHeaders = {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    };

    if (hasActiveExecution_(jobEndpoint, requestHeaders)) {
      console.log("BGG refresh skipped because a job execution is already active");
      return null;
    }

    const operation = fetchJson_(jobEndpoint + ":run", {
      method: "post",
      contentType: "application/json",
      headers: requestHeaders,
      payload: "{}",
    });
    console.log("BGG refresh job started: " + operation.name);
    return operation;
  } finally {
    lock.releaseLock();
  }
}

function hasActiveExecution_(jobEndpoint, requestHeaders) {
  const response = fetchJson_(jobEndpoint + "/executions?pageSize=100", {
    method: "get",
    headers: requestHeaders,
  });
  return (response.executions || []).some(function (execution) {
    return !execution.completionTime;
  });
}

function fetchJson_(endpoint, options) {
  const response = UrlFetchApp.fetch(
    endpoint,
    Object.assign(
      {
        muteHttpExceptions: true,
      },
      options,
    ),
  );
  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Cloud Run API returned " + statusCode + ": " + responseBody.slice(0, 500));
  }

  return responseBody ? JSON.parse(responseBody) : {};
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
