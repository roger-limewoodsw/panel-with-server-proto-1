// index.js - Complete implementation for Media Composer integration

// Import necessary modules for gRPC communication with Media Composer
import { CommandErrorType } from '../panelsdk-bridge.js';
import { importFileIntoAcclaimBin } from './import-to-bin.js';
import { createSettings, getExportSettingsNameFromType } from './create-settings.js';
import { getActiveSequenceId, nullMobId } from './get-active-service.js';
import { exportToFile } from './export-media.js';
import { getPathByTaskId, getResolverByTaskId } from './utils.js';
import { setLogLevel, setOutputArea, LogLevel, 
    displayTextDebug, displayTextError, 
    displayTextFine, displayTextInfo, displayTextWarn, 
    getLogLevelName,
    setLogLevelByName } from './logging.js';
import { initApiClient } from './api-client.js';
import { getMobInfo } from './mob-info-service.js';

// Constants for MIME types
const MCAPI_ASSETLIST_MIME_TYPE = 'text/x.avid.mc-api-asset-list+json';
const MCAPI_PLUGIN_ASSET_LIST_MIME_TYPE = 'text/x.avid.panel-sdk-plugin-asset-list+json';

// Initialize variables
let currentExportPath;
const DEFAULT_EXPORT_PATH_WINDOWS = "D:/DND-POC";
const DEFAULT_EXPORT_PATH_MAC = "/Users/Shared/DND-POC";

// Detect platform and set export path accordingly
if (navigator.platform.startsWith('Mac')) {
    currentExportPath = DEFAULT_EXPORT_PATH_MAC;
} else {
    currentExportPath = DEFAULT_EXPORT_PATH_WINDOWS;
}
let exportName = ""; // Default export name

// DOM elements
let dropArea, droppedContent, outputArea, submitButton, messageInput;

// Initialize the application
function initApp() {
    console.log("Initializing application...");
    
    // Setup MCAPI client
    initApiClient();

    // Get DOM elements
    dropArea = document.getElementById('drop-zone');
    outputArea = document.getElementById('output-area');
    submitButton = document.getElementById('submit-button');
    messageInput = document.getElementById('message-input');
    const sendMessageButton = document.getElementById('send-message-button');
    const clearMessageButton = document.getElementById('clear-message-button');
    
    setOutputArea(outputArea, document);

    // Setup event listeners
    if (submitButton) {
        submitButton.onclick = handleButtonClick;
        displayTextDebug("Submit button listener attached");
    } else {
        displayTextWarn("Submit button not found");
    }
    
    if (sendMessageButton) {
        sendMessageButton.onclick = function() {
            const message = messageInput.value.trim();
            if (message) {
                sendMessage(message);
                messageInput.value = '';
            }
        };
        displayTextDebug("Send message button listener attached");
    } else {
        displayTextWarn("Send message button not found");
    }
    
    if (clearMessageButton) {
        clearMessageButton.onclick = function() {
            messageInput.value = '';
            messageInput.focus();
        };
        displayTextDebug("Clear button listener attached");
    } else {
        displayTextWarn("Clear button not found");
    }
    
    setupDragAndDropListeners();
    
    // Handle message input if Enter key is pressed
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const message = messageInput.value.trim();
                if (message) {
                    sendMessage(message);
                    messageInput.value = '';
                }
            }
        });
        displayTextDebug("Message input keypress listener attached");
    } else {
        displayTextWarn("Message input not found");
    }
 
    displayTextDebug("Media Composer integration initialized");
}

// Function to send message from the text input
function sendMessage(message) {
  if (message.startsWith("loglevel:")) {
      const level = message.split(':')[1].trim();
      displayTextInfo(`Setting log level to: ${level}`);
      if (setLogLevelByName(level)) {
          displayTextInfo(`Log level set to: ${level}`);
      } else {
          displayTextError(`Invalid log level: ${level}`);
      }
  } else {
    displayTextDebug(`Sending message: ${message}`);
    
    // You can add actual message sending functionality here
    // For example, if you want to send this as a command or notification to Media Composer
    
    exportName = message;
    updateMessageInput("Processing: " + message);
  }
    
}

// Function to update the message input with text from JavaScript
function updateMessageInput(text) {
    if (messageInput) {
        messageInput.value = text;
        // Optional: trigger "input" event to notify any listeners that the value has changed
        messageInput.dispatchEvent(new Event('input'));
    }
}

// Set up drag and drop event listeners
function setupDragAndDropListeners() {
    displayTextDebug("Setting up drag and drop listeners");
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        if (dropArea) {
            dropArea.addEventListener(eventName, preventDefaults, false);
            displayTextDebug(`Added ${eventName} listener to drop area`);
        }
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        document.body.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, unhighlight, false);
    });

    // Handle drops
    if (dropArea) {
        dropArea.addEventListener('drop', handleMediaComposerDrop, false);
        displayTextDebug("Added drop handler to drop area");
    }
    document.body.addEventListener('drop', handleMediaComposerDrop, false);
    displayTextDebug("Added drop handler to body");
}

// Prevent default events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area
function highlight(e) {
    document.body.classList.add('highlight');
}

// Remove highlight from drop area
function unhighlight(e) {
    document.body.classList.remove('highlight');
}

// Handle drag from Media Composer to our app
async function handleMediaComposerDrop(e) {
    const dt = e.dataTransfer;
    displayTextDebug('Media Composer drop event detected: ' + dt.types);
    let parsedData = null;

    // Check for Avid's specific format
    if (dt.types.includes(MCAPI_ASSET_LIST_MIME_TYPE) ||
        dt.types.includes(MCAPI_PLUGIN_ASSET_LIST_MIME_TYPE)) {

        displayTextDebug('Media Composer data detected');
        
        // Determine which MIME type to use
        const mimeType = dt.types.includes(MCAPI_ASSET_LIST_MIME_TYPE) ?
            MCAPI_ASSET_LIST_MIME_TYPE : MCAPI_PLUGIN_ASSET_LIST_MIME_TYPE;
        
        const jsonData = dt.getData(mimeType);
        displayTextDebug(jsonData);
        parsedData = JSON.parse(jsonData);
    } else {
        displayTextError("Dropped item format not recognized");
        return;
    }

    try {
        displayTextDebug('Attempting to create settings...');
        const settingsResult = await createSettings();
        if (!settingsResult) {
            displayTextError('Failed to create settings');
            return; // TODO: better error handling
        } else {
          displayTextDebug('Settings created successfully');
        }
    } catch (error) {
        displayTextError(`<p>Error creating settings: ${error.message}</p>`);
    }

    try {
        displayTextDebug('Processing dropped data... ' + dt.types);
            
        //content = `<p>Received Media Composer data:</p><pre>${JSON.stringify(parsedData, null, 2)}</pre>`;
        
        // Process the dropped clips
        const processingPromises = parsedData.map(async (element) => {
            let id = element["id"];
            let head = element["head"];
            let inMark = element["in"];
            let outMark = element["out"];
            let systemID = element["systemID"];
            let systemType = element["systemType"];
            let type = element["type"];

            displayTextDebug("id: " + id)
            displayTextDebug("head: " + head)
            displayTextDebug("systemID: " + systemID)
            displayTextDebug("systemType: " + systemType)
            displayTextDebug("type: " + type)

            try {
                await getMobInfoThenExport(id, type);
            } catch (error) {
                displayTextError(`Error processing clip ${id}: ${error.message}`);
            }
        });

        await Promise.all(processingPromises);

            
    } catch (error) {
        displayTextError(`<p>Error processing dropped data: ${error.message}</p>`);
    }
    //displayText(content);

}

async function getMobInfoThenExport(mob_id, mobType) {

  return new Promise(async (resolve, reject) => {
    if (!mob_id || !mobType) {
      displayTextError("Invalid mob_id or mobType");
      resolve(false);
      return;
    }

    // get "Name" column
    const columnNames = ["Name"];
    const mobInfoMap = await getMobInfo(mob_id, columnNames);
    if (!mobInfoMap) {
      displayTextError("Failed to retrieve mob info for mob_id: " + mob_id);
      resolve(false);
      return;
    }

    const mobName = mobInfoMap["Name"];
    if (!mobName) {
      displayTextError("Mob name not found for mob_id: " + mob_id);
      resolve(false);
      return;
    }

    let exportSettingsName = getExportSettingsNameFromType(mobType);
    if (!exportSettingsName) {
      displayTextError("Export settings name not found for mobType: " + mobType);
      resolve(false);
      return;
    }

    try {
        const result = await exportToFile(mob_id, exportSettingsName, currentExportPath, mobName);
        resolve(result);
    } catch (error) {
        reject(error);
    }
  });

}
// Clean up on page unload
function unload() {
    console.log('Page unloading, cleaning up...');
    // Any cleanup needed
    return;
}

async function onExportFileFinished(taskId, exportPath, errorString, errorCode) {
    displayTextDebug("onExportFileFinished: function entered with taskId: " + taskId +
        ", exportPath: " + exportPath +
        ", errorString: " + errorString +
        ", errorCode: " + errorCode);


    let resolver = getResolverByTaskId(taskId);
    
    if (!resolver) {
        displayTextError("No resolver found for taskId: " + taskId);
        return;
    }
    displayTextDebug("Resolver found for taskId: " + taskId);
    let taskPath = getPathByTaskId(taskId);

    if (errorCode == CommandErrorType.NOERROR) {
        let importPath = "";
        if (null == exportPath || exportPath == "" || /[\\/]\s*$/.test(exportPath)) {
            displayTextDebug("Export file finished, getting path from registry - taskId: " + taskId + ", path: " + taskPath);
            importPath = taskPath;
        } else {
            displayTextDebug("Export file finished, using provided path: " + exportPath);
            importPath = exportPath;
        }
        resolver(true);

    } else {      
        let errorMessage = `Unexpected error: ErrorType = ${errorCode}, message = "${errorString}"`;
        displayTextError("Export error: " + errorMessage);
        resolver(false); 
    }
    
    deleteTask(taskId);
    displayTextDebug("Task " + taskId + " deleted from registry");

    displayTextDebug("Export file finished");
    if (errorCode == CommandErrorType.NOERROR) {
        displayTextDebug("Export file finished successfully. Path: " + exportPath);
        updateMessageInput("Success: Export completed - " + exportPath);
        displayTextDebug("calling import function");
        updateMessageInput("Processing: Importing to Acclaim bin...");
        importFileIntoAcclaimBin(exportPath);
        return;
    }
    else {      
        let errorMessage = `Unexpected error: ErrorType = ${errorCode}` + `, message = "${errorString}"`;
        displayTextDebug("Export error: " + errorMessage);
        updateMessageInput("Error: Export failed - " + errorString);
    }
}

function registerNotifications() {
    if (typeof mcapi !== 'undefined' && mcapi.onEvent) {
        mcapi.onEvent.connect(function (eventName, eventData) {
            displayTextDebug("Event received: " + eventName);
            switch (eventName) {
                case "ExportFileFinished":
                    {
                        const jsonData = JSON.parse(eventData);
                        displayTextDebug("jsonData.taskId: " + jsonData.taskId);
                        onExportFileFinished(jsonData.taskId, jsonData.exportPath, jsonData.errorString, jsonData.errorCode);
                    }
                    break;
                default:
                    break;
            }
        });
        console.log("Notifications registered");
    } else {
        console.log("mcapi or mcapi.onEvent not available, notifications not registered");
    }
}

 async function handleButtonClick() {
     displayTextDebug("Button clicked");
     updateMessageInput("Processing: Searching Pro Sound Effects...");
     
     try {
         const searchResults = await searchProSoundEffects("Crowd Exterior Daytime Courtyard Horses Construction Activity");
         const soundIds = extractSoundIds(searchResults);
         
         displayTextInfo(`Found ${soundIds.length} sounds: ${soundIds.join(', ')}`);
         updateMessageInput(`Success: Found ${soundIds.length} sound effects`);
         
         return soundIds;
     } catch (error) {
         displayTextError(`Search failed: ${error.message}`);
         updateMessageInput("Error: Pro Sound Effects search failed");
         return [];
     }
 }

 async function searchProSoundEffects(query) {
     const apiKey = "pse_api_8StXIsC0boD-ZtT3xn3.CWOE";
     const apiUrl = "https://partner-preview.prosoundeffects.com/Search";
     
     const requestBody = {
         query: query,
         queryType: "simple",
         pageSize: 10
     };
     
     const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json',
             'pse-api-key': apiKey
         },
         body: JSON.stringify(requestBody)
     });
     
     if (!response.ok) {
         throw new Error(`API request failed: ${response.status} ${response.statusText}`);
     }
     
     return await response.json();
 }

 function extractSoundIds(searchResponse) {
     if (!searchResponse || !searchResponse.sounds || !Array.isArray(searchResponse.sounds)) {
         return [];
     }
     
     return searchResponse.sounds.map(sound => sound.id).filter(id => id);
 }

// Modified for various status updates
async function activeSequence_submit() {
    displayTextDebug("Sending active sequence...");
    updateMessageInput("Processing: Getting active sequence...");

    try {
        updateMessageInput("Processing: Creating settings...");
        await createSettings();
        displayTextDebug('Settings created successfully');
    } catch (error) {
        displayTextDebug(`Error creating settings: ${error.message}`);
        updateMessageInput("Error: Failed to create settings");
        return;
    }

    updateMessageInput("Processing: Getting sequence ID...");
    getActiveSequenceId().then((mobId) => {
        if (mobId === nullMobId) {
            displayTextDebug("No active sequence found");
            updateMessageInput("No active sequence found");
            return;
        } else {
            displayTextDebug("Exporting sequence: " + mobId);
            updateMessageInput("Processing: Exporting sequence " + mobId);
            getMobInfoThenExport(mobId, "sequence");
        }
    }
    ).catch((error) => {
        displayTextDebug("Error getting active sequence ID: " + error);
        updateMessageInput("Error: Failed to get sequence ID");
        return;
    });
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, initializing app");
    initApp();
});

// Register notifications when window loads
window.addEventListener('load', function() {
    console.log("Window loaded, registering notifications");
    registerNotifications();
});

// Export functions needed by other modules
export { 
    handleMediaComposerDrop,
    updateMessageInput,
    unload
};