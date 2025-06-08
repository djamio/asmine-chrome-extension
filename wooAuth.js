class WooAuth {
  constructor() {
    console.log('WooAuth class initialized');
    this.API_URL = 'https://asmine-production.up.railway.app/api';
    this.APP_NAME = 'ChatGPT WooCommerce Audit';
    this.CALLBACK_URL = 'https://asmine-production.up.railway.app/woo/callback';
    
    // Bind methods
    this.authorize = this.authorize.bind(this);
    this.checkAuthStatus = this.checkAuthStatus.bind(this);
    this.updateUI = this.updateUI.bind(this);
    this.resetAuth = this.resetAuth.bind(this);
    this.validateUrl = this.validateUrl.bind(this);

    // Initialize
    this.init().catch(error => {
      console.error('Initialization error:', error);
      this.updateUI(false).catch(console.error);
    });

    // Add event listeners
    document.getElementById('authorizeWoo')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.authorize();
    });

    document.getElementById('shopUrl')?.addEventListener('input', async (e) => {
      const url = e.target.value.trim();
      const isValid = this.validateUrl(url);
      const submitButton = document.getElementById('authorizeWoo');
      if (submitButton) {
        submitButton.disabled = !isValid;
      }
    });

    this.initializeResetButton();
  }

  async init() {
    console.log('Initializing WooAuth');
    try {
      // Check if we have stored auth data
      const auth = await chrome.storage.local.get(['wooAuth']);
      console.log('Stored auth data:', auth);

      if (auth.wooAuth?.isConnected && auth.wooAuth?.userId && auth.wooAuth?.storeUrl) {
        console.log('Found stored credentials');
        // Verify the stored credentials are still valid
        const status = await this.checkAuthStatus(auth.wooAuth.userId);
        if (status.success) {
          await this.updateUI(true, auth.wooAuth.storeUrl);
          return;
        }
        // If verification fails, clear stored data and show connect form
        await this.resetAuth(false);
      }
      
      console.log('No valid connection found');
      await this.updateUI(false);
    } catch (error) {
      console.error('Init error:', error);
      await this.updateUI(false);
    }
  }

  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async generateUserId() {
    // Get or create a unique ID for this extension installation
    const stored = await chrome.storage.local.get(['extensionId']);
    if (stored.extensionId) {
      return stored.extensionId;
    }
    
    const newId = 'ext_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    await chrome.storage.local.set({ extensionId: newId });
    return newId;
  }

  buildAuthUrl(shopUrl, userId) {
    // Remove trailing slash if present
    const baseUrl = shopUrl.replace(/\/$/, '');
    
    // Construct the authorization URL with required parameters
    const params = new URLSearchParams({
      app_name: encodeURIComponent(this.APP_NAME),
      scope: 'read_write',
      user_id: userId,
      return_url: encodeURIComponent(chrome.runtime.getURL('return.html')),
      callback_url: encodeURIComponent(this.CALLBACK_URL)
    });

    // Use the correct WooCommerce REST API authorization endpoint
    return `${baseUrl}/wc-auth/v1/authorize?${params.toString()}`;
  }

  async authorize() {
    try {
      // Check if authorization is already in progress
      if (this._authInProgress) {
        console.log('Authorization already in progress');
        return;
      }

      const shopUrl = document.getElementById('shopUrl')?.value.trim();
      if (!shopUrl || !this.validateUrl(shopUrl)) {
        this.showError('Please enter a valid shop URL');
        return;
      }

      // Set authorization in progress flag
      this._authInProgress = true;

      this.showLoadingState();
      this.updateLoadingMessage('Initiating connection...', 'info');

      // Get or generate the extension ID
      const userId = await this.generateUserId();

      // Store shop URL and userId for later use
      await chrome.storage.local.set({
        wooAuth: {
          shopUrl: shopUrl,
          userId: userId,
          isConnected: false,
          timestamp: Date.now()
        }
      });

      // Build the authorization URL with the correct parameters
      const authUrl = this.buildAuthUrl(shopUrl, userId);
      console.log('Authorization URL:', authUrl);

      // Start polling for auth status
      this.startStatusPolling(userId);

      // Open auth URL in new tab
      window.open(authUrl, '_blank');

    } catch (error) {
      console.error('Authorization error:', error);
      this.hideLoadingState();
      this.showError(error.message || 'Failed to connect to WooCommerce. Please try again.');
    } finally {
      // Clear authorization in progress flag after a delay
      setTimeout(() => {
        this._authInProgress = false;
      }, 1000);
    }
  }

  async checkAuthStatus(userId) {
    try {
      const response = await fetch(`${this.API_URL}/woo/auth-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-user-id': userId
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check authorization status');
      }

      // Check if we have a successful authentication
      if (data.success && data.isAuthenticated) {
        // Store the authenticated state
        await chrome.storage.local.set({
          wooAuth: {
            isConnected: true,
            userId: userId,
            storeUrl: data.store_url,
            timestamp: Date.now()
          }
        });

        return {
          success: true,
          store_url: data.store_url
        };
      }

      // If not authenticated but no error, return success: false
      return {
        success: false
      };

    } catch (error) {
      console.error('Auth status check error:', error);
      return {
        error: error.message || 'Failed to check authorization status'
      };
    }
  }

  async startStatusPolling(userId) {
    let attempts = 0;
    const maxAttempts = 6; // Poll for 30 seconds (6 attempts * 5 seconds interval)
    const interval = 5000; // Poll every 5 seconds

    const poll = async () => {
      if (attempts >= maxAttempts) {
        this.hideLoadingState();
        this.showError('Connection timed out. Please check your shop URL and try again.');
        return;
      }

      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
        const status = await this.checkAuthStatus(userId);
        console.log('Poll status:', status);
        
        if (status.error) {
          this.hideLoadingState();
          this.showError(status.error || 'Failed to connect to WooCommerce. Please try again.');
          return;
        }

        // Check if authorization is successful
        if (status.success) {
          this.updateLoadingMessage('Connection successful! Setting up your store...', 'success');
          
          // Hide loading state and update UI after a short delay
          setTimeout(async () => {
            this.hideLoadingState();
            await this.updateUI(true, status.store_url);
          }, 1000);
          return;
        } else {
          const remainingTime = (maxAttempts - attempts) * (interval / 1000);
          this.updateLoadingState(remainingTime);
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.hideLoadingState();
        this.showError('Failed to connect to WooCommerce. Please check your connection and try again.');
        return;
      }

      attempts++;
      setTimeout(poll, interval);
    };

    poll();
  }

  updateLoadingState(remainingSeconds) {
    const loadingState = document.getElementById('authLoadingState');
    if (!loadingState) return;

    const progressBar = loadingState.querySelector('.progress-bar-fill');
    const progressText = loadingState.querySelector('.progress-text');
    const timeText = loadingState.querySelector('.time-remaining');
    
    if (progressBar) {
      const progress = ((30 - remainingSeconds) / 30) * 100;
      progressBar.style.width = `${progress}%`;
    }
    
    if (timeText) {
      timeText.textContent = `${Math.ceil(remainingSeconds)}s remaining`;
    }
    
    if (progressText) {
      if (remainingSeconds > 25) {
        progressText.textContent = 'Opening WooCommerce authorization page...';
      } else if (remainingSeconds > 15) {
        progressText.textContent = 'Waiting for authorization...';
      } else if (remainingSeconds > 5) {
        progressText.textContent = 'Almost there! Finalizing connection...';
      } else {
        progressText.textContent = 'Just a few more seconds...';
      }
    }
  }

  updateLoadingMessage(message, type = 'info') {
    const loadingState = document.getElementById('authLoadingState');
    if (!loadingState) return;

    const progressText = loadingState.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = message;
      progressText.className = `progress-text ${type}`;
    }
  }

  async resetAuth(showUI = true) {
    try {
      await chrome.storage.local.remove('wooAuth');
      if (showUI) {
        await this.updateUI(false);
      }
    } catch (error) {
      console.error('Reset auth error:', error);
      this.showError('Failed to reset authentication. Please try again.');
    }
  }

  async updateUI(isConnected, shopUrl = '') {
    const statusText = document.getElementById('authStatusText');
    const authorizeButton = document.getElementById('authorizeWoo');
    const resetButton = document.getElementById('resetWooAuth');
    const authForm = document.querySelector('.auth-form');
    const authInfo = document.querySelector('.auth-info');
    const shopUrlInput = document.getElementById('shopUrl');

    if (statusText) {
      statusText.textContent = isConnected ? 'Connected' : 'Not Connected';
      statusText.style.color = isConnected ? '#4CAF50' : '#dc3545';
    }

    if (authorizeButton) {
      authorizeButton.style.display = isConnected ? 'none' : 'block';
    }

    if (resetButton) {
      resetButton.style.display = isConnected ? 'block' : 'none';
    }

    if (authForm) {
      authForm.style.display = isConnected ? 'none' : 'block';
    }

    if (authInfo) {
      if (isConnected) {
        authInfo.innerHTML = `
          <div class="connection-details">
            <p style="color: #4CAF50; margin-bottom: 10px;">✓ Successfully connected to your WooCommerce store</p>
            <p style="color: #666; font-size: 14px;">Connected to: ${shopUrl}</p>
          </div>`;
      } else {
        authInfo.innerHTML = '<p>Enter your WooCommerce shop URL and click connect. You\'ll be redirected to your shop to authorize access.</p>';
      }
    }

    if (shopUrlInput && shopUrl) {
      shopUrlInput.value = shopUrl;
    }

    // Get userId and dispatch event
    if (isConnected) {
      const auth = await chrome.storage.local.get(['wooAuth']);
      document.dispatchEvent(new CustomEvent('wooAuthChanged', {
        detail: { 
          connected: isConnected,
          userId: auth.wooAuth?.userId || null
        }
      }));
    } else {
      document.dispatchEvent(new CustomEvent('wooAuthChanged', {
        detail: { 
          connected: false,
          userId: null
        }
      }));
    }
  }

  initializeResetButton() {
    const resetButton = document.getElementById('resetWooAuth');
    if (resetButton) {
      resetButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset the WooCommerce connection? This will require you to reconnect.')) {
          await this.resetAuth();
        }
      });
    }
  }

  showLoadingState() {
    const loadingState = document.getElementById('authLoadingState');
    if (loadingState) {
      loadingState.style.display = 'block';
    }
  }

  hideLoadingState() {
    const loadingState = document.getElementById('authLoadingState');
    if (loadingState) {
      loadingState.style.display = 'none';
    }
  }

  showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.style.cssText = `
      border-left: 4px solid #dc3545;
      background-color: #fff5f5;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
      position: relative;
    `;

    const errorContent = document.createElement('div');
    errorContent.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 12px;
    `;

    // Add error icon
    const errorIcon = document.createElement('div');
    errorIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#dc3545" stroke-width="2"/>
        <path d="M10 5v6" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
        <circle cx="10" cy="14" r="1" fill="#dc3545"/>
      </svg>
    `;
    errorContent.appendChild(errorIcon);

    // Add error message
    const messageContainer = document.createElement('div');
    messageContainer.style.flex = '1';

    const errorTitle = document.createElement('div');
    errorTitle.textContent = 'Connection Error';
    errorTitle.style.cssText = `
      color: #dc3545;
      font-weight: 600;
      margin-bottom: 4px;
    `;
    messageContainer.appendChild(errorTitle);

    const errorMessage = document.createElement('div');
    errorMessage.textContent = message;
    errorMessage.style.cssText = `
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    `;
    messageContainer.appendChild(errorMessage);

    errorContent.appendChild(messageContainer);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #666;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      position: absolute;
      top: 8px;
      right: 8px;
    `;
    closeButton.onclick = () => errorContainer.remove();
    errorContainer.appendChild(closeButton);

    errorContainer.appendChild(errorContent);

    // Add retry button if appropriate
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Try Again';
    retryButton.style.cssText = `
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      margin-top: 12px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    `;
    retryButton.onmouseover = () => retryButton.style.backgroundColor = '#c82333';
    retryButton.onmouseout = () => retryButton.style.backgroundColor = '#dc3545';
    retryButton.onclick = async () => {
      errorContainer.remove();
      await this.resetAuth(true);
      const shopUrlInput = document.getElementById('shopUrl');
      if (shopUrlInput) {
        shopUrlInput.focus();
      }
    };
    errorContainer.appendChild(retryButton);

    // Insert error container
    const authForm = document.querySelector('.auth-form');
    if (authForm) {
      const existingError = authForm.querySelector('.error-container');
      if (existingError) {
        existingError.remove();
      }
      authForm.appendChild(errorContainer);
    }
  }
}

// Initialize WooCommerce authorization when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWooAuth);
} else {
  initWooAuth();
}

function initWooAuth() {
  // Wait a bit to ensure the slider is injected
  setTimeout(() => {
    if (!window.wooAuth) {
      console.log('Initializing WooAuth instance');
      try {
        window.wooAuth = new WooAuth();
        window.wooAuth.init().catch(error => {
          console.error('Error initializing WooAuth:', error);
        });
      } catch (error) {
        console.error('Error creating WooAuth instance:', error);
      }
    }
  }, 1000);
} 