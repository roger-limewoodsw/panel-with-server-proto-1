import { GetViewerMobsRequest, GetViewerMobsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';

import { getMetadata, getApiClient } from './api-client.js';
import { displayText, displayTextDebug, displayTextError, displayTextFine, displayTextInfo, displayTextWarn} from './logging.js';
import { MonitorType } from './utils.js';

export var nullMobId = "00000000-0000-0000-0000-000000000000";

export function getActiveSequenceId() {
    displayTextDebug("getActiveSequenceId");

    return new Promise((resolve, reject) => {
        const mcapiclient = getApiClient();
        const md = getMetadata();
        if (!mcapiclient || !md) {
            displayTextError("API client or metadata is not initialized.");
            resolve(nullMobId);
            return;
        }
        let mobId = nullMobId;
        let request = new GetViewerMobsRequest();

        let getViewerMobsRequestBody = new GetViewerMobsRequestBody;
        request.setBody(getViewerMobsRequestBody);
        displayTextDebug("submitting getViewerMobs request");
        mcapiclient.getViewerMobs(request, md, (err, response) => {
            if (err) {
                const errMessage = `Unexpected error: code = ${err.code}` +
                    `, message = "${err.message}"`;
                displayTextError(errMessage);
                mcapi.reportError(err.code, err.message);
                reject(err);
            } else {
                
                const responseBody = response.getBody();
                if (!responseBody) {
                    displayTextError("getViewerMobs response body is undefined");
                    reject(new Error("getViewerMobs response body is undefined"));
                    return;
                }
                displayTextDebug("getViewerMobs response received: " + JSON.stringify(responseBody));
                let mobInfoList = responseBody.getMobsList();
                let found = false;
                for (let mobInfo of mobInfoList) {
                    let dispString = "";
                    mobId = mobInfo.getMobId();
                    let frame = mobInfo.getCurrentFrame();
                    let timecode = mobInfo.getCurrentTimecode();

                    switch (mobInfo.getViewType()) {
                        case proto.mcapi.ViewerType.RECORD:
                            dispString = MonitorType.RECMON;
                            found = true;
                            break;

                        default:
                            break;
                    }
                    if (found) {
                        displayTextDebug("Active sequence found, resolving: " + mobId);
                        resolve(mobId);
                        return;
                    }
                    
                }

                displayTextWarn("No active sequence found, resolving: " + nullMobId);
                resolve(nullMobId);
                return;
            }
        });
    });

}