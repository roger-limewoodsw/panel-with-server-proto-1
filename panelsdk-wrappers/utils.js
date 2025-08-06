import { displayTextDebug, displayTextError, 
    displayTextFine, displayTextInfo, displayTextWarn } from './logging.js';


const ExportType = Object.freeze({
  VIDEO: 'Video',
  AUDIO: 'Audio'
});

// Enumeration for monitor types
const MonitorType = Object.freeze({
    SRCMON: "S",
    RECMON: "R"
});


const taskPathMap = new Map();

function registerTaskPath(taskId, path, resolver) {
    displayTextDebug("registerTaskPath: taskId: " + taskId + ", path: " + path);
    // Store the resolver function directly, not as an object property
    let value = { path: path, resolver: resolver };
    taskPathMap.set(taskId, value);
}

function getResolverByTaskId(taskId) {
    displayTextDebug("getResolverByTaskId: taskId: " + taskId);
    let result = taskPathMap.get(taskId)?.resolver ?? null;
    displayTextDebug("getResolverByTaskId: taskId: " + taskId + ", resolver exists: " + (result !== null));
    return result;

}

function getPathByTaskId(taskId) {
    let result = taskPathMap.get(taskId)?.path ?? null;
    displayTextDebug("getPathByTaskId: taskId: " + taskId + ", path: " + result);
    return result;
}

function deleteTask(taskId) {
    displayTextDebug("deleteTask: taskId: " + taskId);
    if (taskPathMap.has(taskId)) {
        taskPathMap.delete(taskId);
        displayTextDebug("Task deleted successfully.");
    } else {
        displayTextWarn("Task with ID " + taskId + " does not exist.");
    }
}

export { registerTaskPath, getPathByTaskId, getResolverByTaskId, deleteTask };
export { ExportType, MonitorType };