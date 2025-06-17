// Product Pricing Analyzer - Chrome Extension Feature
// This module handles product pricing analysis using ChatGPT

(function() {
  'use strict';

  // Global variables for pricing analysis
  let currentPricingRequest = null;
  let pricingObserver = null;

  // Function to create pricing analysis button
  function createPricingAnalysisButton(productId) {
    return `
      <button class="pricing-analysis-btn" data-product-id="${productId}" title="Analyze Product Pricing">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </button>
    `;
  }

  // Function to handle pricing analysis prompt generation and response
  async function handlePricingAnalysis(btn, product) {
    try {
      // Disable button and show loading state with spinner
      btn.disabled = true;
      btn.innerHTML = `
        <div class="loading-spinner-small"></div>
      `;

      // Generate a unique request ID for this specific request
      const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const productId = product.id;
      const productPrice = product.price || 0;
      console.log('Starting new pricing analysis request with ID:', requestId, 'for product ID:', productId);

      // Store the request start time to track when this request was initiated
      const requestStartTime = Date.now();
      console.log('Starting new pricing analysis request at:', requestStartTime);

      const prompt = `You are a product pricing analyst assistant.

I will provide you with a product's title, description, and price. Your task is to:

1. Search for **at least 3 similar products** available on the market (e.g., Amazon, eBay, Walmart, Nike.com, etc..).
2. Return their:
   - Title
   - Price
   - Product URL
3. Compare those prices with the current product's price.
4. Analyze whether the current price is competitive, underpriced, or overpriced.
5. Suggest a new, optimized price if applicable.

Current Product Details:
- ID: ${productId}
- Title: ${product.title || product.name}
- Description: ${product.description || product.short_description || 'No description available'}
- Current Price: $${productPrice}
- specifications: ${JSON.stringify(product.specifications || [])}

IMPORTANT: Include the exact product ID and price in your response for validation.

Return your answer in the following **JSON format**:

{
  "requestId": "${requestId}",
  "productId": "${productId}",
  "currentProduct": {
    "id": "${productId}",
    "title": "${product.title || product.name}",
    "price": ${productPrice},
    "analysis": "Analysis of current pricing position..."
  },
  "marketComparisons": [
    {
      "title": "Similar Product Title",
      "price": 25.00,
      "productUrl": "https://example.com/product1"
    },
    {
      "title": "Another Similar Product",
      "price": 30.00,
      "productUrl": "https://example.com/product2"
    },
    {
      "title": "Third Similar Product",
      "price": 28.50,
      "productUrl": "https://example.com/product3"
    }
  ],
  "pricingAnalysis": {
    "isCompetitive": true,
    "pricingPosition": "competitive|underpriced|overpriced",
    "recommendation": "Detailed pricing recommendation...",
    "suggestedPrice": 29.99,
    "priceDifference": 2.50,
    "priceDifferencePercentage": 8.33
  }
}

Please ensure the response is valid JSON and includes all required fields.
provide the analysis in the same language as the product title
return only the json and nothing else`;

      // Find ChatGPT's input area and send the prompt
      try {
        // Find the contenteditable div (ChatGPT's input box)
        const inputBox = document.querySelector('[contenteditable="true"]');
        if (inputBox) {
          // Focus the input box
          inputBox.focus();

          // Insert the prompt using execCommand
          document.execCommand("insertText", false, prompt);

          // Find and click the send button after a short delay
          setTimeout(() => {
            const sendButton = document.querySelector('[data-testid="send-button"]');
            if (sendButton) {
              sendButton.click();
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error inserting prompt:', error);
        // Fallback: try the textarea approach
        const textarea = document.querySelector('#prompt-textarea');
        if (textarea) {
          textarea.value = prompt;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.focus();
          const sendButton = document.querySelector('[data-testid="send-button"]');
          if (sendButton) {
            sendButton.click();
          }
        }
      }

      // Monitor ChatGPT's response
      let debounceTimer;
      let responseCount = 0;
      let timeoutTimer;
      
      // Timeout: stop spinner and show warning if no valid JSON after 15 seconds
      timeoutTimer = setTimeout(() => {
        // Remove spinner and re-enable button
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
        // Show warning notification
        showNotification('warning', 'Timeout', 'No valid pricing analysis response received from ChatGPT after 15 seconds. Please try again or rephrase your prompt.');
      }, 15000);

      pricingObserver = new MutationObserver((mutations) => {
        console.log('Pricing Analysis MutationObserver triggered, mutations:', mutations.length);
        // Clear any existing timer
        clearTimeout(debounceTimer);
        // Set a new timer to process the latest state
        debounceTimer = setTimeout(() => {
          console.log('Processing final state after mutations for pricing analysis');
          // Use the extractLastJSONFromChatGPT function with validator
          const parsed = extractLastJSONFromChatGPT((json) => {
            // Check if this is a valid pricing analysis response structure
            const isValidStructure = json && json.currentProduct && json.marketComparisons && json.pricingAnalysis;
            
            if (!isValidStructure) {
              console.log('Invalid pricing analysis JSON structure');
              return false;
            }
            
            // Multi-layer validation using reliable identifiers
            let isValidResponse = false;
            
            // Method 1: Check requestId if available (most reliable)
            if (json.requestId && json.requestId === requestId) {
              console.log('✅ Validated by requestId match');
              isValidResponse = true;
            }
            
            // Method 2: Check productId if available (very reliable)
            else if (json.productId && String(json.productId) === String(productId)) {
              console.log('✅ Validated by productId match');
              isValidResponse = true;
            }
            
            // Method 3: Check product ID in currentProduct object (reliable)
            else if (json.currentProduct?.id && String(json.currentProduct.id) === String(productId)) {
              console.log('✅ Validated by currentProduct.id match');
              isValidResponse = true;
            }
            
            // Method 4: Check price match (fairly reliable for unique prices)
            else if (json.currentProduct?.price !== undefined && Math.abs(json.currentProduct.price - productPrice) < 0.01) {
              console.log('✅ Validated by price match');
              isValidResponse = true;
            }
            
            // Method 5: Fallback - check if this is the only recent response (basic safety)
            else {
              const currentTime = Date.now();
              const timeSinceRequest = currentTime - requestStartTime;
              if (timeSinceRequest > 5000 && timeSinceRequest < 60000) { // Between 5-60 seconds
                console.log('⚠️ Fallback validation - recent response without specific identifiers');
                isValidResponse = true;
              }
            }
            
            console.log('Validating pricing analysis JSON:', {
              isValidStructure,
              isValidResponse,
              expectedRequestId: requestId,
              actualRequestId: json.requestId,
              expectedProductId: productId,
              actualProductId: json.productId || json.currentProduct?.id,
              expectedPrice: productPrice,
              actualPrice: json.currentProduct?.price,
              validationMethod: json.requestId === requestId ? 'requestId' : 
                               json.productId === String(productId) ? 'productId' :
                               json.currentProduct?.id === String(productId) ? 'currentProduct.id' :
                               Math.abs((json.currentProduct?.price || 0) - productPrice) < 0.01 ? 'price' : 'fallback'
            });
            
            return isValidStructure && isValidResponse;
          });
          
          if (parsed) {
            // If valid JSON is found, clear the timeout
            clearTimeout(timeoutTimer);
            console.log('Found valid pricing analysis results JSON:', parsed);
            
            // Check if this result is from our current request by checking the timestamp
            const currentTime = Date.now();
            const timeSinceRequest = currentTime - requestStartTime;
            
            // Only process results that came after our request started (with a small buffer)
            // and ensure we're not processing old responses
            if (timeSinceRequest > 3000) { // At least 3 seconds after request started
              console.log('Processing pricing results from current request (time since request:', timeSinceRequest, 'ms)');
                    
              // Store the pricing analysis results and product data
              const pricingData = {
                analysis: parsed,
                product: product,
                timestamp: Date.now(),
                requestId: requestId,
                productId: productId,
                validationMethod: parsed.requestId === requestId ? 'requestId' : 
                                 parsed.productId === String(productId) ? 'productId' :
                                 parsed.currentProduct?.id === String(productId) ? 'currentProduct.id' :
                                 Math.abs((parsed.currentProduct?.price || 0) - productPrice) < 0.01 ? 'price' : 'fallback'
              };
              localStorage.setItem(`pricing_${product.id}`, JSON.stringify(pricingData));

              // Automatically show the pricing analysis modal
              try {
                // Create modal if it doesn't exist
                if (!document.getElementById('pricingModal')) {
                  createPricingModal();
                }
                
                // Get modal after ensuring it exists
                const modal = document.getElementById('pricingModal');
                if (!modal) {
                  console.error('Failed to create or find pricing modal');
                  return;
                }

                // Show modal
                modal.style.display = 'block';

                // Update modal content with fresh pricing analysis results
                updatePricingModalContent(modal, product, parsed);
                
                console.log('Pricing analysis modal automatically displayed for request:', requestId);
              } catch (modalError) {
                console.error('Error showing pricing modal:', modalError);
              }

              // Reset pricing analysis button state
              btn.disabled = false;
              btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              `;

              // Disconnect the observer since we've found and processed the response
              pricingObserver.disconnect();
            } else {
              console.log('Ignoring pricing results from previous request (time since request:', timeSinceRequest, 'ms)');
            }
          } else {
            console.log('No valid pricing analysis JSON found yet, continuing to wait...');
          }
        }, 1000); // Wait 1 second after last mutation before processing
      });

      // Start observing ChatGPT's response area
      console.log('Setting up pricing analysis observer for request:', requestId);
      const possibleTargets = [
        '.chat-content',
        '[data-testid="conversation-main"]',
        'main'
      ];

      let targetNode = null;
      for (const selector of possibleTargets) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('Found target node with selector:', selector);
          targetNode = element;
          break;
        }
      }

      if (targetNode) {
        console.log('Starting observation of target node for pricing analysis');
        pricingObserver.observe(targetNode, { 
          childList: true,
          subtree: true,
          characterData: true,
          characterDataOldValue: true
        });
      } else {
        console.error('Could not find any suitable target node for pricing analysis observation');
        // Reset button states if we couldn't find the target node
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        `;
      }

    } catch (error) {
      console.error('Error in handlePricingAnalysis:', error);
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      `;
    }
  }

  // Function to create pricing analysis modal
  function createPricingModal() {
    console.log('Creating pricing modal...');
    // Check if modal already exists
    if (document.getElementById('pricingModal')) {
      console.log('Pricing modal already exists, returning...');
      return;
    }

    const modalHTML = `
      <div id="pricingModal" class="modal">
        <div class="pricing-modal">
          <div class="modal-header">
            <h2>Product Pricing Analysis</h2>
            <span class="close-pricing-modal">&times;</span>
          </div>
          <div class="modal-content">
            <div class="pricing-tabs">
              <button class="pricing-tab-btn active" data-tab="current">Current Product</button>
              <button class="pricing-tab-btn" data-tab="comparisons">Market Comparisons</button>
              <button class="pricing-tab-btn" data-tab="analysis">Pricing Analysis</button>
            </div>
            
            <div id="tab-current" class="pricing-tab-content active">
              <div class="current-product-info">
                <h3>Current Product Details</h3>
                <div class="product-details">
                  <p><strong>Title:</strong> <span id="current-title"></span></p>
                  <p><strong>Current Price:</strong> <span id="current-price"></span></p>
                  <p><strong>Analysis:</strong> <span id="current-analysis"></span></p>
                </div>
              </div>
            </div>
            
            <div id="tab-comparisons" class="pricing-tab-content">
              <div class="market-comparisons">
                <h3>Market Comparisons</h3>
                <div id="comparisons-list" class="comparisons-grid">
                  <!-- Market comparisons will be populated here -->
                </div>
              </div>
            </div>
            
            <div id="tab-analysis" class="pricing-tab-content">
              <div class="pricing-analysis-details">
                <h3>Pricing Analysis</h3>
                <div class="analysis-summary">
                  <div class="pricing-position">
                    <h4>Pricing Position</h4>
                    <span id="pricing-position" class="position-badge"></span>
                  </div>
                  <div class="price-recommendation">
                    <h4>Price Recommendation</h4>
                    <p><strong>Suggested Price:</strong> <span id="suggested-price"></span></p>
                    <p><strong>Price Difference:</strong> <span id="price-difference"></span></p>
                    <p><strong>Percentage Change:</strong> <span id="percentage-change"></span></p>
                  </div>
                  <div class="recommendation-text">
                    <h4>Recommendation</h4>
                    <p id="recommendation-text"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    console.log('Inserting modal HTML into body...');
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners for modal
    const modal = document.getElementById('pricingModal');
    console.log('Found created modal:', modal);
    
    const closeBtn = modal.querySelector('.close-pricing-modal');
    const tabBtns = modal.querySelectorAll('.pricing-tab-btn');
    
    console.log('Found modal elements:', { closeBtn, tabBtns: tabBtns.length });

    closeBtn.addEventListener('click', () => {
      console.log('Closing pricing modal');
      modal.style.display = 'none';
    });

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        console.log('[Tab Switch] Clicked tab:', tabName);
        // Remove active class from all tabs and hide them
        tabBtns.forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.pricing-tab-content').forEach(content => {
          console.log('[Tab Switch] Removing active from:', content.id);
          content.classList.remove('active');
          content.style.display = 'none'; // Force hide
        });
        // Add active class to clicked tab and show it
        btn.classList.add('active');
        const tabId = 'tab-' + tabName;
        const tabContent = document.getElementById(tabId);
        console.log('[Tab Switch] Activating tab content:', tabId, tabContent);
        if (tabContent) {
          tabContent.classList.add('active');
          tabContent.style.display = 'block'; // Force show
          // Extra debug: log classList and computed style
          console.log('[Tab Switch] tabContent.classList:', tabContent.classList.toString());
          console.log('[Tab Switch] tabContent computed display:', window.getComputedStyle(tabContent).display);
        } else {
          console.warn('[Tab Switch] Tab content not found for:', tabId);
        }
      });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        console.log('Closing pricing modal (clicked outside)');
        modal.style.display = 'none';
      }
    });
    
    console.log('Pricing modal created successfully with event listeners');
  }

  // Function to update pricing modal content
  function updatePricingModalContent(modal, product, analysisResults) {
    console.log('Updating pricing modal content...', { modal, product, analysisResults });
    
    if (!modal || !product || !analysisResults) {
      console.error('Missing required data for pricing modal update:', { modal, product, analysisResults });
      return;
    }

    // Update current product tab
    console.log('Updating current product tab...');
    document.getElementById('current-title').textContent = analysisResults.currentProduct.title;
    document.getElementById('current-price').textContent = `$${analysisResults.currentProduct.price}`;
    document.getElementById('current-analysis').textContent = analysisResults.currentProduct.analysis;

    // Update market comparisons tab
    console.log('Updating market comparisons tab...');
    const comparisonsList = document.getElementById('comparisons-list');
    comparisonsList.innerHTML = analysisResults.marketComparisons.map(comparison => `
      <div class="comparison-item">
        <h4>${comparison.title}</h4>
        <p><strong>Price:</strong> $${comparison.price}</p>
        <p><strong>URL:</strong> <a href="${comparison.productUrl}" target="_blank" rel="noopener noreferrer">View Product</a></p>
      </div>
    `).join('');

    // Update pricing analysis tab
    console.log('Updating pricing analysis tab...');
    const positionBadge = document.getElementById('pricing-position');
    positionBadge.textContent = analysisResults.pricingAnalysis.pricingPosition;
    positionBadge.className = `position-badge ${analysisResults.pricingAnalysis.pricingPosition}`;

    document.getElementById('suggested-price').textContent = `$${analysisResults.pricingAnalysis.suggestedPrice}`;
    document.getElementById('price-difference').textContent = `$${analysisResults.pricingAnalysis.priceDifference}`;
    document.getElementById('percentage-change').textContent = `${analysisResults.pricingAnalysis.priceDifferencePercentage}%`;
    document.getElementById('recommendation-text').textContent = analysisResults.pricingAnalysis.recommendation;
    
    console.log('Pricing modal content update completed');
  }

  // Function to attach pricing analysis button listeners
  function attachPricingAnalysisListeners(products, isBulkOperationsActive = false) {
    const targetResultsDiv = isBulkOperationsActive ? 
      document.getElementById('auditResultsBulk') : 
      document.getElementById('auditResults');
    
    if (!targetResultsDiv) return;
    
    const buttons = targetResultsDiv.querySelectorAll('.pricing-analysis-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => handlePricingAnalysis(btn, products[i]));
    });
  }

  // Function to extract JSON from ChatGPT's last response (reuse from main file)
  function extractLastJSONFromChatGPT(validator = null) {
    // Get all messages from the conversation
    const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));

    if (messages.length === 0) {
      console.log("No assistant messages found");
      return null;
    }

    // Only look at the most recent assistant message
    const lastMessage = messages[messages.length - 1];
    console.log("Checking last assistant message for pricing analysis JSON");

    // Method 1: Try to extract JSON from code blocks first
    const codeBlocks = lastMessage.querySelectorAll('pre code');
    for (const code of codeBlocks) {
      try {
        // Attempt to parse the content as JSON
        const text = code.textContent.trim();

        // Use regex to isolate the JSON if extra characters exist before/after
        const match = text.match(/{[\s\S]*}/);
        if (match) {
          const json = JSON.parse(match[0]);
          console.log("Extracted JSON from code block:", json);
          
          // If a validator function is provided, use it to check the JSON structure
          if (validator && typeof validator === 'function') {
            if (validator(json)) {
              console.log("JSON from code block passed validator for pricing analysis");
              return json;
            } else {
              console.log("JSON from code block failed validator for pricing analysis");
            }
          } else {
            return json; // Return any valid JSON if no validator
          }
        }
      } catch (e) {
        // Not valid JSON, continue
        console.log("Failed to parse JSON from code block:", e.message);
        continue;
      }
    }

    // Method 2: Try to extract JSON from HTML-formatted content
    try {
      const messageHTML = lastMessage.innerHTML;
      console.log("Attempting to extract JSON from HTML-formatted content");
      
      // Find JSON within HTML content
      const jsonMatch = messageHTML.match(/{[\s\S]*}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Clean HTML entities and tags
        jsonString = jsonString
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/<br\s*\/?>/gi, '\n') // Replace <br> tags with newlines
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/&amp;/g, '&') // Replace &amp; with &
          .replace(/&lt;/g, '<') // Replace &lt; with <
          .replace(/&gt;/g, '>') // Replace &gt; with >
          .replace(/&quot;/g, '"') // Replace &quot; with "
          .replace(/&#39;/g, "'") // Replace &#39; with '
          .trim();
        
        const json = JSON.parse(jsonString);
        console.log("Extracted JSON from HTML-formatted content:", json);
        
        // If a validator function is provided, use it to check the JSON structure
        if (validator && typeof validator === 'function') {
          if (validator(json)) {
            console.log("JSON from HTML-formatted content passed validator for pricing analysis");
            return json;
          } else {
            console.log("JSON from HTML-formatted content failed validator for pricing analysis");
          }
        } else {
          return json; // Return any valid JSON if no validator
        }
      }
    } catch (e) {
      console.log("Failed to parse JSON from HTML-formatted content:", e.message);
    }

    // Method 3: Try to extract JSON from the entire message text (for raw JSON responses)
    try {
      const messageText = lastMessage.textContent || lastMessage.innerText;
      console.log("Attempting to extract JSON from entire message text");
      
      // Use regex to find JSON object in the text
      const jsonMatch = messageText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        console.log("Extracted JSON from message text:", json);
        
        // If a validator function is provided, use it to check the JSON structure
        if (validator && typeof validator === 'function') {
          if (validator(json)) {
            console.log("JSON from message text passed validator for pricing analysis");
            return json;
          } else {
            console.log("JSON from message text failed validator for pricing analysis");
          }
        } else {
          return json; // Return any valid JSON if no validator
        }
      }
    } catch (e) {
      console.log("Failed to parse JSON from message text:", e.message);
    }

    // Method 4: Try to clean up and parse the entire message as JSON
    try {
      const messageText = lastMessage.textContent || lastMessage.innerText;
      const cleanedText = messageText.trim();
      
      // Remove common prefixes/suffixes that might be added by ChatGPT
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1);
        const json = JSON.parse(jsonString);
        console.log("Extracted JSON from cleaned message text:", json);
        
        // If a validator function is provided, use it to check the JSON structure
        if (validator && typeof validator === 'function') {
          if (validator(json)) {
            console.log("JSON from cleaned message text passed validator for pricing analysis");
            return json;
          } else {
            console.log("JSON from cleaned message text failed validator for pricing analysis");
          }
        } else {
          return json; // Return any valid JSON if no validator
        }
      }
    } catch (e) {
      console.log("Failed to parse JSON from cleaned message text:", e.message);
    }

    console.warn("No valid pricing analysis JSON found in the last assistant message.");
    return null;
  }

  // Export functions to global scope
  window.PricingAnalyzer = {
    createPricingAnalysisButton,
    handlePricingAnalysis,
    createPricingModal,
    updatePricingModalContent,
    attachPricingAnalysisListeners,
    extractLastJSONFromChatGPT
  };

})(); 