import { MCAPIClient } from '../panelsdk-bridge.js';

let mcapiclient = null

export function initApiClient() {
    // Setup MCAPI client
    if (typeof mcapi !== 'undefined' && window.proto && window.proto.mcapi && window.proto.mcapi.MCAPIClient) {
        mcapiclient = new window.proto.mcapi.MCAPIClient(mcapi.getGatewayServerAddress(), null, null);
        console.log('✅ MCAPI client initialized via wrapper');
    } else {
        console.warn('MCAPI client initialization failed - mcapi or proto not available');
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

