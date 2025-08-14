import { LoadSettingRequest, LoadSettingRequestBody } from '../panelsdk-bridge.js';

import { displayTextInfo, displayTextDebug, displayTextError } from '././logging.js';
import { Mutex } from 'async-mutex';

import { getImportSettingsXml } from './import-settings.js';
import { getExportSettingsXml, getSequenceExportSettingsXml } from './export-settings.js';
import { getApiClient, getMetadata } from './api-client.js';

const exportSettingsName = "export-acclaim";
const exportSettingUUID = "c2c404c2-e098-47f1-ad3a-22b3c5bd0ca1";

const sequenceExportSettingsName = "seqexport-acclaim";
const sequenceExportSettingUUID = "bfce0ba0-5e4d-4f62-9302-f13621f2c80a";

const importSettingsName = "import-acclaim";
const importSettingUUID = "2334e325-efb8-43fa-82a1-2f8dce01ab95";

var settingsCreated = false;

export function getSuffixFromSettingName(settingName) {
  if (settingName === exportSettingsName) {
    return ".wav";
  } else if (settingName === sequenceExportSettingsName) {
    return ".wav";
  } else {
    displayTextError("Unknown export settings name: " + settingName);
    return null;
  }
}

export var createSettings = function() {
  return new Promise(async (resolve, reject) => {
    const mcapiclient = getApiClient();
    const md = getMetadata();
    if (!mcapiclient || !md) {
      displayTextError("API client or metadata is not initialized.");
      return reject(new Error("API client or metadata is not initialized"));
    }

    if (settingsCreated) {
      return resolve(true);
    }

    const mutex = new Mutex();

    try {
      await mutex.runExclusive(async () => {
        if (!settingsCreated) {
          displayTextDebug("setting guard now true");
          settingsCreated = true;
        } else {
          return resolve(true);
        }
      });

      displayTextDebug("Creating import settings...");
      try {
        await loadSetting(mcapiclient, md, importSettingUUID, importSettingsName, getImportSettingsXml());
        displayTextDebug("Import settings loaded successfully: " + importSettingsName);
      } catch (error) {
        displayTextError("Error loading import settings: " + importSettingsName + ": " + error.message);
        throw error;
      }

      displayTextDebug("Creating base export settings...");
      try {
        await loadSetting(mcapiclient, md, exportSettingUUID, exportSettingsName, getExportSettingsXml());
        displayTextDebug("Export settings loaded successfully: " + exportSettingsName);
      } catch (error) {
        displayTextError("Error loading export settings: " + exportSettingsName + ": " + error.message);
        throw error;
      }

      displayTextDebug("Creating sequence export settings...");
      try {
        await loadSetting(mcapiclient, md, sequenceExportSettingUUID, sequenceExportSettingsName, getSequenceExportSettingsXml());
        displayTextDebug("Sequence export settings loaded successfully: " + sequenceExportSettingsName);
      } catch (error) {
        displayTextError("Error loading sequence export settings: " + sequenceExportSettingsName + ": " + error.message);
        throw error;
      }

      resolve({ success: true });
    } catch (error) {
      displayTextError("Exception occurred while creating settings: " + error.message);
      reject(error);
    }
  });
}

export var getImportSettingsName = function() {
    return importSettingsName;
}

export var getExportSettingsName = function() {
    return exportSettingsName;
}

export var getSequenceExportSettingsName = function() {
    return sequenceExportSettingsName;
}

export function getExportSettingsNameFromType(mobType) {
  if (mobType === "sequence") {
      return getSequenceExportSettingsName();
  } else if (mobType === "masterclip" || mobType === "subclip") {
      return getExportSettingsName();
  } else {
      displayTextError("Unsupported mobType: " + mobType);
      return null;
  }

}


async function loadSetting(mcapiclient, metadata, settingUUID, settingsName, settingData) {
    return new Promise((resolve, reject) => {

        settingData = settingData.replace("replace-name", settingsName); // the xml has a generic name, so we replace it with the actual name to avoid duplication
        let request = new LoadSettingRequest();

        let loadSettingRequestBody = new LoadSettingRequestBody;

        displayTextDebug("Loading setting: " + settingsName + " with uniqueId: " + settingUUID);

        loadSettingRequestBody.setXmlSetting(settingData);
        loadSettingRequestBody.setUniqueId(settingUUID);
        request.setBody(loadSettingRequestBody);

        mcapiclient.loadSetting(request, metadata, (err, response) => {
            if (err) {
                if (err.code == 2){
                    displayTextDebug("Setting already exists: " + settingsName);
                    resolve(true);
                } else {
                    const errMessage = `Unexpected error: code = ${err.code}` +
                        `, message = "${err.message}", settingsName = ${settingsName}`;
                    displayTextError(errMessage);
                    reject(err);
                }
            } else {
                displayTextDebug("Setting loaded successfully: " + settingsName);
                resolve(true);
            }
        });
    });
}
