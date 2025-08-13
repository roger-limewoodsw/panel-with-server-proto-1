// Avid Panel SDK Plugin - Main Application
// This file handles all communication with Media Composer via gRPC-Web

// Global variables
let grpcClient = null;
let isConnected = false;
let accessToken = null;


// Initialize the application
function init() {
    console.log('🚀 Initializing Avid Panel Plugin...');
    
    // Update UI elements
    updateConnectionStatus('Initializing...', 'warning');
    
    // Check if we're running in Media Composer or standalone
    if (typeof mcapi !== 'undefined') {
        console.log('✅ Running in Media Composer environment');
        connectToMediaComposer();
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
        
        // Check if proto files are loaded - try multiple locations
        let MCAPIClient = null;
        if (window.proto?.mcapi?.MCAPIClient) {
            MCAPIClient = window.proto.mcapi.MCAPIClient;
            console.log('✅ Found MCAPIClient in proto.mcapi');
        } else if (window.proto?.MCAPIClient) {
            MCAPIClient = window.proto.MCAPIClient;
            console.log('✅ Found MCAPIClient in proto (root)');
        } else {
            console.error('Proto check failed:');
            console.log('  window.proto:', window.proto);
            console.log('  window.proto.mcapi:', window.proto?.mcapi);
            console.log('  proto.MCAPIClient:', window.proto?.MCAPIClient);
            console.log('  proto.mcapi.MCAPIClient:', window.proto?.mcapi?.MCAPIClient);
            throw new Error('MCAPIClient not found in any expected location');
        }
        
        // Create the gRPC client - use gateway URL directly
        console.log('🎯 Creating client with base URL:', gatewayUrl);
        
        grpcClient = new MCAPIClient(
            gatewayUrl,  // Just the base URL
            null,
            { withCredentials: true }
        );
        
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
        // Find constructors in the right location
        let GetAppInfoRequestBody, GetAppInfoRequest;
        
        if (window.proto.mcapi.GetAppInfoRequestBody) {
            GetAppInfoRequestBody = window.proto.mcapi.GetAppInfoRequestBody;
            GetAppInfoRequest = window.proto.mcapi.GetAppInfoRequest;
        } else if (window.proto.GetAppInfoRequestBody) {
            GetAppInfoRequestBody = window.proto.GetAppInfoRequestBody;
            GetAppInfoRequest = window.proto.GetAppInfoRequest;
        } else {
            console.error('GetAppInfoRequestBody constructor not found!');
            console.error('Available proto constructors:', Object.keys(window.proto));
            console.error('Available proto.mcapi constructors:', Object.keys(window.proto.mcapi));
            
            // Try to find constructors with similar names
            const protoKeys = Object.keys(window.proto);
            const mcapiKeys = Object.keys(window.proto.mcapi);
            const appInfoKeys = [...protoKeys, ...mcapiKeys].filter(key => key.includes('AppInfo'));
            console.error('Keys containing "AppInfo":', appInfoKeys);
            
            throw new Error('GetAppInfoRequestBody constructor not found');
        }
        
        // Create request with body
        const requestBody = new GetAppInfoRequestBody();
        const request = new GetAppInfoRequest();
        request.setBody(requestBody);
        
        // Include access token in metadata (mcapi format)
        const metadata = {};
        if (accessToken) {
            metadata['accessToken'] = accessToken;
            console.log('🔑 Added access token to metadata');
        }
        
        console.log('📤 Sending GetAppInfo request...');
        
        // Make the gRPC call
        grpcClient.getAppInfo(request, metadata, (error, response) => {
            if (error) {
                console.error('❌ GetAppInfo error:', error);
                addToEventLog(`Error: ${error.message}`, 'error');
                
                // If we get a token error, show it
                if (error.message && error.message.includes('token')) {
                    addToEventLog('Note: Authentication may be required', 'warning');
                }
                
                document.getElementById('project-info').innerHTML = `
                    <p>❌ Error: ${error.message}</p>
                    <p><small>Check console for details</small></p>
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
                            <p><strong>Application:</strong> ${data.body.appName || 'Unknown'}</p>
                            <p><strong>Version:</strong> ${data.body.appVersion || 'Unknown'}</p>
                            <p><strong>API Version:</strong> ${data.body.sdkVersion || 'Unknown'}</p>
                        `;
                    }
                } else {
                    document.getElementById('project-info').innerHTML = `
                        <p>⚠️ Received empty response</p>
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
        // Find constructors in the right location
        let GetBinsRequestBody, GetBinsRequest;
        
        if (window.proto.mcapi.GetBinsRequestBody) {
            GetBinsRequestBody = window.proto.mcapi.GetBinsRequestBody;
            GetBinsRequest = window.proto.mcapi.GetBinsRequest;
        } else if (window.proto.GetBinsRequestBody) {
            GetBinsRequestBody = window.proto.GetBinsRequestBody;
            GetBinsRequest = window.proto.GetBinsRequest;
        } else {
            throw new Error('GetBinsRequestBody constructor not found');
        }
        
        // Create request
        const requestBody = new GetBinsRequestBody();
        const request = new GetBinsRequest();
        request.setBody(requestBody);
        
        // Include access token in metadata (mcapi format)
        const metadata = {};
        if (accessToken) {
            metadata['accessToken'] = accessToken;
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
    if (!log) return;
    
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
    const log = document.getElementById('event-log');
    if (log) {
        log.innerHTML = '';
        addToEventLog('Event log cleared', 'info');
    }
}

// Set up button event handlers
function setupEventHandlers() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refresh button clicked');
            addToEventLog('Refreshing project info...', 'info');
            getAppInfo();
        });
    }
    
    // Get bins button
    const binsBtn = document.getElementById('get-bins-btn');
    if (binsBtn) {
        binsBtn.addEventListener('click', () => {
            console.log('📂 Get bins button clicked');
            addToEventLog('Getting all bins...', 'info');
            getAllBins();
        });
    }
    
    // Clear log button
    const clearBtn = document.getElementById('clear-log-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('🧹 Clear log button clicked');
            clearEventLog();
        });
    }
}

// Wait for everything to load
window.addEventListener('load', () => {
    console.log('🌟 Page fully loaded, checking environment...');
    
    // Debug what's available
    console.log('Environment check:');
    console.log('  mcapi available:', typeof window.mcapi !== 'undefined');
    console.log('  proto available:', typeof window.proto !== 'undefined');
    console.log('  proto.mcapi available:', typeof window.proto?.mcapi !== 'undefined');
    
    // Small delay to ensure everything is ready
    setTimeout(init, 500);
});