(function() {
  'use strict';

  let reviewObserver = null;

  // Function to create review generator button
  function createReviewGeneratorButton(productId) {
    return `
      <button class="review-generator-btn" data-product-id="${productId}" title="Generate Product Reviews">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Generate Reviews
      </button>
    `;
  }

  // Function to handle review generation
  async function handleReviewGeneration(btn, product) {
    try {
      // Disable button and show loading state with spinner
      btn.disabled = true;
      btn.innerHTML = `
        <div class="loading-spinner-small"></div>
      `;

      // Generate a unique request ID for this specific request
      const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      console.log('Starting new review generation request with ID:', requestId);

      // Store the request start time to track when this request was initiated
      const requestStartTime = Date.now();
      console.log('Starting new review generation request at:', requestStartTime);

      const prompt = `You are a product reviewer simulator.

Given the following product information:
- Title: ${product.title || product.name}
- Description: ${product.description || product.short_description || 'No description available'}
- Specifications: ${JSON.stringify(product.specifications || [])}

Generate 5 realistic product reviews as JSON. Each review should include:
- reviewerName: A realistic-sounding name
- review: A short, natural-sounding review text (2–4 sentences) relevant to the product
- rating: Integer from 1 to 5
- creationDate: A realistic date in the last 6 months in YYYY-MM-DD format

Return the response in the following format:

[
  {
    "reviewerName": "string",
    "review": "string",
    "rating": number,
    "creationDate": "date"
  }
]

Please ensure the response is valid JSON and includes exactly 5 reviews with all required fields. make sure you use the same lanuguage 
as the product description and title`;

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
      reviewObserver = new MutationObserver((mutations) => {
        console.log('Review Generation MutationObserver triggered, mutations:', mutations.length);
        
        // Clear any existing timer
        clearTimeout(debounceTimer);
        
        // Set a new timer to process the latest state
        debounceTimer = setTimeout(() => {
          console.log('Processing final state after mutations for review generation');
          
          // Use the extractLastJSONFromChatGPT function with validator
          const parsed = extractLastJSONFromChatGPT((json) => {
            // Check if this is a valid review generation response
            const isValidStructure = Array.isArray(json) && json.length === 5;
            const hasValidReviews = json.every(review => 
              review.reviewerName && 
              review.review && 
              review.rating && 
              review.creationDate &&
              typeof review.rating === 'number' &&
              review.rating >= 1 && 
              review.rating <= 5
            );
            
            console.log('Validating review generation JSON:', {
              isValidStructure,
              hasValidReviews,
              reviewCount: json ? json.length : 0
            });
            
            return isValidStructure && hasValidReviews;
          });
          
          if (parsed) {
            console.log('Found valid review generation results JSON:', parsed);
            
            // Check if this result is from our current request by checking the timestamp
            const currentTime = Date.now();
            const timeSinceRequest = currentTime - requestStartTime;
            
            // Only process results that came after our request started (with a small buffer)
            if (timeSinceRequest > 3000) { // At least 3 seconds after request started
              console.log('Processing review generation results from current request (time since request:', timeSinceRequest, 'ms)');
                    
              // Store the review generation results and product data
              const reviewData = {
                reviews: parsed,
                product: product,
                timestamp: Date.now(),
                requestId: requestId
              };
              localStorage.setItem(`reviews_${product.id}`, JSON.stringify(reviewData));

              // Automatically show the review generation modal
              try {
                console.log('Attempting to show review generation modal...');
                
                // Create modal if it doesn't exist
                if (!document.getElementById('reviewGeneratorModal')) {
                  console.log('Review generation modal does not exist, creating it...');
                  createReviewGeneratorModal();
                } else {
                  console.log('Review generation modal already exists');
                }
                
                // Get modal after ensuring it exists
                const modal = document.getElementById('reviewGeneratorModal');
                if (!modal) {
                  console.error('Failed to create or find review generation modal');
                  return;
                }

                console.log('Found review generation modal, showing it...');
                // Show modal
                modal.style.display = 'block';
                console.log('Modal display set to block');

                // Update modal content with fresh review generation results
                console.log('Updating modal content...');
                updateReviewGeneratorModalContent(modal, product, parsed);
                console.log('Modal content updated');
                
                console.log('Review generation modal automatically displayed for request:', requestId);
              } catch (modalError) {
                console.error('Error showing review generation modal:', modalError);
                console.error('Modal error stack:', modalError.stack);
              }

              // Reset review generation button state
              btn.disabled = false;
              btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              `;

              // Disconnect the observer since we've found and processed the response
              reviewObserver.disconnect();
            } else {
              console.log('Ignoring review generation results from previous request (time since request:', timeSinceRequest, 'ms)');
            }
          } else {
            console.log('No valid review generation JSON found yet, continuing to wait...');
          }
        }, 1000); // Wait 1 second after last mutation before processing
      });

      // Start observing ChatGPT's response area
      console.log('Setting up review generation observer for request:', requestId);
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
        console.log('Starting observation of target node for review generation');
        reviewObserver.observe(targetNode, { 
          childList: true,
          subtree: true,
          characterData: true,
          characterDataOldValue: true
        });
      } else {
        console.error('Could not find any suitable target node for review generation observation');
        // Reset button states if we couldn't find the target node
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        `;
      }

    } catch (error) {
      console.error('Error in handleReviewGeneration:', error);
      // Ensure button is always reset on any error
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `;
    }
  }

  // Function to create review generator modal
  function createReviewGeneratorModal() {
    console.log('Creating review generator modal...');
    
    // Check if modal already exists
    if (document.getElementById('reviewGeneratorModal')) {
      console.log('Review generator modal already exists, skipping creation');
      return;
    }

    const modalHTML = `
      <div id="reviewGeneratorModal" class="modal">
        <div class="review-generator-modal">
          <div class="modal-header">
            <h2>Generated Product Reviews</h2>
            <span class="close-review-generator-modal">&times;</span>
          </div>
          <div class="modal-content">
            <div class="reviews-container">
              <div class="reviews-header">
                <h3>Generated Reviews</h3>
                <p>Edit the reviews below and click "Insert Reviews" to add them to your product.</p>
              </div>
              <div id="reviews-list" class="reviews-list">
                <!-- Reviews will be populated here -->
              </div>
              <div class="reviews-actions">
                <button id="insert-reviews-btn" class="insert-reviews-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Insert Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Review generator modal HTML inserted into body');

    // Add event listeners for modal
    const modal = document.getElementById('reviewGeneratorModal');
    console.log('Found created modal:', modal);
    
    if (!modal) {
      console.error('Failed to find review generator modal after creation');
      return;
    }
    
    const closeBtn = modal.querySelector('.close-review-generator-modal');
    const insertBtn = modal.querySelector('#insert-reviews-btn');
    
    console.log('Found modal elements:', { closeBtn, insertBtn });

    closeBtn.addEventListener('click', () => {
      console.log('Closing review generator modal');
      modal.style.display = 'none';
    });

    insertBtn.addEventListener('click', () => {
      console.log('Inserting reviews...');
      insertReviewsToBackend();
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        console.log('Closing review generator modal (clicked outside)');
        modal.style.display = 'none';
      }
    });
    
    console.log('Review generator modal created successfully with event listeners');
  }

  // Function to update review generator modal content
  function updateReviewGeneratorModalContent(modal, product, reviews) {
    if (!modal || !product || !reviews) {
      console.error('Missing required data for review generator modal update:', { modal, product, reviews });
      return;
    }

    console.log('Updating review generator modal content with', reviews.length, 'reviews');

    // Store product ID in modal for later use
    modal.setAttribute('data-product-id', product.id);

    // Update reviews list
    const reviewsList = document.getElementById('reviews-list');
    if (reviewsList && Array.isArray(reviews)) {
      reviewsList.innerHTML = reviews.map((review, index) => `
        <div class="review-item" data-review-index="${index}">
          <div class="review-header">
            <div class="review-meta">
              <input type="text" class="reviewer-name" value="${review.reviewerName}" placeholder="Reviewer Name">
              <div class="review-rating">
                <label>Rating:</label>
                <select class="rating-select">
                  ${[1, 2, 3, 4, 5].map(rating => 
                    `<option value="${rating}" ${rating === review.rating ? 'selected' : ''}>${rating}</option>`
                  ).join('')}
                </select>
              </div>
              <input type="date" class="review-date" value="${review.creationDate}">
            </div>
          </div>
          <div class="review-content">
            <textarea class="review-text" placeholder="Review text...">${review.review}</textarea>
          </div>
        </div>
      `).join('');
    }
  }

  // Function to insert reviews to backend
  async function insertReviewsToBackend() {
    try {
      console.log('Starting to insert reviews to backend...');
      
      // Get all reviews from the modal
      const reviewItems = document.querySelectorAll('.review-item');
      const allReviews = Array.from(reviewItems).map(item => {
        const index = item.getAttribute('data-review-index');
        const reviewerName = item.querySelector('.reviewer-name').value;
        const rating = parseInt(item.querySelector('.rating-select').value);
        const creationDate = item.querySelector('.review-date').value;
        const review = item.querySelector('.review-text').value;
        
        return {
          reviewerName,
          rating,
          creationDate,
          review
        };
      });

      console.log('Collected reviews:', allReviews);

      // Get product ID from the modal
      const modal = document.getElementById('reviewGeneratorModal');
      const productId = modal.getAttribute('data-product-id');

      if (!productId) {
        throw new Error('Product ID not found');
      }

      // Get WooCommerce credentials from storage
      const auth = JSON.parse(localStorage.getItem('wooAuth'));
      if (!auth || !auth.wooAuth) {
        throw new Error('WooCommerce authentication not found. Please reconnect to WooCommerce.');
      }

      const credentials = auth.wooAuth;
      if (!credentials.storeUrl || !credentials.consumerKey || !credentials.consumerSecret) {
        throw new Error('Missing WooCommerce credentials. Please reconnect to WooCommerce.');
      }

      // Show loading state
      const insertBtn = document.querySelector('#insert-reviews-btn');
      insertBtn.disabled = true;

      // Split reviews into batches of 5
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < allReviews.length; i += batchSize) {
        batches.push(allReviews.slice(i, i + batchSize));
      }

      console.log(`Sending ${batches.length} batches of reviews (${allReviews.length} total reviews)`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNumber = batchIndex + 1;
        const totalBatches = batches.length;

        // Update button text to show progress
        insertBtn.innerHTML = `
          <div class="loading-spinner-small"></div>
          Inserting Batch ${batchNumber}/${totalBatches}...
        `;

        try {
          console.log(`Sending batch ${batchNumber}/${totalBatches} with ${batch.length} reviews`);

          // Prepare the request payload for this batch
          const payload = {
            reviews: batch
          };

          // Make the API call to your backend
          const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/${productId}/reviews`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-woo-store-url': credentials.storeUrl,
              'x-woo-consumer-key': credentials.consumerKey,
              'x-woo-consumer-secret': credentials.consumerSecret
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();

          if (response.ok && result.success) {
            console.log(`Batch ${batchNumber} inserted successfully:`, result);
            successCount += batch.length;
            
            // Show progress notification
            showNotification(`Batch ${batchNumber}/${totalBatches} inserted successfully!`, 'success');
          } else {
            // Handle API error response
            const errorMessage = result.error || `Failed to insert batch ${batchNumber}. Status: ${response.status}`;
            console.error(`API Error for batch ${batchNumber}:`, errorMessage);
            errorCount += batch.length;
            errors.push(`Batch ${batchNumber}: ${errorMessage}`);
          }

          // Wait 2 seconds before sending the next batch (except for the last batch)
          if (batchIndex < batches.length - 1) {
            console.log('Waiting 2 seconds before sending next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`Error inserting batch ${batchNumber}:`, error);
          errorCount += batch.length;
          errors.push(`Batch ${batchNumber}: ${error.message}`);
        }
      }

      // Show final results
      if (errorCount === 0) {
        // All batches succeeded
        showNotification(`All ${successCount} reviews inserted successfully!`, 'success');
        
        // Close the modal
        const modal = document.getElementById('reviewGeneratorModal');
        if (modal) {
          modal.style.display = 'none';
        }
      } else if (successCount === 0) {
        // All batches failed
        throw new Error(`Failed to insert any reviews. Errors: ${errors.join('; ')}`);
      } else {
        // Partial success
        showNotification(`${successCount} reviews inserted successfully, ${errorCount} failed.`, 'warning');
        
        // Show detailed errors in console
        console.error('Review insertion errors:', errors);
      }

    } catch (error) {
      console.error('Error inserting reviews:', error);
      
      // Show error message
      showNotification(`Failed to insert reviews: ${error.message}`, 'error');
    } finally {
      // Reset button state
      const insertBtn = document.querySelector('#insert-reviews-btn');
      if (insertBtn) {
        insertBtn.disabled = false;
        insertBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Insert Reviews
        `;
      }
    }
  }

  // Function to show notification
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add to notification container
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      });
    }
  }

  // Function to attach review generator button listeners
  function attachReviewGeneratorListeners(products, isBulkOperationsActive = false) {
    const targetResultsDiv = isBulkOperationsActive ? 
      document.getElementById('auditResultsBulk') : 
      document.getElementById('auditResults');
    
    if (!targetResultsDiv) return;
    
    const buttons = targetResultsDiv.querySelectorAll('.review-generator-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => handleReviewGeneration(btn, products[i]));
    });
  }

  // Function to extract JSON from ChatGPT's last response (reuse from main file)
  function extractLastJSONFromChatGPT(validator = null) {
    // Get all messages from the conversation
    const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));

    if (messages.length === 0) {
      console.log("No assistant messages found for review generation");
      return null;
    }

    // Only look at the most recent assistant message
    const lastMessage = messages[messages.length - 1];
    console.log("Checking last assistant message for review generation JSON");

    const codeBlocks = lastMessage.querySelectorAll('pre code');

    console.log("Found", codeBlocks.length, "code blocks in last message");

    for (const code of codeBlocks) {
      try {
        // Attempt to parse the content as JSON
        const text = code.textContent.trim();
        console.log("Attempting to parse code block:", text.substring(0, 100) + "...");

        // Use regex to isolate the JSON if extra characters exist before/after
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const json = JSON.parse(match[0]);
          console.log("Extracted JSON from last message:", json);
          
          // If a validator function is provided, use it to check the JSON structure
          if (validator && typeof validator === 'function') {
            if (validator(json)) {
              console.log("JSON passed validator for review generation");
              return json;
            } else {
              console.log("JSON failed validator for review generation");
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

    console.warn("No valid review generation JSON found in the last assistant message.");
    return null;
  }

  // Export functions to global scope
  window.ReviewGenerator = {
    createReviewGeneratorButton,
    handleReviewGeneration,
    createReviewGeneratorModal,
    updateReviewGeneratorModalContent,
    attachReviewGeneratorListeners,
    extractLastJSONFromChatGPT,
    insertReviewsToBackend
  };

  console.log('Review Generator module loaded successfully');

})(); 