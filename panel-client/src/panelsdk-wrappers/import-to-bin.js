// index.js - Complete implementation for Media Composer integration
import { displayTextInfo, displayTextError, displayTextDebug } from './logging.js';
import { createOrOpenBin, openOrCreateBin } from './bin-service.js';
import { getImportSettingsName } from './create-settings.js';
import { importFile } from './import-service.js';

var esionBinName = "ESION processed.avb";

export async function importFileIntoAcclaimBin(filepath) {
    displayTextDebug("Importing file into Acclaim bin..." + filepath);
    
    try {
        await openOrCreateBin(esionBinName);
        displayTextDebug("ifia: openOrCreateBin completed...");
        displayTextDebug("Importing file into bin.");
        await importFile(filepath, esionBinName);
        displayTextDebug("File imported successfully.");
    } catch (error) {
        displayTextError("Error in importFileIntoAcclaimBin: " + error.message);
        throw error;
    }
};
