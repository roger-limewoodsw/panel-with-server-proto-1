


// Enumeration for log levels
export const LogLevel = Object.freeze({
    fine: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
});

// Returns the text name of the log level from its value
export function getLogLevelName(value) {
    for (const [key, val] of Object.entries(LogLevel)) {
        if (val === value) {
            return key;
        }
    }
    return undefined;
}

// Default log level
let logLevel = LogLevel.debug;

export function getLogLevel() {
    return logLevel; 
}

let outputArea = null; // Output area for displaying messages
let document = null; // Document reference for creating text nodes

export function setOutputArea(area, panelDocument) {  
    if (area instanceof HTMLElement && panelDocument instanceof Document) {
        outputArea = area; 
        document = panelDocument; // Store the document reference for creating text nodes
    } else {
        console.warn("Invalid output area. Expected an HTMLElement.");
        outputArea = null; // Reset to null if invalid
    }
}

export function setLogLevel(level) {
    if (Object.values(LogLevel).includes(level)) {
        logLevel = level;
    } else {
        console.warn(`Invalid log level: ${level}. Using default level: ${LogLevel.debug}`);
        logLevel = LogLevel.debug;
    }
}

/**
 * Sets the log level by its string value (e.g., "info", "debug").
 * @param {string} levelName - The name of the log level.
 */
export function setLogLevelByName(levelName) {
    if (typeof levelName !== "string") {
        displayTextWarn(`Log level name must be a string. Using default level: ${getLogLevelName(LogLevel.info)}`);
        logLevel = LogLevel.info;
        return false;
    }
    const lowerName = levelName.toLowerCase();
    if (LogLevel.hasOwnProperty(lowerName)) {
        logLevel = LogLevel[lowerName];
        return true
    } else {
        displayTextWarn(`Invalid log level name: ${levelName}. Using default level: ${getLogLevelName(LogLevel.info)}`);
        logLevel = LogLevel.info;
        return false;
    }
}

// Display text in the output area
function displayTextCore(text) {
    console.log(text);
    if (outputArea && document) {
        const node = document.createTextNode(text);
        outputArea.appendChild(node);
        outputArea.appendChild(document.createElement("br"));
    }
}

/**
 * Display text in the output area (legacy function)
 * @param {string} text - The text to display
 */
export function displayText(text) {
    displayTextInfo(text);
}

/**
 * Display text at FINE level 
 * @param {string} text - The text to display
 */
export function displayTextFine(text) {
    if (logLevel <= LogLevel.fine) {
        displayTextCore(text);
    }
}

/**
 * Display text at DEBUG level
 * @param {string} text - The text to display
 */
export function displayTextDebug(text) {
    if (logLevel <= LogLevel.debug) {
        displayTextCore(text);
    }
}

/**
 * Display text at INFO level
 * @param {string} text - The text to display
 */
export function displayTextInfo(text) {
    if (logLevel <= LogLevel.info) {
        displayTextCore(text);
    }
}

/**
 * Display text at WARN level
 * @param {string} text - The text to display
 */
export function displayTextWarn(text) {
    if (logLevel <= LogLevel.warn) {
        displayTextCore(text);
    }
}

/**
 * Display text at ERROR level
 * @param {string} text - The text to display
 */
export function displayTextError(text) {
    if (logLevel <= LogLevel.error) {
        displayTextCore(text);
    }
}

