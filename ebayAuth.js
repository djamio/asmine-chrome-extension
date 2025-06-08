class EbayAuth {
  constructor() {
    console.log('EbayAuth class initialized');
    this.APP_ID = 'MohamedA-180count-PRD-b5d705b3d-d5e82f6a';
    this.CERT_ID = 'PRD-4735840c9218-37c4-4d9f-ac96-ed65';
    this.AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';
    this.API_URL = 'https://asmine-production.up.railway.app/api';
    this.REDIRECT_URI = 'https://asmine-production.up.railway.app/callback';
    
    // Bind methods
    this.authorize = this.authorize.bind(this);
    this.checkAuthStatus = this.checkAuthStatus.bind(this);
    this.updateUI = this.updateUI.bind(this);
    this.resetAuth = this.resetAuth.bind(this);

    // Initialize
    this.init();
    this.initializeResetButton();
  }

  initializeResetButton() {
    const resetButton = document.getElementById('resetEbayAuth');
    if (resetButton) {
      resetButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset your eBay authorization? You will need to authorize again to use eBay features.')) {
          await this.resetAuth();
        }
      });
    }
  }

  async resetAuth() {
    try {
      console.log('Resetting eBay authorization...');
      
      // Show loading state
      this.updateLoadingMessage('Resetting authorization...');
      document.getElementById('authLoadingState').style.display = 'block';
      
      // Call backend to revoke token if needed
      try {
        const auth = await chrome.storage.local.get(['ebayAuth']);
        if (auth.ebayAuth?.state) {
          await fetch(`${this.API_URL}/ebay/revoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ebay-state': auth.ebayAuth.state
            },
            mode: 'cors',
            credentials: 'include'
          });
        }
      } catch (error) {
        console.error('Error revoking token:', error);
        // Continue with reset even if revoke fails
      }

      // Clear stored auth data
      await chrome.storage.local.remove(['ebayAuth']);
      
      // Update UI
      setTimeout(() => {
        document.getElementById('authLoadingState').style.display = 'none';
        this.updateUI(false);
        
        // Show success message
        const authInfo = document.querySelector('.auth-info');
        if (authInfo) {
          const originalContent = authInfo.innerHTML;
          authInfo.innerHTML = '<p style="color: #4CAF50;">Authorization has been reset successfully. You can now authorize again.</p>';
          setTimeout(() => {
            authInfo.innerHTML = originalContent;
          }, 3000);
        }
      }, 1000);

      // Dispatch event for other components
      document.dispatchEvent(new CustomEvent('ebayAuthChanged', {
        detail: { authorized: false }
      }));

    } catch (error) {
      console.error('Reset error:', error);
      this.showError('Failed to reset authorization. Please try again.');
    }
  }

  updateLoadingMessage(message, isError = false) {
    const loadingText = document.querySelector('.loading-text');
    const loadingSubtext = document.querySelector('.loading-subtext');
    
    if (loadingText) {
      loadingText.textContent = message;
      if (isError) {
        loadingText.style.color = '#f44336';
      }
    }
    
    if (loadingSubtext && isError) {
      loadingSubtext.style.display = 'none';
    }
  }

  async init() {
    console.log('Initializing EbayAuth');
    try {
      // Check if we have stored auth data
      const auth = await chrome.storage.local.get(['ebayAuth']);
      console.log('Stored auth data:', auth);

      if (auth.ebayAuth?.isAuthorized) {
        // Check if the authorization is still valid
        const expiresAt = new Date(auth.ebayAuth.expiresAt);
        const now = new Date();
        
        if (expiresAt > now) {
          console.log('Stored authorization is still valid');
          this.updateUI(true);
        } else {
          console.log('Stored authorization has expired');
          await chrome.storage.local.remove(['ebayAuth']);
          this.updateUI(false);
        }
      } else {
        console.log('No valid authorization found');
        this.updateUI(false);
      }
    } catch (error) {
      console.error('Init error:', error);
      this.updateUI(false);
    }
  }

  showLoadingState() {
    const authorizeButton = document.getElementById('authorizeEbay');
    const loadingState = document.getElementById('authLoadingState');
    const progressFill = document.querySelector('.progress-fill');
    const timeRemaining = document.getElementById('timeRemaining');

    if (authorizeButton) authorizeButton.style.display = 'none';
    if (loadingState) loadingState.style.display = 'block';

    // Start progress bar animation
    if (progressFill) {
      progressFill.style.width = '0%';
      setTimeout(() => {
        progressFill.style.width = '100%';
      }, 100);
    }

    // Update timer
    let timeLeft = 5 * 60; // 5 minutes in seconds
    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      if (timeRemaining) {
        timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      timeLeft--;
      if (timeLeft >= 0) {
        setTimeout(updateTimer, 1000);
      }
    };
    updateTimer();
  }

  hideLoadingState() {
    const authorizeButton = document.getElementById('authorizeEbay');
    const loadingState = document.getElementById('authLoadingState');

    if (authorizeButton) authorizeButton.style.display = 'block';
    if (loadingState) loadingState.style.display = 'none';
  }

  async authorize() {
    console.log('Starting authorization process...');
    try {
      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);
      console.log('Generated state:', state);
      
      // Store state in local storage for verification
      await chrome.storage.local.set({ ebayAuthState: state });
      console.log('State stored in chrome.storage');

      // Construct authorization URL
      const authUrl = new URL(this.AUTH_URL);
      authUrl.searchParams.append('client_id', this.APP_ID);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
      ].join(' '));

      const finalUrl = authUrl.toString();
      console.log('Authorization URL:', finalUrl);

      // Show loading state
      this.showLoadingState();
      this.updateLoadingMessage('Waiting for eBay authorization...');

      // Open authorization URL in new tab
      console.log('Opening authorization URL in new tab...');
      window.open(finalUrl, '_blank');

      // Start polling for auth status
      this.startStatusPolling(state);
    } catch (error) {
      console.error('Authorization error:', error);
      this.hideLoadingState();
      this.showError('Failed to start authorization process');
    }
  }

  async startStatusPolling(state) {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 5 minutes max
    const interval = 5000; // Poll every 5 seconds

    const poll = async () => {
      if (attempts >= maxAttempts) {
        this.hideLoadingState();
        this.showError('Authorization timeout. Please try again.');
        return;
      }

      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
        const status = await this.checkAuthStatus(state);
        console.log('Poll status:', status);
        
        if (status.error) {
          this.updateLoadingMessage(`Error: ${status.error}`, true);
          setTimeout(() => {
            this.hideLoadingState();
            this.showError(status.error);
          }, 3000);
          return;
        }

        // Check if authorization is successful
        if (status.success && status.isAuthenticated && status.isValid) {
          this.updateLoadingMessage('Authorization successful! Completing setup...');
          
          // Store auth status with all relevant data
          await chrome.storage.local.set({ 
            ebayAuth: { 
              isAuthorized: true,
              timestamp: Date.now(),
              state: state,
              expiresAt: status.expiresAt
            } 
          });
          
          // Hide loading state and update UI after a short delay
          setTimeout(() => {
            this.hideLoadingState();
            this.updateUI(true);
          }, 1000);
          return;
        } else {
          this.updateLoadingMessage('Waiting for eBay authorization...');
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.updateLoadingMessage('Error checking authorization status. Retrying...', true);
      }

      attempts++;
      setTimeout(poll, interval);
    };

    poll();
  }

  async checkAuthStatus(state) {
    try {
      console.log(`Checking auth status for state: ${state}`);
      const response = await fetch(`${this.API_URL}/ebay/auth-status?state=${state}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-ebay-state': state
        },
        mode: 'cors',
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Auth status response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check authorization status');
      }

      return data;
    } catch (error) {
      console.error('Status check error:', error);
      return { error: error.message };
    }
  }

  updateUI(isAuthorized) {
    const statusText = document.getElementById('authStatusText');
    const authorizeButton = document.getElementById('authorizeEbay');
    const resetButton = document.getElementById('resetEbayAuth');
    const loadingState = document.getElementById('authLoadingState');
    const authInfo = document.querySelector('.auth-info');
    
    if (statusText) {
      statusText.textContent = isAuthorized ? 'Authorized' : 'Not Authorized';
      statusText.style.color = isAuthorized ? '#4CAF50' : '#666';
    }
    
    if (authorizeButton) {
      authorizeButton.style.display = isAuthorized ? 'none' : 'block';
    }

    if (resetButton) {
      resetButton.style.display = isAuthorized ? 'block' : 'none';
    }

    if (loadingState) {
      loadingState.style.display = 'none';
    }

    if (authInfo) {
      if (isAuthorized) {
        chrome.storage.local.get(['ebayAuth'], (result) => {
          const expiresAt = result.ebayAuth?.expiresAt;
          const expiryDate = expiresAt ? new Date(expiresAt).toLocaleString() : 'Unknown';
          authInfo.innerHTML = `
            <p>Your eBay authorization is active.</p>
            <p>Expires: ${expiryDate}</p>
            <p class="auth-note" style="margin-top: 10px; font-size: 0.9em; color: #666;">
              If you need to reauthorize or switch accounts, use the Reset Authorization button above.
            </p>
          `;
        });
      } else {
        authInfo.innerHTML = `
          <p>Click the button above to authorize this extension to access your eBay account. 
          You will be redirected to eBay to complete the authorization process.</p>
        `;
      }
    }

    // Dispatch event for authorization status change
    document.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: { authorized: isAuthorized }
    }));
  }

  showError(message) {
    const statusText = document.getElementById('authStatusText');
    if (statusText) {
      statusText.textContent = `Error: ${message}`;
      statusText.style.color = '#f44336';
    }
    this.hideLoadingState();
  }
}

// Export the class for use in slider.js
window.EbayAuth = EbayAuth;

// Initialize eBay authorization when the tab is loaded
document.addEventListener('DOMContentLoaded', () => {
  const ebayAuth = new EbayAuth();
  
  // Add click handler for the authorize button
  document.getElementById('authorizeEbay')?.addEventListener('click', () => {
    ebayAuth.authorize();
  });
}); 