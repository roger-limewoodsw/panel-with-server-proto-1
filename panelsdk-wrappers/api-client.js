import { MCAPIClient } from '../grpc-web/MCAPI_grpc_web_pb.js';

let mcapiclient = null

export function initApiClient() {
    // Setup MCAPI client
    if (typeof mcapi !== 'undefined') {
        mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);
    }
}
// Get metadata for API calls
export function getMetadata() {
    return {
        accessToken: typeof mcapi !== 'undefined' ? mcapi.getAccessToken() : 'sample-token'
    };
}

export function getApiClient() {
    if (typeof mcapiclient !== 'undefined') {
        return mcapiclient
    } else {
        console.error("MCAPI is not defined");
        return null;
    }
}

