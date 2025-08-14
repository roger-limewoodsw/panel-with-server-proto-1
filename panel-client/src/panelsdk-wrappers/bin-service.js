// src/services/bin-service.js
import { 
    GetBinsRequest, GetBinsRequestBody, GetBinsFlag,
    OpenBinRequest, OpenBinRequestBody,
    CloseBinRequest, CloseBinRequestBody,
    CreateBinRequest, CreateBinRequestBody
} from '../panelsdk-bridge.js';

import { displayTextDebug, displayTextError, 
    displayTextFine, displayTextInfo, displayTextWarn } from './logging.js';
import { getMetadata, getApiClient } from './api-client.js';

/**
 * Open a bin in Media Composer
 * @param {string} binName - The name of the bin to open
 */
export async function openBin(binName) {
  return new Promise((resolve, reject) => {
    let mcapiclient = getApiClient();
    let md = getMetadata();
    if (!mcapiclient || !md) {
      displayTextError("API client or metadata is not initialized.");
      reject(new Error("API client or metadata is not initialized"));
      return;
    } else if (!binName) {
      displayTextError("Bin name is not provided.");
      reject(new Error("Bin name is not provided"));
      return;
    }

    displayTextDebug("Opening bin: " + binName);
    const OpenBinRequestClass = OpenBinRequest();
    const OpenBinRequestBodyClass = OpenBinRequestBody();
    const request = new OpenBinRequestClass();
    const body = new OpenBinRequestBodyClass();

    body.setBinPath("./" + binName);
    request.setBody(body);

    displayTextDebug("Calling mcapiclient.openBin()...");

    mcapiclient.openBin(request, md, (err, response) => {
      displayTextDebug("mcapiclient.openBin() callback called...");
      if (err) {
        // Check for specific error code that indicates bin not found
        if (err.code === 3) {
          displayTextDebug(`Bin not found: ${binName}`);
          resolve(false); // Bin does not exist
        } else {
          displayTextError("Error opening bin: " + err);
          reject(err);
        }
      } else {
        displayTextDebug("Bin opened successfully.");
        resolve(true); // Bin exists
      }
    });
  });
}

/**
 * Close a bin in Media Composer
 * @param {string} binName - The name of the bin to close
 */
export async function closeBin(binName) {

  return new Promise((resolve, reject) => {

    let mcapiclient = getApiClient();
    let md = getMetadata();
    if (!mcapiclient || !md) {
      displayTextError("API client or metadata is not initialized.");
      reject(new Error("API client or metadata is not initialized"));
      return;
    } else if (!binName) {
      displayTextError("Bin name is not provided.");
      reject(new Error("Bin name is not provided"));
      return;
    }

    displayTextDebug("Closing bin: " + binName);
    const CloseBinRequestClass = CloseBinRequest();
    const CloseBinRequestBodyClass = CloseBinRequestBody();
    const request = new CloseBinRequestClass();
    const body = new CloseBinRequestBodyClass();
    
    body.setBinPath("./" + binName);
    request.setBody(body);

    mcapiclient.closeBin(request, md, (err, response) => {
      if (err) {
        displayTextError("Error closing bin: " + err);
        reject(err);
      } else {
        displayTextDebug("Bin closed successfully.");
        resolve(true);
      }
    });
  });
}

/**
 * Create a new bin in Media Composer
 * @param {string} binName - The name of the bin to create
 */
export async function createBin(binName) {

  return new Promise((resolve, reject) => {
    const mcapiclient = getApiClient();
    const md = getMetadata();

    if (!mcapiclient || !md) {
      displayTextError("API client or metadata is not initialized.");
      reject(new Error("API client or metadata is not initialized"));
      return;
    } else if (!binName) {
      displayTextError("Bin name is not provided.");
      reject(new Error("Bin name is not provided"));
      return;
    }

    displayTextDebug("Creating bin: " + binName);
    const CreateBinRequestClass = CreateBinRequest();
    const CreateBinRequestBodyClass = CreateBinRequestBody();
    const openBinOption = CreateBinRequestBodyClass.OpenBinOption.LASTACTIVEBINCONTAINER;
    const request = new CreateBinRequestClass();
    const body = new CreateBinRequestBodyClass();
    
    body.setBinName(binName);
    body.setFolderPath("");
    body.setOption(openBinOption);
    request.setBody(body);

    mcapiclient.createBin(request, md, (err, response) => {
      if (err) {
        displayTextError("Error creating bin: " + err);
        reject(err);
      } else {
        displayTextDebug("Bin created successfully.");
        resolve(true);
      }
    });
  });
}

/**
 * Open a bin in Media Composer, or create it if it doesn't exist
 * @param {string} binName - The name of the bin to open or create
 * @returns {Promise<boolean>} - Resolves with true if successful, false otherwise
 */
export function openOrCreateBin(binName) {
  return new Promise(async (resolve, reject) => {
    displayTextDebug(`Attempting to open or create bin: ${binName}`);

    try {
      const binExists = await openBin(binName);
      if (binExists) {
        displayTextDebug(`Bin ${binName} opened successfully`);
        resolve(true);
      } else {
        displayTextDebug(`Bin ${binName} not found, creating it`);
        try {
          await createBin(binName);
          displayTextDebug(`Bin ${binName} created successfully`);
          resolve(true);
        } catch (createErr) {
          displayTextError(`Failed to create bin ${binName}: ${createErr.message}`);
          reject(createErr);
        }
      }
    } catch (err) {
      displayTextError(`Error in openOrCreateBin: ${err}`);
      reject(err);
    }
  });
}

/**
 * Get all bins from Media Composer (streaming response)
 * @returns {Promise<Array>} - Resolves with array of bin objects
 */
export async function getAllBins() {
  return new Promise((resolve, reject) => {
    const mcapiclient = getApiClient();
    const md = getMetadata();
    
    if (!mcapiclient || !md) {
      displayTextError("API client or metadata is not initialized.");
      reject(new Error("API client or metadata is not initialized"));
      return;
    }

    displayTextDebug("Getting all bins...");
    const GetBinsRequestClass = GetBinsRequest();
    const GetBinsRequestBodyClass = GetBinsRequestBody();
    const request = new GetBinsRequestClass();
    const requestBody = new GetBinsRequestBodyClass();
    request.setBody(requestBody);

    const bins = [];
    
    // Make the streaming gRPC call
    const stream = mcapiclient.getBins(request, md);
    
    stream.on('data', (response) => {
      displayTextDebug('Received bin data:', response);
      if (response && response.toObject) {
        const data = response.toObject();
        bins.push(data);
        displayTextDebug(`Received bin: ${data.body?.name || 'Unknown'}`);
      }
    });
    
    stream.on('error', (error) => {
      displayTextError(`Stream error: ${error.message}`);
      reject(error);
    });
    
    stream.on('end', () => {
      displayTextInfo(`Retrieved ${bins.length} bins total`);
      resolve(bins);
    });
  });
}