// Bring in the official runtimes
import jspb from 'google-protobuf';
import * as grpcWeb from 'grpc-web';

// Make globals available for CommonJS-style protobuf files
window.jspb = jspb;
globalThis.jspb = jspb;

// Make grpc-web visible if your app references window.grpc
if (!window.grpc) window.grpc = {};
window.grpc.web = grpcWeb;

// Set up Google Closure Library globals that the protobuf files expect
globalThis.goog = jspb;
window.goog = jspb;

// Initialize extension registries that protobuf files expect
if (!jspb.ExtensionFieldBinaryInfo) {
    jspb.ExtensionFieldBinaryInfo = {};
}
if (!jspb.ExtensionFieldInfo) {
    jspb.ExtensionFieldInfo = {};
}

// Add specific extension that MCAPI files need
jspb.ExtensionFieldBinaryInfo[10778] = {};
console.log('✅ Set up protobuf extension registry');

// Set up CommonJS globals that protobuf files expect
if (!globalThis.exports) {
    globalThis.exports = {};
}
if (!globalThis.module) {
    globalThis.module = { exports: globalThis.exports };
}

// Mock require function for the CommonJS protobuf files
if (!globalThis.require) {
    globalThis.require = function(module) {
        if (module === 'google-protobuf') {
            return jspb;
        }
        if (module === 'grpc-web') {
            return grpcWeb;
        }
        if (module.includes('MCAPI_Types_pb.js') || module === './MCAPI_Types_pb.js') {
            // Return the MCAPI_Types_pb object that was set up after loading
            return globalThis.MCAPI_Types_pb || globalThis.proto.mcapi || globalThis.proto || {};
        }
        if (module.includes('MCAPI_pb.js') || module === './MCAPI_pb.js') {
            return globalThis.proto.mcapi || globalThis.proto || {};
        }
        if (module.includes('descriptor_pb.js') || module.includes('google/protobuf/descriptor_pb.js')) {
            return {
                MethodOptions: {
                    extensionsBinary: {},
                    extensions: {}
                },
                FileOptions: {
                    extensionsBinary: {},
                    extensions: {}
                }
            };
        }
        console.warn('Unknown module requested:', module);
        return {};
    };
}

// Initialize proto namespace
globalThis.proto = globalThis.proto || {};
window.proto = globalThis.proto;

// Set up google_protobuf_descriptor_pb that MCAPI_pb.js expects
globalThis.google_protobuf_descriptor_pb = {
    MethodOptions: {
        extensionsBinary: {},
        extensions: {}
    },
    FileOptions: {
        extensionsBinary: {},
        extensions: {}
    }
};

// Import your generated stubs as text and eval them in the global context
// This allows them to use require() and set up globals properly
import mcapiTypesJs from './grpc-web/MCAPI_Types_pb.js?raw';
import mcapiPbJs from './grpc-web/MCAPI_pb.js?raw';
import mcapiGrpcWebJs from './grpc-web/MCAPI_grpc_web_pb.js?raw';

// Execute the protobuf files in global context in the correct order
console.log('🔄 Loading MCAPI_Types_pb.js...');
try {
    eval(mcapiTypesJs);
    console.log('✅ MCAPI_Types_pb.js loaded successfully');
    
    // Make MCAPI_Types_pb available globally for grpc_web_pb.js 
    globalThis.MCAPI_Types_pb = globalThis.proto.mcapi;
    console.log('  Available proto.mcapi classes:', globalThis.MCAPI_Types_pb?.EchoResponse ? '✅ EchoResponse' : '❌ EchoResponse');
    console.log('  globalThis.proto.mcapi available:', !!globalThis.proto.mcapi);
    if (globalThis.proto.mcapi) {
        console.log('  Sample classes in proto.mcapi:', Object.keys(globalThis.proto.mcapi).slice(0, 5));
    }
} catch (error) {
    console.error('❌ Error loading MCAPI_Types_pb.js:', error);
}

console.log('🔄 Loading MCAPI_pb.js...');
try {
    eval(mcapiPbJs);
    console.log('✅ MCAPI_pb.js loaded successfully');
} catch (error) {
    console.error('❌ Error loading MCAPI_pb.js:', error);
}

console.log('🔄 Loading MCAPI_grpc_web_pb.js...');
try {
    eval(mcapiGrpcWebJs);
    console.log('✅ MCAPI_grpc_web_pb.js loaded successfully');
} catch (error) {
    console.error('❌ Error loading MCAPI_grpc_web_pb.js:', error);
}

// Ensure proto namespace is available on window
window.proto = globalThis.proto;

// Debug what we have
console.log('📊 Proto loading complete');
console.log('  globalThis.proto:', !!globalThis.proto);
console.log('  window.proto:', !!window.proto);
if (globalThis.proto) {
    console.log('  proto keys:', Object.keys(globalThis.proto));
    if (globalThis.proto.mcapi) {
        console.log('  proto.mcapi keys:', Object.keys(globalThis.proto.mcapi));
        console.log('  MCAPIClient available:', !!globalThis.proto.mcapi.MCAPIClient);
    }
}

// Import styles
import './styles.css';

// Now your existing app code:
import './app.js';