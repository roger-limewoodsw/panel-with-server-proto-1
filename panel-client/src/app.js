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

// Get application info using wrapper functions
async function getAppInfo() {
    console.log('📡 Getting app info using wrapper functions...');
    addToEventLog('Requesting app info...', 'info');
    
    try {
        // Import wrapper functions dynamically
        const { getApiClient } = await import('./panelsdk-wrappers/api-client.js');
        const { getActiveSequenceId } = await import('./panelsdk-wrappers/get-active-service.js');
        
        // Check if API client is initialized
        const mcapiclient = getApiClient();
        if (!mcapiclient) {
            console.error('❌ API client not initialized');
            addToEventLog('Error: API client not initialized', 'error');
            document.getElementById('project-info').innerHTML = `
                <p>❌ API client not initialized</p>
                <p><small>Check if Panel SDK is properly loaded</small></p>
            `;
            return;
        }
        
        // Try to get active sequence as a basic test
        const activeSequenceId = await getActiveSequenceId();
        console.log('✅ Active sequence ID:', activeSequenceId);
        
        addToEventLog('Panel SDK wrapper functions working', 'success');
        
        // Update project info display with basic connection info
        document.getElementById('project-info').innerHTML = `
            <p><strong>Panel SDK:</strong> Connected ✅</p>
            <p><strong>Active Sequence:</strong> ${activeSequenceId !== "00000000-0000-0000-0000-000000000000" ? activeSequenceId : 'None'}</p>
            <p><strong>Wrapper Functions:</strong> Available</p>
        `;
        
    } catch (error) {
        console.error('❌ Failed to use wrapper functions:', error);
        addToEventLog(`Failed to use wrapper functions: ${error.message}`, 'error');
        document.getElementById('project-info').innerHTML = `
            <p>❌ Error: ${error.message}</p>
            <p><small>Check console for details</small></p>
        `;
    }
}

// Get all bins using wrapper functions
async function getAllBins() {
    console.log('📡 Getting all bins using wrapper functions...');
    addToEventLog('Requesting bin list...', 'info');
    
    try {
        // Import wrapper functions dynamically
        const { getAllBins: getAllBinsWrapper } = await import('./panelsdk-wrappers/bin-service.js');
        
        // Get bins using wrapper function
        const bins = await getAllBinsWrapper();
        
        console.log('✅ Retrieved bins:', bins);
        addToEventLog(`Retrieved ${bins.length} bins total`, 'success');
        
        // Update bin display
        if (bins.length > 0) {
            const binList = bins.map(bin => 
                `<li>${bin.body?.name || 'Unknown'} (${bin.body?.id || 'No ID'})</li>`
            ).join('');
            document.getElementById('bin-contents').innerHTML = `
                <p><strong>Total bins:</strong> ${bins.length}</p>
                <ul>${binList}</ul>
            `;
        } else {
            document.getElementById('bin-contents').innerHTML = `
                <p>No bins found</p>
            `;
        }
        
    } catch (error) {
        console.error('❌ Failed to get bins using wrapper:', error);
        addToEventLog(`Failed to get bins: ${error.message}`, 'error');
        document.getElementById('bin-contents').innerHTML = `
            <p>❌ Error: ${error.message}</p>
        `;
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