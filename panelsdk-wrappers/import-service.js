import { ImportFileRequest, ImportFileRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getApiClient, getMetadata } from './api-client';
import { displayTextInfo, displayTextError, displayTextDebug } from './logging.js';
import { getImportSettingsName } from './create-settings';

export async function importFile(filepath, binName) {
    return new Promise((resolve, reject) => {
      if (!filepath || !binName) {
        displayTextError("File path or bin name is not provided.");
        reject(new Error("File path or bin name is not provided"));
        return;
      }
      const mcapiclient = getApiClient();
      const md = getMetadata();
      if (!mcapiclient || !md) { 
        displayTextError("API client or metadata is not initialized.");
        reject(new Error("API client or metadata is not initialized"));
        return;
      }
      const request = new ImportFileRequest();
      displayTextInfo("Importing file: " + filepath + " into bin: " + binName);
      const body = new ImportFileRequestBody();
      body.setFilePath(filepath);
      body.setImportSettingsName(getImportSettingsName());
      body.setDestinationBin(binName);
      request.setBody(body);

      mcapiclient.importFile(request, md, (err, response) => {
            if (err) {
                displayTextError("Error importing file: " + err);
                reject(err);
            } else {
                displayTextDebug("File imported successfully.");
                resolve(response);
            }
        });
    });
}