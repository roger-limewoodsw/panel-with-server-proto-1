import { getApiClient, getMetadata } from "./api-client.js";
import { GetMobInfoRequest, GetMobInfoRequestBody } from "../grpc-web/MCAPI_Types_pb.js";
import { displayTextInfo, displayTextDebug, displayTextError } from "./logging.js";

// Function to get mob information and export it
// columNames is an array of column names to retrieve. If null, all columns are retrieved
export async function getMobInfo(mob_id, columnNames) {
  displayTextDebug("getMobInfoThenExport: " + mob_id);

  return new Promise((resolve, reject) => {
    if (!mob_id) {
      resolve(null);
      return;
    }

    const mcAPIClient = getApiClient();
    const md = getMetadata(); 
    if (!mcAPIClient || !md) {
      displayTextError("API client or metadata is not initialized."); 
      resolve(null);
      return;
    }

    const request = new GetMobInfoRequest();
    const requestBody = new GetMobInfoRequestBody();
    const only_visible_columns = false;
    const includes_empty_columns = false; 
    requestBody.setMobId(mob_id);
    requestBody.setOnlyVisibleColumns(only_visible_columns);
    requestBody.setIncludesEmptyColumns(includes_empty_columns);

    request.setBody(requestBody);

    let resultMap = {};

    let stream = mcAPIClient.getMobInfo(request, md);

    stream.on('data', (response) => {
      let body = response.getBody();
      let columnName = body.getColumnName();
      let columnValue = body.getColumnValue();
      if (!columnNames || columnNames.includes(columnName)) {
        resultMap[columnName] = columnValue;
      }
    });

    stream.on('error', (err) => {
      const errMessage = `Unexpected stream error: code = ${err.code}` +
      `, message = "${err.message}"`;
      displayTextError(errMessage);
      reject(err);
    });

    stream.on('status', (status) => {
      displayTextDebug(status);
    });

    stream.on('end', async () => {
      displayTextDebug(`Completed, resultMap: ${JSON.stringify(resultMap)}`);
      try {
        resolve(resultMap);
      } catch (error) {
        reject(error);
      }
    });
  });
}
