class EbayConfig {
  constructor() {
    this.EBAY_SANDBOX_AUTH_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize';
    this.EBAY_PROD_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';
    this.REDIRECT_URI = chrome.identity.getRedirectURL();
    this.API_ENDPOINT = 'https://asmine-production.up.railway.app/api';
    
    // Store credentials in chrome.storage
    this.credentials = {
      certId: null,
      devId: null,
      isAuthorized: false
    };

    this.initializeCredentials();
  }

  async initializeCredentials() {
    // Load saved credentials from chrome.storage
    const stored = await chrome.storage.local.get(['ebayCredentials']);
    if (stored.ebayCredentials) {
      this.credentials = stored.ebayCredentials;
      this.updateStatusDisplay();
    }
  }

  async registerApplication() {
    try {
      // Open eBay Developer Portal registration page
      const registrationUrl = 'https://developer.ebay.com/my/keys';
      const newWindow = window.open(registrationUrl, '_blank');
      
      // Show instructions modal
      this.showInstructionsModal(`
        <h3>Registration Instructions</h3>
        <ol>
          <li>Sign in to your eBay Developer account (or create one)</li>
          <li>Click on "Get a Keyset"</li>
          <li>Select "Production" environment</li>
          <li>Note down your Production Cert ID (App ID) and Dev ID</li>
          <li>Return to this window and click "Save Credentials"</li>
        </ol>
      `);
    } catch (error) {
      console.error('Error during registration:', error);
      this.showError('Failed to open registration page');
    }
  }

  showInstructionsModal(content) {
    const modal = document.createElement('div');
    modal.className = 'ebay-modal';
    modal.innerHTML = `
      <div class="ebay-modal-content">
        ${content}
        <div class="ebay-modal-form">
          <div class="form-group">
            <label for="certId">Production Cert ID (App ID):</label>
            <input type="text" id="certId" placeholder="Enter your Cert ID">
          </div>
          <div class="form-group">
            <label for="devId">Dev ID:</label>
            <input type="text" id="devId" placeholder="Enter your Dev ID">
          </div>
          <button id="saveCredentials" class="action-button">Save Credentials</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listener for saving credentials
    document.getElementById('saveCredentials').addEventListener('click', () => {
      const certId = document.getElementById('certId').value;
      const devId = document.getElementById('devId').value;

      if (certId && devId) {
        this.saveCredentials(certId, devId);
        modal.remove();
      } else {
        this.showError('Please enter both Cert ID and Dev ID');
      }
    });
  }

  async saveCredentials(certId, devId) {
    try {
      // Save credentials to chrome.storage
      this.credentials.certId = certId;
      this.credentials.devId = devId;
      await chrome.storage.local.set({ ebayCredentials: this.credentials });

      // Update status display
      this.updateStatusDisplay();

      // Send credentials to backend
      await this.sendCredentialsToBackend(certId, devId);

      this.showSuccess('Credentials saved successfully');
    } catch (error) {
      console.error('Error saving credentials:', error);
      this.showError('Failed to save credentials');
    }
  }

  async authorizeApplication() {
    if (!this.credentials.certId || !this.credentials.devId) {
      this.showError('Please register your application first');
      return;
    }

    try {
      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);
      
      // Construct authorization URL
      const authUrl = new URL(this.EBAY_PROD_AUTH_URL);
      authUrl.searchParams.append('client_id', this.credentials.certId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', 'https://api.ebay.com/oauth/api_scope');

      // Launch eBay authorization page
      const authResult = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      });

      // Parse the authorization code from the redirect URL
      const code = new URL(authResult).searchParams.get('code');
      if (code) {
        // Send the authorization code to your backend
        await this.sendAuthorizationCode(code);
        
        this.credentials.isAuthorized = true;
        await chrome.storage.local.set({ ebayCredentials: this.credentials });
        this.updateStatusDisplay();
        
        this.showSuccess('Application authorized successfully');
      }
    } catch (error) {
      console.error('Authorization error:', error);
      this.showError('Failed to authorize application');
    }
  }

  async sendCredentialsToBackend(certId, devId) {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/ebay/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ certId, devId })
      });

      if (!response.ok) {
        throw new Error('Failed to send credentials to backend');
      }
    } catch (error) {
      console.error('Backend error:', error);
      throw error;
    }
  }

  async sendAuthorizationCode(code) {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/ebay/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          redirectUri: this.REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error('Failed to exchange authorization code');
      }
    } catch (error) {
      console.error('Backend error:', error);
      throw error;
    }
  }

  updateStatusDisplay() {
    const certIdStatus = document.getElementById('cert-id-status');
    const devIdStatus = document.getElementById('dev-id-status');
    const authStatus = document.getElementById('auth-status');

    if (certIdStatus) {
      certIdStatus.textContent = this.credentials.certId ? 'Configured' : 'Not configured';
      certIdStatus.className = `status-value ${this.credentials.certId ? 'configured' : 'not-configured'}`;
    }

    if (devIdStatus) {
      devIdStatus.textContent = this.credentials.devId ? 'Configured' : 'Not configured';
      devIdStatus.className = `status-value ${this.credentials.devId ? 'configured' : 'not-configured'}`;
    }

    if (authStatus) {
      authStatus.textContent = this.credentials.isAuthorized ? 'Authorized' : 'Not authorized';
      authStatus.className = `status-value ${this.credentials.isAuthorized ? 'configured' : 'not-configured'}`;
    }
  }

  showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }
}

// Initialize eBay configuration when the tab is loaded
document.addEventListener('DOMContentLoaded', () => {
  const ebayConfig = new EbayConfig();
  
  // Add event listeners for the buttons
  document.getElementById('register-ebay-app')?.addEventListener('click', () => {
    ebayConfig.registerApplication();
  });

  document.getElementById('authorize-ebay-app')?.addEventListener('click', () => {
    ebayConfig.authorizeApplication();
  });
});

// Make EbayConfig available globally
window.EbayConfig = EbayConfig; 