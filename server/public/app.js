// Avid Panel SDK Plugin - Main Application
// This file handles all communication with Media Composer via gRPC-Web

// Global variables
let grpcClient = null;
let isConnected = false;
let accessToken = null;

// Fixed gRPC-Web bridge with better response handling
function installGrpcBridge() {
    if (!window.grpc || !window.grpc.web || !window.grpc.web.GrpcWebClientBase) {
        console.warn('⚠️ GrpcWebClientBase not available yet');
        return false;
    }

    window.grpc.web.GrpcWebClientBase.prototype.rpcCall = function(method, request, metadata, methodDescriptor, callback) {
        console.log('🎬 Making gRPC-web request:', method);
        console.log('📦 Request payload size:', request.serializeBinary().length, 'bytes');
        
        try {
            const requestBytes = request.serializeBinary();
            
            // Prepare headers for gRPC-Web
            const headers = {
                'Content-Type': 'application/grpc-web+proto',
                'X-Grpc-Web': '1',
                // Add accept header to specify what we expect
                'Accept': 'application/grpc-web+proto',
                // Limit response size hints
                'grpc-timeout': '30S'
            };
            
            // Add metadata (like access token) to headers
            if (metadata) {
                Object.keys(metadata).forEach(key => {
                    headers[key.toLowerCase()] = metadata[key];
                });
            }
            
            console.log('🔑 Request headers:', headers);
            console.log('📡 Fetching:', method);
            
            // Make the HTTP request
            fetch(method, {
                method: 'POST',
                headers: headers,
                body: requestBytes,
                mode: 'cors',
                credentials: 'include'
            })
            .then(response => {
                console.log('📡 Response status:', response.status, response.statusText);
                console.log('📋 Response headers:');
                for (let [key, value] of response.headers.entries()) {
                    console.log(`   ${key}: ${value}`);
                }
                
                // Check for gRPC errors in headers first
                const grpcStatus = response.headers.get('grpc-status');
                const grpcMessage = response.headers.get('grpc-message');
                
                if (grpcStatus && grpcStatus !== '0') {
                    throw new Error(`gRPC Error ${grpcStatus}: ${grpcMessage || 'Unknown error'}`);
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Check Content-Length to avoid downloading huge responses
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const sizeInMB = parseInt(contentLength) / (1024 * 1024);
                    console.log('📏 Content-Length:', sizeInMB.toFixed(2), 'MB');
                    
                    // Reject suspiciously large responses
                    if (sizeInMB > 10) {
                        console.error('❌ Response too large:', sizeInMB.toFixed(2), 'MB');
                        // Try to read just the first chunk to debug
                        return response.arrayBuffer().then(buffer => {
                            const preview = new Uint8Array(buffer, 0, Math.min(1000, buffer.byteLength));
                            console.log('🔍 Response preview (first 1000 bytes):', preview);
                            console.log('🔍 As string:', new TextDecoder().decode(preview));
                            throw new Error(`Response too large: ${sizeInMB.toFixed(2)} MB. This appears to be incorrect data.`);
                        });
                    }
                }
                
                return response.arrayBuffer();
            })
            .then(responseBytes => {
                console.log('📦 Response size:', responseBytes.byteLength, 'bytes');
                
                // Handle empty response
                if (responseBytes.byteLength === 0) {
                    console.log('📭 Empty response - creating default response');
                    const emptyResponse = new methodDescriptor.responseType();
                    callback(null, emptyResponse);
                    return;
                }
                
                // Debug: Check what the response actually looks like
                const uint8View = new Uint8Array(responseBytes);
                const first100Bytes = uint8View.slice(0, Math.min(100, uint8View.length));
                console.log('🔍 First 100 bytes (raw):', Array.from(first100Bytes));
                
                // Try to detect if it's text/JSON instead of binary
                const textDecoder = new TextDecoder('utf-8', { fatal: false });
                const asText = textDecoder.decode(first100Bytes);
                if (asText.startsWith('{') || asText.startsWith('[')) {
                    console.log('📝 Response appears to be JSON:', asText);
                    // This shouldn't happen with gRPC, but log it for debugging
                    callback(new Error('Received JSON response instead of protobuf'), null);
                    return;
                }
                
                try {
                    let messageBytes;
                    
                    // Try different parsing strategies
                    if (responseBytes.byteLength >= 5) {
                        // Strategy 1: Standard gRPC-Web format (5-byte header)
                        const dataView = new DataView(responseBytes);
                        const compressionFlag = dataView.getUint8(0);
                        const messageLength = dataView.getUint32(1, false); // big-endian
                        
                        console.log('🔍 Trying standard gRPC-Web format:');
                        console.log('   Compression flag:', compressionFlag);
                        console.log('   Message length:', messageLength);
                        
                        // Sanity check the message length
                        if (messageLength > 0 && messageLength <= responseBytes.byteLength - 5 && messageLength < 1024 * 1024) {
                            // Looks reasonable, try to parse
                            messageBytes = new Uint8Array(responseBytes, 5, messageLength);
                            console.log('✅ Using standard gRPC-Web format');
                        } else {
                            // Strategy 2: Try without header (raw protobuf)
                            console.log('🔍 Length header seems wrong, trying raw protobuf');
                            messageBytes = new Uint8Array(responseBytes);
                        }
                    } else {
                        // Too small for gRPC-Web header, assume raw protobuf
                        console.log('🔍 Response too small for header, using raw protobuf');
                        messageBytes = new Uint8Array(responseBytes);
                    }
                    
                    // Try to deserialize
                    console.log('📦 Attempting to deserialize', messageBytes.length, 'bytes');
                    const responseMessage = methodDescriptor.responseType.deserializeBinary(messageBytes);
                    console.log('✅ Response deserialized successfully');
                    
                    // Log the actual response data
                    if (responseMessage && responseMessage.toObject) {
                        console.log('📊 Response data:', responseMessage.toObject());
                    }
                    
                    callback(null, responseMessage);
                    
                } catch (deserError) {
                    console.error('❌ Deserialization failed:', deserError);
                    
                    // Final fallback: Try different byte offsets in case header is different
                    console.log('🔍 Trying alternative parsing strategies...');
                    
                    const offsets = [0, 1, 4, 5, 8]; // Common header sizes
                    for (const offset of offsets) {
                        if (offset >= responseBytes.byteLength) continue;
                        
                        try {
                            const testBytes = new Uint8Array(responseBytes, offset);
                            const testResponse = methodDescriptor.responseType.deserializeBinary(testBytes);
                            console.log(`✅ Successfully parsed with offset ${offset}`);
                            if (testResponse && testResponse.toObject) {
                                console.log('📊 Response data:', testResponse.toObject());
                            }
                            callback(null, testResponse);
                            return;
                        } catch (e) {
                            // Continue trying other offsets
                        }
                    }
                    
                    // All strategies failed
                    console.error('❌ All parsing strategies failed');
                    callback(new Error('Failed to parse response with any strategy'), null);
                }
            })
            .catch(error => {
                console.error('❌ Network/HTTP error:', error);
                callback(error, null);
            });
            
        } catch (error) {
            console.error('❌ Request preparation failed:', error);
            setTimeout(() => callback(error, null), 10);
        }
    };

    console.log('✅ Enhanced gRPC bridge installed');
    return true;
}

// Initialize the application
function init() {
    console.log('🚀 Initializing Avid Panel Plugin...');
    
    // Update UI elements
    updateConnectionStatus('Initializing...', 'warning');
    
    // Check if we're running in Media Composer or standalone
    if (typeof mcapi !== 'undefined') {
        console.log('✅ Running in Media Composer environment');
        
        // Install the enhanced gRPC bridge
        if (installGrpcBridge()) {
            connectToMediaComposer();
        } else {
            console.error('❌ Failed to install gRPC bridge');
            updateConnectionStatus('Bridge Error', 'error');
        }
    } else {
        console.log('⚠️ Running in standalone mode (no Media Composer connection)');
        updateConnectionStatus('Standalone Mode', 'warning');
        document.getElementById('connection-info').innerHTML = `
            <p>⚠️ Running outside Media Composer</p>
            <p>To use this plugin, open it from within Media Composer's Panels menu.</p>
        `;
    }
    
    // Set up button event handlers
    setupEventHandlers();
}

// Connect to Media Composer via gRPC
function connectToMediaComposer() {
    console.log('🔌 Connecting to Media Composer...');
    
    try {
        // Get the gateway server address from Media Composer
        const gatewayUrl = window.mcapi.getGatewayServerAddress();
        console.log('🌐 Gateway URL from Media Composer:', gatewayUrl);
        
        if (!gatewayUrl) {
            throw new Error('No gateway URL provided by Media Composer');
        }
        
        // Get access token if available
        accessToken = window.mcapi.getAccessToken();
        console.log('🔑 Access token available:', !!accessToken);
        
        // Create the gRPC client
        const serviceUrl = `${gatewayUrl}/mcapi.MCAPI`;
        console.log('🎯 Full service URL:', serviceUrl);
        
        // Check if proto.mcapi is available
        if (!window.proto || !window.proto.mcapi || !window.proto.mcapi.MCAPIClient) {
            throw new Error('gRPC proto files not loaded correctly');
        }
        
        grpcClient = new proto.mcapi.MCAPIClient(serviceUrl, null, {
            withCredentials: true
        });
        
        isConnected = true;
        updateConnectionStatus('Connected', 'success');
        
        // Update connection info
        document.getElementById('connection-info').innerHTML = `
            <p><strong>Status:</strong> Connected ✅</p>
            <p><strong>Gateway:</strong> ${gatewayUrl}</p>
            <p><strong>Token:</strong> ${accessToken ? 'Available' : 'Not available'}</p>
        `;
        
        // Try to get initial app info
        getAppInfo();
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
        updateConnectionStatus('Connection Failed', 'error');
        document.getElementById('connection-info').innerHTML = `
            <p>❌ Failed to connect: ${error.message}</p>
        `;
    }
}

// Update connection status badge
function updateConnectionStatus(text, type) {
    const badge = document.getElementById('connection-status');
    badge.textContent = text;
    badge.className = `status-badge ${type}`;
}

// Get application info
function getAppInfo() {
    if (!grpcClient) {
        console.error('❌ No gRPC client available');
        addToEventLog('Error: No gRPC client available', 'error');
        return;
    }
    
    console.log('📡 Getting app info...');
    addToEventLog('Requesting app info...', 'info');
    
    try {
        // Create request with body
        const requestBody = new proto.mcapi.GetAppInfoRequestBody();
        const request = new proto.mcapi.GetAppInfoRequest();
        request.setBody(requestBody);
        
        // Prepare metadata
        const metadata = {};
        if (accessToken) {
            metadata['authorization'] = `Bearer ${accessToken}`;
        }
        
        console.log('📤 Sending GetAppInfo request...');
        
        // Make the gRPC call
        grpcClient.getAppInfo(request, metadata, (error, response) => {
            if (error) {
                console.error('❌ GetAppInfo error:', error);
                addToEventLog(`Error: ${error.message}`, 'error');
                document.getElementById('project-info').innerHTML = `
                    <p>❌ Error getting app info: ${error.message}</p>
                `;
            } else {
                console.log('✅ GetAppInfo response:', response);
                
                if (response && response.toObject) {
                    const data = response.toObject();
                    console.log('📊 App info data:', data);
                    addToEventLog('App info received successfully', 'success');
                    
                    // Update project info display
                    if (data.body) {
                        document.getElementById('project-info').innerHTML = `
                            <p><strong>Application:</strong> ${data.body.application || 'Unknown'}</p>
                            <p><strong>Version:</strong> ${data.body.version || 'Unknown'}</p>
                            <p><strong>API Version:</strong> ${data.body.apiVersion || 'Unknown'}</p>
                        `;
                    } else {
                        document.getElementById('project-info').innerHTML = `
                            <p>⚠️ Received response but no data</p>
                        `;
                    }
                } else {
                    document.getElementById('project-info').innerHTML = `
                        <p>⚠️ Invalid response format</p>
                    `;
                }
            }
        });
    } catch (error) {
        console.error('❌ Failed to create request:', error);
        addToEventLog(`Failed to create request: ${error.message}`, 'error');
    }
}

// Get all bins (streaming response)
function getAllBins() {
    if (!grpcClient) {
        console.error('❌ No gRPC client available');
        addToEventLog('Error: No gRPC client available', 'error');
        return;
    }
    
    console.log('📡 Getting all bins...');
    addToEventLog('Requesting bin list...', 'info');
    
    try {
        // Create request
        const requestBody = new proto.mcapi.GetBinsRequestBody();
        const request = new proto.mcapi.GetBinsRequest();
        request.setBody(requestBody);
        
        // Prepare metadata
        const metadata = {};
        if (accessToken) {
            metadata['authorization'] = `Bearer ${accessToken}`;
        }
        
        console.log('📤 Sending GetBins request (streaming)...');
        
        // Make the streaming gRPC call
        const stream = grpcClient.getBins(request, metadata);
        
        let binCount = 0;
        const bins = [];
        
        stream.on('data', (response) => {
            console.log('📦 Received bin data:', response);
            if (response && response.toObject) {
                const data = response.toObject();
                bins.push(data);
                binCount++;
                addToEventLog(`Received bin ${binCount}: ${data.body?.name || 'Unknown'}`, 'success');
            }
        });
        
        stream.on('error', (error) => {
            console.error('❌ Stream error:', error);
            addToEventLog(`Stream error: ${error.message}`, 'error');
        });
        
        stream.on('end', () => {
            console.log('✅ Stream ended. Total bins:', binCount);
            addToEventLog(`Received ${binCount} bins total`, 'success');
            
            // Update bin display
            if (bins.length > 0) {
                const binList = bins.map(bin => 
                    `<li>${bin.body?.name || 'Unknown'} (${bin.body?.id || 'No ID'})</li>`
                ).join('');
                document.getElementById('bin-contents').innerHTML = `
                    <p><strong>Total bins:</strong> ${binCount}</p>
                    <ul>${binList}</ul>
                `;
            } else {
                document.getElementById('bin-contents').innerHTML = `
                    <p>No bins found</p>
                `;
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to get bins:', error);
        addToEventLog(`Failed to get bins: ${error.message}`, 'error');
    }
}

// Add message to event log
function addToEventLog(message, type = 'info') {
    const log = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    log.insertBefore(entry, log.firstChild);
    
    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

// Clear event log
function clearEventLog() {
    document.getElementById('event-log').innerHTML = '';
    addToEventLog('Event log cleared', 'info');
}

// Set up button event handlers
function setupEventHandlers() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        console.log('🔄 Refresh button clicked');
        addToEventLog('Refreshing project info...', 'info');
        getAppInfo();
    });
    
    // Get bins button
    document.getElementById('get-bins-btn').addEventListener('click', () => {
        console.log('📂 Get bins button clicked');
        addToEventLog('Getting all bins...', 'info');
        getAllBins();
    });
    
    // Clear log button
    document.getElementById('clear-log-btn').addEventListener('click', () => {
        console.log('🧹 Clear log button clicked');
        clearEventLog();
    });
}

// Wait for DOM and gRPC to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    setTimeout(init, 100); // Small delay to ensure gRPC files are loaded
}