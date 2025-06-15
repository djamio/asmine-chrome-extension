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
      console.log('Starting new pricing analysis request with ID:', requestId);

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
- Title: ${product.title || product.name}
- Description: ${product.description || product.short_description || 'No description available'}
- Current Price: $${product.price || 0}
- specifications: ${JSON.stringify(product.specifications || [])}

Return your answer in the following **JSON format**:

{
  "currentProduct": {
    "title": "${product.title || product.name}",
    "price": ${product.price || 0},
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
 also make sure to do the research on the country associated to the language of the product`;

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
      pricingObserver = new MutationObserver((mutations) => {
        console.log('Pricing Analysis MutationObserver triggered, mutations:', mutations.length);
        
        // Clear any existing timer
        clearTimeout(debounceTimer);
        
        // Set a new timer to process the latest state
        debounceTimer = setTimeout(() => {
          console.log('Processing final state after mutations for pricing analysis');
          
          // Use the extractLastJSONFromChatGPT function with validator
          const parsed = extractLastJSONFromChatGPT((json) => {
            // Check if this is a valid pricing analysis response for our current product
            const isValidStructure = json && json.currentProduct && json.marketComparisons && json.pricingAnalysis;
            const isForCurrentProduct = json.currentProduct && json.currentProduct.title === (product.title || product.name);
            
            console.log('Validating pricing analysis JSON:', {
              isValidStructure,
              isForCurrentProduct,
              expectedTitle: product.title || product.name,
              actualTitle: json.currentProduct ? json.currentProduct.title : 'none'
            });
            
            return isValidStructure && isForCurrentProduct;
          });
          
          if (parsed) {
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
                requestId: requestId
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
    // Check if modal already exists
    if (document.getElementById('pricingModal')) {
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners for modal
    const modal = document.getElementById('pricingModal');
    const closeBtn = modal.querySelector('.close-pricing-modal');
    const tabBtns = modal.querySelectorAll('.pricing-tab-btn');

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.pricing-tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        btn.classList.add('active');
        const tabId = 'tab-' + btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Function to update pricing modal content
  function updatePricingModalContent(modal, product, analysisResults) {
    if (!modal || !product || !analysisResults) {
      console.error('Missing required data for pricing modal update:', { modal, product, analysisResults });
      return;
    }

    // Update current product tab
    document.getElementById('current-title').textContent = analysisResults.currentProduct.title;
    document.getElementById('current-price').textContent = `$${analysisResults.currentProduct.price}`;
    document.getElementById('current-analysis').textContent = analysisResults.currentProduct.analysis;

    // Update market comparisons tab
    const comparisonsList = document.getElementById('comparisons-list');
    comparisonsList.innerHTML = analysisResults.marketComparisons.map(comparison => `
      <div class="comparison-item">
        <h4>${comparison.title}</h4>
        <p><strong>Price:</strong> $${comparison.price}</p>
        <p><strong>URL:</strong> <a href="${comparison.productUrl}" target="_blank" rel="noopener noreferrer">View Product</a></p>
      </div>
    `).join('');

    // Update pricing analysis tab
    const positionBadge = document.getElementById('pricing-position');
    positionBadge.textContent = analysisResults.pricingAnalysis.pricingPosition;
    positionBadge.className = `position-badge ${analysisResults.pricingAnalysis.pricingPosition}`;

    document.getElementById('suggested-price').textContent = `$${analysisResults.pricingAnalysis.suggestedPrice}`;
    document.getElementById('price-difference').textContent = `$${analysisResults.pricingAnalysis.priceDifference}`;
    document.getElementById('percentage-change').textContent = `${analysisResults.pricingAnalysis.priceDifferencePercentage}%`;
    document.getElementById('recommendation-text').textContent = analysisResults.pricingAnalysis.recommendation;
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

    const codeBlocks = lastMessage.querySelectorAll('pre code');

    for (const code of codeBlocks) {
      try {
        // Attempt to parse the content as JSON
        const text = code.textContent.trim();

        // Use regex to isolate the JSON if extra characters exist before/after
        const match = text.match(/{[\s\S]*}/);
        if (match) {
          const json = JSON.parse(match[0]);
          console.log("Extracted JSON from last message:", json);
          
          // If a validator function is provided, use it to check the JSON structure
          if (validator && typeof validator === 'function') {
            if (validator(json)) {
              console.log("JSON passed validator for pricing analysis");
              return json;
            } else {
              console.log("JSON failed validator for pricing analysis");
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