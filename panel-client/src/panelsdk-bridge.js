// Bridge file to expose protobuf classes that are loaded via eval
// This allows the wrapper functions to import them normally

// Wait for the protobuf classes to be loaded in global scope
function waitForProto() {
    return new Promise((resolve) => {
        const checkProto = () => {
            if (window.proto && window.proto.mcapi && Object.keys(window.proto.mcapi).length > 0) {
                resolve();
            } else {
                setTimeout(checkProto, 50);
            }
        };
        checkProto();
    });
}

// Initialize and export all protobuf classes
let protoExports = {};

export async function initProtoBridge() {
    await waitForProto();
    
    // Export all classes from proto.mcapi
    Object.assign(protoExports, window.proto.mcapi);
    
    console.log('✅ Proto bridge initialized with', Object.keys(protoExports).length, 'classes');
}

// Helper function to get proto classes safely
function getProtoClass(className) {
    if (window.proto && window.proto.mcapi && window.proto.mcapi[className]) {
        return window.proto.mcapi[className];
    }
    if (window.proto && window.proto[className]) {
        return window.proto[className];
    }
    console.warn(`Proto class ${className} not found`);
    return undefined;
}

// Export individual classes that the wrapper functions need
export const GetBinsRequest = () => getProtoClass('GetBinsRequest');
export const GetBinsRequestBody = () => getProtoClass('GetBinsRequestBody');
export const GetBinsFlag = () => getProtoClass('GetBinsFlag');
export const OpenBinRequest = () => getProtoClass('OpenBinRequest');
export const OpenBinRequestBody = () => getProtoClass('OpenBinRequestBody');
export const CloseBinRequest = () => getProtoClass('CloseBinRequest');
export const CloseBinRequestBody = () => getProtoClass('CloseBinRequestBody');
export const CreateBinRequest = () => getProtoClass('CreateBinRequest');
export const CreateBinRequestBody = () => getProtoClass('CreateBinRequestBody');
export const ExportFileRequest = () => getProtoClass('ExportFileRequest');
export const ExportFileRequestBody = () => getProtoClass('ExportFileRequestBody');
export const ImportFileRequest = () => getProtoClass('ImportFileRequest');
export const ImportFileRequestBody = () => getProtoClass('ImportFileRequestBody');
export const GetViewerMobsRequest = () => getProtoClass('GetViewerMobsRequest');
export const GetViewerMobsRequestBody = () => getProtoClass('GetViewerMobsRequestBody');
export const GetMobInfoRequest = () => getProtoClass('GetMobInfoRequest');
export const GetMobInfoRequestBody = () => getProtoClass('GetMobInfoRequestBody');
export const CommandErrorType = () => getProtoClass('CommandErrorType');
export const MCAPIClient = () => getProtoClass('MCAPIClient');