// Product Market Research - Chrome Extension Feature
// This module handles product market research using ChatGPT

(function() {
  'use strict';

  // Global variables for market research
  let currentResearchRequest = null;
  let researchObserver = null;

  // Function to create market research button
  function createMarketResearchButton(productId) {
    return `
      <button class="market-research-btn" data-product-id="${productId}" title="Market Research Analysis">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/>
        </svg>
      </button>
    `;
  }

  // Function to handle market research prompt generation and response
  async function handleMarketResearch(btn, product) {
    try {
      // Disable button and show loading state with spinner
      btn.disabled = true;
      btn.innerHTML = `
        <div class="loading-spinner-small"></div>
      `;

      // Generate a unique request ID for this specific request
      const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      console.log('Starting new market research request with ID:', requestId);

      // Store the request start time to track when this request was initiated
      const requestStartTime = Date.now();
      console.log('Starting new market research request at:', requestStartTime);

      const prompt = `You are a product market research assistant.

I will provide you with a product's title and description. Your task is to:

Search for at least 3 best-selling or trending  products on the same niche available now on the market (e.g.,  aliexpress, temu, Amazon, eBay, Walmart, Shein, etc.).

Return for each product:
   - Title
   - Price
   - Product URL
   - Platform (e.g., Amazon, Walmart, etc.)
   - Number of reviews (if available)
   - Rating (out of 5, if available)
   - gallery images (if available)
   - description
   - specifications
  

Highlight why these products are considered popular at the moment (e.g., seasonal trend, TikTok virality, influencer use, etc.).

Suggest how the current product could be positioned to align with these trends (e.g., tweak description, change imagery, bundle offers).

Product Details:
- Title: ${product.title || product.name}
- Description: ${product.description || product.short_description || 'No description available'}
- Specifications: ${JSON.stringify(product.specifications || [])}

Return your output in the following JSON format:

{
  "currentProduct": {
    "title": "${product.title || product.name}",
    "analysis": "Brief assessment of current product's alignment with current market trends."
  },
  "trendingComparisons": [
    {
      "title": "Best-Selling Product Title",
      "price": 25.00,
      "productUrl": "https://example.com/product1",
      "platform": "Amazon",
      "rating": 4.5,
      "reviews": 1200,
      "galleryImages": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "description": "Detailed product description with features and benefits...",
      "specifications": [
        "Material: High-quality fabric",
        "Size: One size fits all",
        "Color: Multiple options available"
      ]
    }
  ],
  "trendAnalysis": {
    "seasonalRelevance": "summer|winter|year-round",
    "popularityReason": "e.g., Tiktok trend, Y2K comeback, breathable fabric for heat, etc.",
    "recommendation": "How to better position the product (e.g., update title, add new image, bundle accessories)"
  }
}

Please ensure the response is valid JSON and includes all required fields.
 also make sure that the product url are valid url and are not redirecting to product not found page
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
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/></svg>`;
        // Show warning notification
        showNotification('warning', 'Timeout', 'No valid market research response received from ChatGPT after 15 seconds. Please try again or rephrase your prompt.');
      }, 15000);

      researchObserver = new MutationObserver((mutations) => {
        console.log('Market Research MutationObserver triggered, mutations:', mutations.length);
        
        // Clear any existing timer
        clearTimeout(debounceTimer);
        
        // Set a new timer to process the latest state
        debounceTimer = setTimeout(() => {
          console.log('Processing final state after mutations for market research');
          
          // Use the extractLastJSONFromChatGPT function with validator
          const parsed = extractLastJSONFromChatGPT((json) => {
            try {
                // Check if this is a valid market research response
                if (!json || typeof json !== 'object') {
                    console.log('Invalid JSON: not an object');
                    return false;
                }

                // Check required fields
                const hasRequiredFields = 
                    json.currentProduct && 
                    json.trendingComparisons && 
                    json.trendAnalysis &&
                    Array.isArray(json.trendingComparisons);

                if (!hasRequiredFields) {
                    console.log('Invalid JSON: missing required fields', {
                        hasCurrentProduct: !!json.currentProduct,
                        hasTrendingComparisons: !!json.trendingComparisons,
                        hasTrendAnalysis: !!json.trendAnalysis,
                        isTrendingComparisonsArray: Array.isArray(json.trendingComparisons)
                    });
                    return false;
                }

                // Check if this is for our current product
                const currentProductTitle = (product.title || product.name || '').trim().toLowerCase();
                const jsonProductTitle = (json.currentProduct.title || '').trim().toLowerCase();
                
                const isForCurrentProduct = currentProductTitle === jsonProductTitle;
                
                console.log('Validating market research JSON:', {
                    hasRequiredFields,
                    isForCurrentProduct,
                    expectedTitle: currentProductTitle,
                    actualTitle: jsonProductTitle
                });
                
                return isForCurrentProduct;
            } catch (error) {
                console.error('Error validating JSON:', error);
                return false;
            }
          });
          
          if (parsed) {
            // If valid JSON is found, clear the timeout
            clearTimeout(timeoutTimer);
            console.log('Found valid market research results JSON:', parsed);
            
            // Check if this result is from our current request by checking the timestamp
            const currentTime = Date.now();
            const timeSinceRequest = currentTime - requestStartTime;
            
            // Only process results that came after our request started (with a small buffer)
            // and ensure we're not processing old responses
            if (timeSinceRequest > 3000) { // At least 3 seconds after request started
              console.log('Processing market research results from current request (time since request:', timeSinceRequest, 'ms)');
                    
              // Store the market research results and product data
              const researchData = {
                analysis: parsed,
                product: product,
                timestamp: Date.now(),
                requestId: requestId
              };
              localStorage.setItem(`research_${product.id}`, JSON.stringify(researchData));

              // Automatically show the market research modal
              try {
                console.log('Attempting to show market research modal...');
                
                // Create modal if it doesn't exist
                if (!document.getElementById('marketResearchModal')) {
                  console.log('Market research modal does not exist, creating it...');
                  createMarketResearchModal();
                } else {
                  console.log('Market research modal already exists');
                }
                
                // Get modal after ensuring it exists
                const modal = document.getElementById('marketResearchModal');
                if (!modal) {
                  console.error('Failed to create or find market research modal');
                  return;
                }

                console.log('Found market research modal, showing it...');
                // Show modal
                modal.style.display = 'block';
                console.log('Modal display set to block');

                // Update modal content with fresh market research results
                console.log('Updating modal content...');
                updateMarketResearchModalContent(modal, product, parsed);
                console.log('Modal content updated');
                
                console.log('Market research modal automatically displayed for request:', requestId);
              } catch (modalError) {
                console.error('Error showing market research modal:', modalError);
                console.error('Modal error stack:', modalError.stack);
              }

              // Reset market research button state
              btn.disabled = false;
              btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/>
                </svg>
              `;

              // Disconnect the observer since we've found and processed the response
              researchObserver.disconnect();
            } else {
              console.log('Ignoring market research results from previous request (time since request:', timeSinceRequest, 'ms)');
            }
          } else {
            console.log('No valid market research JSON found yet, continuing to wait...');
          }
        }, 1000); // Wait 1 second after last mutation before processing
      });

      // Start observing ChatGPT's response area
      console.log('Setting up market research observer for request:', requestId);
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
        console.log('Starting observation of target node for market research');
        researchObserver.observe(targetNode, { 
          childList: true,
          subtree: true,
          characterData: true,
          characterDataOldValue: true
        });
      } else {
        console.error('Could not find any suitable target node for market research observation');
        // Reset button states if we couldn't find the target node
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/>
          </svg>
        `;
      }

    } catch (error) {
      console.error('Error in handleMarketResearch:', error);
      // Ensure button is always reset on any error
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/>
        </svg>
      `;
    }
  }

  // Function to create market research modal
  function createMarketResearchModal() {
    console.log('Creating market research modal...');
    
    // Check if modal already exists
    if (document.getElementById('marketResearchModal')) {
        console.log('Market research modal already exists, skipping creation');
        return;
    }

    const modalHTML = `
      <div id="marketResearchModal" class="modal">
        <div class="market-research-modal">
          <div class="modal-header">
            <h2>Product Market Research</h2>
            <span class="close-market-research-modal">&times;</span>
          </div>
          <div class="modal-content">
            <div class="market-research-tabs">
              <button class="market-research-tab-btn active" data-tab="current">Current Product</button>
              <button class="market-research-tab-btn" data-tab="trending">Trending Products</button>
              <button class="market-research-tab-btn" data-tab="analysis">Trend Analysis</button>
            </div>
            
            <div id="market-tab-current" class="market-research-tab-content active" style="display: block;">
              <div class="current-product-info">
                <h3>Current Product Details</h3>
                <div class="product-details">
                  <p><strong>Title:</strong> <span id="market-current-title"></span></p>
                  <p><strong>Analysis:</strong> <span id="market-current-analysis"></span></p>
                </div>
              </div>
            </div>
            
            <div id="market-tab-trending" class="market-research-tab-content" style="display: none;">
              <div class="trending-products">
                <h3>Trending Products</h3>
                <div id="market-trending-list" class="trending-grid">
                  <!-- Trending products will be populated here -->
                </div>
              </div>
            </div>
            
            <div id="market-tab-analysis" class="market-research-tab-content" style="display: none;">
              <div class="trend-analysis-details">
                <h3>Trend Analysis</h3>
                <div class="analysis-summary">
                  <div class="seasonal-relevance">
                    <h4>Seasonal Relevance</h4>
                    <span id="market-seasonal-relevance" class="seasonal-badge"></span>
                  </div>
                  <div class="popularity-reason">
                    <h4>Popularity Reason</h4>
                    <p id="market-popularity-reason"></p>
                  </div>
                  <div class="recommendation-text">
                    <h4>Recommendation</h4>
                    <p id="market-recommendation-text"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Market research modal HTML inserted into body');

    // Add event listeners for modal
    const modal = document.getElementById('marketResearchModal');
    console.log('Found created modal:', modal);
    
    if (!modal) {
        console.error('Failed to find market research modal after creation');
        return;
    }
    
    const closeBtn = modal.querySelector('.close-market-research-modal');
    const tabBtns = modal.querySelectorAll('.market-research-tab-btn');
    
    console.log('Found modal elements:', { closeBtn, tabBtns: tabBtns.length });

    closeBtn.addEventListener('click', () => {
        console.log('Closing market research modal');
        modal.style.display = 'none';
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Switching to tab:', btn.getAttribute('data-tab'));
            
            // Remove active class from all tabs and hide all content
            tabBtns.forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.market-research-tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active class to clicked tab and show its content
            btn.classList.add('active');
            const tabId = 'market-tab-' + btn.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            console.log('Activating tab content:', tabId, tabContent);
            
            if (tabContent) {
                tabContent.classList.add('active');
                tabContent.style.display = 'block';
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            console.log('Closing market research modal (clicked outside)');
            modal.style.display = 'none';
        }
    });
    
    console.log('Market research modal created successfully with event listeners');
  }

  // Function to update market research modal content
  function updateMarketResearchModalContent(modal, product, analysisResults) {
    if (!modal || !product || !analysisResults) {
        console.error('Missing required data for market research modal update:', { modal, product, analysisResults });
        return;
    }

    console.log('Updating market research modal content with:', { product, analysisResults });

    // Update current product tab
    const currentTitleElement = document.getElementById('market-current-title');
    const currentAnalysisElement = document.getElementById('market-current-analysis');
    
    if (currentTitleElement && analysisResults.currentProduct) {
        currentTitleElement.textContent = analysisResults.currentProduct.title || product.title || product.name;
        console.log('Updated current product title:', currentTitleElement.textContent);
    }
    
    if (currentAnalysisElement && analysisResults.currentProduct) {
        currentAnalysisElement.textContent = analysisResults.currentProduct.analysis || 'No analysis available';
        console.log('Updated current product analysis:', currentAnalysisElement.textContent);
    }

    // Update trending products tab
    const trendingList = document.getElementById('market-trending-list');
    if (trendingList && analysisResults.trendingComparisons && Array.isArray(analysisResults.trendingComparisons)) {
        console.log('Updating trending products list with', analysisResults.trendingComparisons.length, 'products');
        
        trendingList.innerHTML = analysisResults.trendingComparisons.map((trendingProduct, index) => {
            console.log('Processing trending product', index + 1, ':', trendingProduct.title);
            
            // Handle description
            let descriptionHTML = '';
            if (trendingProduct.description) {
                descriptionHTML = `
                    <div class="product-description">
                        <h5>Description:</h5>
                        <p>${trendingProduct.description}</p>
                    </div>
                `;
            }

            // Handle specifications
            let specificationsHTML = '';
            if (trendingProduct.specifications && Array.isArray(trendingProduct.specifications) && trendingProduct.specifications.length > 0) {
                specificationsHTML = `
                    <div class="product-specifications">
                        <h5>Specifications:</h5>
                        <ul>
                            ${trendingProduct.specifications.map(spec => `<li>${spec}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            return `
                <div class="trending-item">
                    <h4>${trendingProduct.title || 'No title'}</h4>
                    <div class="product-stats">
                        <p><strong>Price:</strong> ${trendingProduct.price ? '€' + trendingProduct.price : 'N/A'}</p>
                        <p><strong>Platform:</strong> ${trendingProduct.platform || 'N/A'}</p>
                        <p><strong>Rating:</strong> ${trendingProduct.rating ? trendingProduct.rating + '/5' : 'N/A'} ${trendingProduct.reviews ? '(' + trendingProduct.reviews + ' reviews)' : ''}</p>
                    </div>
                    ${descriptionHTML}
                    ${specificationsHTML}
                    <p><strong>URL:</strong> <a href="${trendingProduct.productUrl || '#'}" target="_blank" rel="noopener noreferrer">View Product</a></p>
                </div>
            `;
        }).join('');
        
        console.log('Updated trending products list');
    }

    // Update trend analysis tab
    if (analysisResults.trendAnalysis) {
        console.log('Updating trend analysis tab');
        
        const seasonalBadge = document.getElementById('market-seasonal-relevance');
        const popularityReasonElement = document.getElementById('market-popularity-reason');
        const recommendationElement = document.getElementById('market-recommendation-text');
        
        if (seasonalBadge && analysisResults.trendAnalysis.seasonalRelevance) {
            seasonalBadge.textContent = analysisResults.trendAnalysis.seasonalRelevance;
            seasonalBadge.className = `seasonal-badge ${analysisResults.trendAnalysis.seasonalRelevance.replace(/\s+/g, '-').toLowerCase()}`;
            console.log('Updated seasonal relevance:', seasonalBadge.textContent);
        }
        
        if (popularityReasonElement && analysisResults.trendAnalysis.popularityReason) {
            popularityReasonElement.textContent = analysisResults.trendAnalysis.popularityReason;
            console.log('Updated popularity reason');
        }
        
        if (recommendationElement && analysisResults.trendAnalysis.recommendation) {
            recommendationElement.textContent = analysisResults.trendAnalysis.recommendation;
            console.log('Updated recommendation');
        }
    }

    // Ensure the first tab is visible
    const firstTab = modal.querySelector('.market-research-tab-btn');
    if (firstTab) {
        firstTab.click();
    }
  }

  // Function to attach market research button listeners
  function attachMarketResearchListeners(products, isBulkOperationsActive = false) {
    const targetResultsDiv = isBulkOperationsActive ? 
      document.getElementById('auditResultsBulk') : 
      document.getElementById('auditResults');
    
    if (!targetResultsDiv) return;
    
    const buttons = targetResultsDiv.querySelectorAll('.market-research-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => handleMarketResearch(btn, products[i]));
    });
  }

  // Function to extract JSON from ChatGPT's last response (reuse from main file)
  function extractLastJSONFromChatGPT(validator = null) {
    // Get all messages from the conversation
    const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));

    if (messages.length === 0) {
        console.log("No assistant messages found for market research");
        return null;
    }

    // Only look at the most recent assistant message
    const lastMessage = messages[messages.length - 1];
    console.log("Checking last assistant message for market research JSON");

    // Method 1: Try to extract JSON from code blocks first
    const codeBlocks = lastMessage.querySelectorAll('pre code');
    console.log("Found", codeBlocks.length, "code blocks in last message");

    for (const code of codeBlocks) {
        try {
            const text = code.textContent.trim();
            console.log("Attempting to parse code block:", text.substring(0, 100) + "...");

            // Try to find JSON object in the text
            let jsonText = text;
            
            // If there's text before/after JSON, try to extract just the JSON
            const jsonMatch = text.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                jsonText = jsonMatch[1];
            }

            // Try to parse the JSON
            const json = JSON.parse(jsonText);
            console.log("Successfully parsed JSON from code block");

            // If a validator function is provided, use it to check the JSON structure
            if (validator && typeof validator === 'function') {
                if (validator(json)) {
                    console.log("JSON passed validator for market research");
                    return json;
                } else {
                    console.log("JSON failed validator for market research");
                }
            } else {
                return json;
            }
        } catch (e) {
            console.log("Failed to parse JSON from code block:", e.message);
            continue;
        }
    }

    // Method 2: Try to extract JSON from HTML-formatted content
    try {
        const messageHTML = lastMessage.innerHTML;
        console.log("Attempting to extract JSON from HTML-formatted content for market research");
        
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
            console.log("Extracted JSON from HTML-formatted content for market research:", json);
            
            // If a validator function is provided, use it to check the JSON structure
            if (validator && typeof validator === 'function') {
                if (validator(json)) {
                    console.log("JSON from HTML-formatted content passed validator for market research");
                    return json;
                } else {
                    console.log("JSON from HTML-formatted content failed validator for market research");
                }
            } else {
                return json; // Return any valid JSON if no validator
            }
        }
    } catch (e) {
        console.log("Failed to parse JSON from HTML-formatted content for market research:", e.message);
    }

    // Method 3: Try to extract JSON from the entire message text (for raw JSON responses)
    try {
        const messageText = lastMessage.textContent.trim();
        console.log("Attempting to parse entire message text for market research");
        
        // Try to find JSON object in the message
        const jsonMatch = messageText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
            const jsonText = jsonMatch[1];
            const json = JSON.parse(jsonText);
            console.log("Successfully parsed JSON from message text for market research");

            if (validator && typeof validator === 'function') {
                if (validator(json)) {
                    console.log("JSON passed validator for market research");
                    return json;
                }
            } else {
                return json;
            }
        }
    } catch (e) {
        console.log("Failed to parse JSON from message text for market research:", e.message);
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
            console.log("Extracted JSON from cleaned message text for market research:", json);
            
            // If a validator function is provided, use it to check the JSON structure
            if (validator && typeof validator === 'function') {
                if (validator(json)) {
                    console.log("JSON from cleaned message text passed validator for market research");
                    return json;
                } else {
                    console.log("JSON from cleaned message text failed validator for market research");
                }
            } else {
                return json; // Return any valid JSON if no validator
            }
        }
    } catch (e) {
        console.log("Failed to parse JSON from cleaned message text for market research:", e.message);
    }

    console.warn("No valid market research JSON found in the last assistant message.");
    return null;
  }

  // Function to test modal display (for debugging)
  function testMarketResearchModal() {
    console.log('Testing market research modal display...');
    
    // Create modal if it doesn't exist
    if (!document.getElementById('marketResearchModal')) {
      console.log('Creating market research modal for test...');
      createMarketResearchModal();
    }
    
    const modal = document.getElementById('marketResearchModal');
    if (modal) {
      console.log('Modal found, displaying test content...');
      
      // Show modal
      modal.style.display = 'block';
      
      // Add test content
      const currentTitleElement = document.getElementById('market-current-title');
      const currentAnalysisElement = document.getElementById('market-current-analysis');
      const trendingList = document.getElementById('market-trending-list');
      const seasonalBadge = document.getElementById('market-seasonal-relevance');
      const popularityReasonElement = document.getElementById('market-popularity-reason');
      const recommendationElement = document.getElementById('market-recommendation-text');
      
      if (currentTitleElement) currentTitleElement.textContent = 'Test Product';
      if (currentAnalysisElement) currentAnalysisElement.textContent = 'This is a test of the market research modal display.';
      if (trendingList) trendingList.innerHTML = `
        <div class="trending-item">
          <h4>Test Trending Product</h4>
          <div class="product-stats">
            <p><strong>Price:</strong> $29.99</p>
            <p><strong>Platform:</strong> Amazon</p>
            <p><strong>Rating:</strong> 4.5/5 (150 reviews)</p>
          </div>
          <div class="product-gallery">
            <h5>Gallery Images:</h5>
            <div class="gallery-grid">
              <img src="https://via.placeholder.com/80x80/8B5CF6/FFFFFF?text=IMG1" alt="Product image" class="gallery-image">
              <img src="https://via.placeholder.com/80x80/8B5CF6/FFFFFF?text=IMG2" alt="Product image" class="gallery-image">
            </div>
          </div>
          <div class="product-description">
            <h5>Description:</h5>
            <p>This is a test product description with detailed information about the product features and benefits.</p>
          </div>
          <div class="product-specifications">
            <h5>Specifications:</h5>
            <ul>
              <li>Material: High-quality fabric</li>
              <li>Size: One size fits all</li>
              <li>Color: Multiple options available</li>
            </ul>
          </div>
          <p><strong>URL:</strong> <a href="#" target="_blank" rel="noopener noreferrer">View Product</a></p>
        </div>
      `;
      if (seasonalBadge) {
        seasonalBadge.textContent = 'year-round';
        seasonalBadge.className = 'seasonal-badge year-round';
      }
      if (popularityReasonElement) popularityReasonElement.textContent = 'Test popularity reason.';
      if (recommendationElement) recommendationElement.textContent = 'Test recommendation.';
      
      console.log('Test modal should now be visible with content');
      console.log('Modal element:', modal);
      console.log('Modal computed style display:', window.getComputedStyle(modal).display);
    } else {
      console.error('Failed to create or find modal for test');
    }
  }

  // Function to test button reset
  function testButtonReset() {
    console.log('Testing button reset functionality...');
    const buttons = document.querySelectorAll('.market-research-btn');
    buttons.forEach((btn, index) => {
      console.log(`Resetting button ${index}...`);
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-1.94-3.07M9 19v-3.87a3.37 3.37 0 0 1 1.94-3.07M9 19v-6m0 0V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v0m-6 0h6m-6 0H9"/>
        </svg>
      `;
    });
    console.log('All market research buttons have been reset');
  }

  // Export functions to global scope
  window.MarketResearch = {
    createMarketResearchButton,
    handleMarketResearch,
    createMarketResearchModal,
    updateMarketResearchModalContent,
    attachMarketResearchListeners,
    extractLastJSONFromChatGPT,
    testMarketResearchModal,
    testButtonReset
  };

  // Log instructions for testing
  console.log('Market Research module loaded. To test:');
  console.log('- Test modal: window.MarketResearch.testMarketResearchModal()');
  console.log('- Test button reset: window.MarketResearch.testButtonReset()');

})(); 