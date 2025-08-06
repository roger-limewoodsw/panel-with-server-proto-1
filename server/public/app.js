// Avid Panel SDK Application Logic

class AvidPanelApp {
    constructor() {
        this.client = null;
        this.accessToken = null;
        this.serverAddress = null;
        this.isConnected = false;
        
        this.initialize();
    }
    
    initialize() {
        // Wait for the mcapi object to be available
        if (typeof mcapi === 'undefined') {
            // Running outside of Media Composer (development mode)
            this.showStatus('Running in standalone mode (not in Media Composer)', 'warning');
            this.setupDevelopmentMode();
        } else {
            // Running inside Media Composer
            this.setupMediaComposerConnection();
        }
        
        this.setupEventHandlers();
    }
    
    setupMediaComposerConnection() {
        try {
            // Get access token and server address from Media Composer
            this.accessToken = mcapi.getAccessToken();
            this.serverAddress = mcapi.getGatewayServerAddress();
            
            // Initialize gRPC client
            if (typeof proto !== 'undefined' && proto.mcapi && proto.mcapi.MCAPIClient) {
                this.client = new proto.mcapi.MCAPIClient(
                    this.serverAddress,
                    null,
                    null
                );
                console.log('✅ MCAPIClient initialized successfully');
            } else {
                console.error('❌ Proto objects not loaded properly');
                console.error('Available proto:', proto);
                throw new Error('gRPC proto files not loaded');
            }
            
            // Register for Media Composer notifications
            mcapi.onEvent.connect((eventName, eventData) => {
                this.handleMediaComposerEvent(eventName, eventData);
            });
            
            this.isConnected = true;
            this.showStatus('Connected to Media Composer', 'connected');
            this.updateConnectionInfo();
            
            // Get initial project info
            this.getProjectInfo();
            
        } catch (error) {
            console.error('Failed to connect to Media Composer:', error);
            this.showStatus('Connection failed', 'error');
        }
    }
    
    setupDevelopmentMode() {
        // Development mode - show sample data and test protobuf serialization
        const mockInfo = `
            <div class="info-item">
                <strong>Mode:</strong> Development (No MC Connection)
            </div>
            <div class="info-item">
                <strong>Server:</strong> http://localhost:3000
            </div>
            <div class="info-item">
                <strong>Note:</strong> Launch from Media Composer to connect
            </div>
        `;
        document.getElementById('connection-info').innerHTML = mockInfo;
        
        // Test protobuf serialization in development mode
        this.testProtobufSerialization();
    }
    
    testProtobufSerialization() {
        console.log('🧪 Testing protobuf serialization in development mode...');
        
        // Test EchoRequest using official pattern
        if (proto.mcapi && proto.mcapi.EchoRequest) {
            const echoRequest = new proto.mcapi.EchoRequest();
            console.log('📦 Empty EchoRequest size:', echoRequest.serializeBinary().length, 'bytes');
            
            // Only set body (official pattern)
            if (proto.mcapi.EchoRequestBody) {
                const body = new proto.mcapi.EchoRequestBody();
                if (typeof body.setMessage === 'function') {
                    body.setMessage('test');
                }
                echoRequest.setBody(body);
            }
            console.log('📦 EchoRequest with body-only size:', echoRequest.serializeBinary().length, 'bytes');
        }
        
        // Test GetAppInfoRequest using official pattern
        if (proto.mcapi && proto.mcapi.GetAppInfoRequest) {
            const appInfoRequest = new proto.mcapi.GetAppInfoRequest();
            console.log('📦 Empty GetAppInfoRequest size:', appInfoRequest.serializeBinary().length, 'bytes');
            
            // Only set body (official pattern)
            if (proto.mcapi.GetAppInfoRequestBody) {
                appInfoRequest.setBody(new proto.mcapi.GetAppInfoRequestBody());
            }
            console.log('📦 GetAppInfoRequest with body-only size:', appInfoRequest.serializeBinary().length, 'bytes');
        }
        
        console.log('✅ Protobuf serialization test complete');
    }
    
    setupEventHandlers() {
        // Button handlers
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.getProjectInfo();
        });
        
        document.getElementById('get-bins-btn').addEventListener('click', () => {
            this.getAllBins();
        });
        
        document.getElementById('clear-log-btn').addEventListener('click', () => {
            document.getElementById('event-log').innerHTML = '';
        });
    }
    
    handleMediaComposerEvent(eventName, eventData) {
        this.logEvent(eventName, eventData);
        
        // Handle specific events
        switch (eventName) {
            case 'ProjectOpened':
                this.getProjectInfo();
                break;
            case 'ProjectClosed':
                this.updateProjectInfo(null);
                break;
            case 'BinRowSelectionChanged':
                const data = JSON.parse(eventData);
                this.onBinSelectionChanged(data.binAbsolutePath);
                break;
            case 'MobAdded':
                const mobData = JSON.parse(eventData);
                this.logEvent('Media Added', `Mob ID: ${mobData.mobId}`);
                break;
        }
    }
    
    // API Calls
    async getProjectInfo() {
        if (!this.isConnected) {
            this.showStatus('Not connected to Media Composer', 'error');
            return;
        }
        
        try {
            if (typeof proto === 'undefined' || !proto.mcapi) {
                console.error('Proto objects not available');
                return;
            }
            
            // Debug: Show available client methods
            console.log('🔍 Available client methods:', Object.getOwnPropertyNames(this.client.__proto__).filter(name => !name.startsWith('_')));
            
            // Debug: Check if constructors are available
            console.log('🔍 Debugging constructor availability...');
            console.log('GetAppInfoRequest available?', typeof proto.mcapi.GetAppInfoRequest);
            console.log('GetAppInfoRequestBody available?', typeof proto.mcapi.GetAppInfoRequestBody);
            
            // Try creating a simple test to see what's happening
            if (typeof proto.mcapi.GetAppInfoRequest === 'function') {
                const testRequest = new proto.mcapi.GetAppInfoRequest();
                console.log('📦 Empty request serializes to:', testRequest.serializeBinary().length, 'bytes');
                
                if (typeof proto.mcapi.GetAppInfoRequestBody === 'function') {
                    const testBody = new proto.mcapi.GetAppInfoRequestBody();
                    console.log('📦 Empty body serializes to:', testBody.serializeBinary().length, 'bytes');
                    
                    // Debug the BinaryWriter itself
                    console.log('🔍 Testing jspb.BinaryWriter directly...');
                    
                    // First, check if jspb.BinaryEncoder exists
                    console.log('🔍 BinaryEncoder available?', typeof jspb.BinaryEncoder);
                    console.log('🔍 BinaryEncoder constructor:', jspb.BinaryEncoder);
                    
                    const writer = new jspb.BinaryWriter();
                    console.log('📝 Created BinaryWriter:', writer);
                    console.log('📝 Writer methods:', Object.getOwnPropertyNames(writer.__proto__));
                    
                    // Test writing something simple
                    try {
                        console.log('📝 Writer state before write:', {
                            blocks: writer.blocks_.length,
                            totalLength: writer.totalLength_,
                            encoder: writer.encoder_
                        });
                        
                        writer.writeString(1, 'test');
                        
                        console.log('📝 Writer state after writeString:', {
                            blocks: writer.blocks_.length,
                            totalLength: writer.totalLength_,
                            encoder: writer.encoder_
                        });
                        
                        const result = writer.getResultBuffer();
                        console.log('📦 BinaryWriter test result:', result, 'length:', result.length);
                        console.log('📦 Result type:', typeof result, result.constructor.name);
                        
                        // Check the encoder specifically
                        if (writer.encoder_) {
                            console.log('📝 Encoder length:', writer.encoder_.length());
                            console.log('📝 Encoder end():', writer.encoder_.end());
                        }
                    } catch (writerError) {
                        console.error('❌ BinaryWriter test failed:', writerError);
                    }
                    
                    testRequest.setBody(testBody);
                    console.log('📦 Request with body serializes to:', testRequest.serializeBinary().length, 'bytes');
                    console.log('🔍 Request after setBody:', testRequest);
                    console.log('🔍 Does request have body?', testRequest.hasBody ? testRequest.hasBody() : 'hasBody method not found');
                    console.log('🔍 Get body returns:', testRequest.getBody ? testRequest.getBody() : 'getBody method not found');
                } else {
                    console.error('❌ GetAppInfoRequestBody constructor not available');
                }
            } else {
                console.error('❌ GetAppInfoRequest constructor not available');
            }
            
            // Use official Avid sample pattern: body-only + metadata authentication
            console.log('🔬 Using official Avid sample pattern (body-only)...');
            const testRequest = new proto.mcapi.GetAppInfoRequest();
            
            // Only set body (no header) - following official samples
            if (proto.mcapi.GetAppInfoRequestBody) {
                const testBody = new proto.mcapi.GetAppInfoRequestBody();
                testRequest.setBody(testBody);
                console.log('✅ Set request body (official pattern)');
            }
            
            console.log('📨 Request with body-only size:', testRequest.serializeBinary().length, 'bytes');
            
            // Use metadata authentication like official samples
            const metadata = { accessToken: this.accessToken };
            console.log('🔑 Using metadata authentication (official pattern)');
            
            this.client.getAppInfo(testRequest, metadata, (err, response) => {
                if (err) {
                    console.error('❌ GetAppInfo failed:', err);
                } else {
                    console.log('✅ GetAppInfo succeeded:', response.toObject());
                }
            });
            
            // Now try GetOpenProjectInfo using official pattern
            console.log('🧪 Testing GetOpenProjectInfo with official pattern...');
            const request = new proto.mcapi.GetOpenProjectInfoRequest();
            
            // Only set body (following official samples)
            if (proto.mcapi.GetOpenProjectInfoRequestBody) {
                const requestBody = new proto.mcapi.GetOpenProjectInfoRequestBody();
                request.setBody(requestBody);
                console.log('✅ Set GetOpenProjectInfo body (official pattern)');
            }
            
            // Try Echo API using official pattern
            console.log('🧪 Testing Echo API with official pattern...');
            if (this.client.echo && proto.mcapi.EchoRequest) {
                const echoRequest = new proto.mcapi.EchoRequest();
                
                // Only set body (following official samples)
                if (proto.mcapi.EchoRequestBody) {
                    const echoBody = new proto.mcapi.EchoRequestBody();
                    // Set message like official sample
                    if (typeof echoBody.setMessage === 'function') {
                        echoBody.setMessage('test message from panel');
                        console.log('✅ Set echo message');
                    }
                    echoRequest.setBody(echoBody);
                    console.log('✅ Set Echo body (official pattern)');
                }
                
                console.log('📨 Echo request size:', echoRequest.serializeBinary().length, 'bytes');
                
                // Reuse metadata variable
                this.client.echo(echoRequest, metadata, (err, response) => {
                    if (err) {
                        console.error('❌ Echo failed:', err);
                    } else {
                        console.log('✅ Echo succeeded:', response.toObject());
                    }
                });
            }
            
            console.log('📨 Final request:', request);
            console.log('📦 Request serialized size:', request.serializeBinary().length, 'bytes');
            
            // Use the correct method name
            this.client.getOpenProjectInfo(request, metadata, (err, response) => {
                if (err) {
                    console.error('Error getting project info:', err);
                    this.updateProjectInfo(null);
                } else {
                    this.updateProjectInfo(response.toObject());
                }
            });
        } catch (error) {
            console.error('Failed to get project info:', error);
        }
    }
    
    async getAllBins() {
        if (!this.isConnected) {
            this.showStatus('Not connected to Media Composer', 'error');
            return;
        }
        
        try {
            if (typeof proto === 'undefined' || !proto.mcapi) {
                console.error('Proto objects not available');
                return;
            }
            // Use the correct request class for getting bins (official pattern)
            const request = new proto.mcapi.GetBinsRequest();
            
            // Only set body (following official samples)
            if (proto.mcapi.GetBinsRequestBody) {
                const body = new proto.mcapi.GetBinsRequestBody();
                // Set recursive flag if available
                if (typeof body.setRecursive === 'function') {
                    body.setRecursive(true);
                }
                request.setBody(body);
            }
            
            // Use metadata authentication like official samples
            const binsMetadata = { accessToken: this.accessToken };
            
            // Use the correct method name
            this.client.getBins(request, binsMetadata, (err, response) => {
                if (err) {
                    console.error('Error getting bins:', err);
                    this.logEvent('Error', 'Failed to get bins');
                } else {
                    const bins = response.getBinsList();
                    this.logEvent('Bins Retrieved', `Found ${bins.length} bins`);
                    
                    // Display bin names
                    const binNames = bins.map(bin => bin.getDisplayname()).join(', ');
                    this.updateBinContents(`Bins: ${binNames}`);
                }
            });
        } catch (error) {
            console.error('Failed to get bins:', error);
        }
    }
    
    onBinSelectionChanged(binPath) {
        this.updateBinContents(`Selected: ${binPath}`);
    }
    
    // UI Updates
    updateConnectionInfo() {
        const info = `
            <div class="info-item">
                <strong>Status:</strong> Connected
            </div>
            <div class="info-item">
                <strong>Access Token:</strong> ${this.accessToken ? this.accessToken.substring(0, 8) + '...' : 'N/A'}
            </div>
            <div class="info-item">
                <strong>Server:</strong> ${this.serverAddress || 'N/A'}
            </div>
        `;
        document.getElementById('connection-info').innerHTML = info;
    }
    
    updateProjectInfo(projectData) {
        if (projectData) {
            const info = `
                <div class="info-item">
                    <strong>Name:</strong> ${projectData.name || 'Unknown'}
                </div>
                <div class="info-item">
                    <strong>Type:</strong> ${projectData.type || 'Unknown'}
                </div>
                <div class="info-item">
                    <strong>Path:</strong> ${projectData.path || 'Unknown'}
                </div>
            `;
            document.getElementById('project-info').innerHTML = info;
        } else {
            document.getElementById('project-info').innerHTML = '<p>No project loaded</p>';
        }
    }
    
    updateBinContents(content) {
        document.getElementById('bin-contents').innerHTML = `<p>${content}</p>`;
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('connection-status');
        statusEl.textContent = message;
        statusEl.className = `status-badge ${type}`;
    }
    
    logEvent(eventName, data) {
        const logEl = document.getElementById('event-log');
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <strong>${eventName}</strong>
            ${data ? `: ${JSON.stringify(data).substring(0, 100)}` : ''}
        `;
        logEl.insertBefore(entry, logEl.firstChild);
        
        // Keep only last 20 entries
        while (logEl.children.length > 20) {
            logEl.removeChild(logEl.lastChild);
        }
    }
}

// Initialize app when page loads
window.addEventListener('load', () => {
    window.avidPanel = new AvidPanelApp();
});