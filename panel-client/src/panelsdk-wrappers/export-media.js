import { ExportFileRequest, ExportFileRequestBody, CommandErrorType } from '../panelsdk-bridge.js';
import { registerTaskPath } from './utils.js';
import { displayTextDebug, displayTextError, 
    displayTextFine, displayTextInfo, displayTextWarn } from './logging.js';
import { Mutex } from 'async-mutex';
import { getApiClient, getMetadata } from './api-client.js';
import { getSuffixFromSettingName } from './create-settings.js';


const mutex = new Mutex();


export async function exportToFile(mob_id, exportSettingsName, destinationPath, fileName) {
    // Create promise with resolver
    return new Promise((resolve, reject) => {

      // Export to file and display path (or error message in the case of failure).
      const apiClient = getApiClient();
      const md = getMetadata();
      if (!apiClient || !md) {
          displayTextError("API client is not initialized.");
          reject(new Error("API client is not initialized"));
          return;
      } else if (!mob_id || !exportSettingsName || !destinationPath || !fileName) {
          displayTextError("Required parameters are missing: mob_id, exportSettingsName, destinationPath, or fileName.");
          reject(new Error("Required parameters are missing: mob_id, exportSettingsName, destinationPath, or fileName"));
          return;
      }

      displayTextDebug("exportToFile: " + mob_id + ", exportSettingsName: " + exportSettingsName + ", destinationPath: " + destinationPath + ", fileName: " + fileName);

      let request = new ExportFileRequest();
      let exportFileRequestBody = new ExportFileRequestBody();
      exportFileRequestBody.setMobId(mob_id);
      let exportSuffix = getSuffixFromSettingName(exportSettingsName);
      if (!exportSuffix) {
        displayTextWarn("Failed to get suffix for export settings name: " + exportSettingsName);
        exportSuffix = ".wav";
      }

      exportFileRequestBody.setExportSettingsName(exportSettingsName);
      exportFileRequestBody.setDestinationPath(destinationPath);
      exportFileRequestBody.setInDirectory("");
      exportFileRequestBody.setFileName(fileName);

      request.setBody(exportFileRequestBody);

      apiClient.exportFile(request, md, async (err, response) => {
          if (err) {
              // Handle errors (your existing error handling code)
              try {
                  const jsonData = JSON.parse(err.message);
                  switch (jsonData.ErrorType) {
                      case CommandErrorType.MC_EXPORTSETTINGSNOTFOUND:
                          displayTextError("Export error: " + jsonData.ErrorMessage);
                          break;
                      default:
                          displayTextError("Export error: " + jsonData.ErrorMessage);
                          break;
                  }
              } catch (error) {
                  let errorMessage = `Unexpected error: Code = ${err.code}, message = "${err.message}"`;
                  displayTextError("Export error: " + errorMessage);
              }
              reject(err); // Reject on error instead of resolving false
          } else {
              // Display path to file.
              if (response && response.getHeader()) {
                  const header = response.getHeader();
                  displayTextDebug(`File export request submitted successfully. taskID: ${header.getTaskId()}, status: ${header.getStatus()}, progress: ${header.getProgress()}`);

                  // Register the resolver function directly
                  registerTaskPath(header.getTaskId(), destinationPath + "/" + fileName + exportSuffix, resolve);
              } else {
                  displayTextError("Error: Export Response header is missing or invalid.");
                  reject(new Error("Export Response header is missing or invalid"));
              }
            }
        });
    });
};
