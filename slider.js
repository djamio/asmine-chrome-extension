(() => {
  if (window.hasSliderExtension) return;

  const observer = new MutationObserver((mutations, obs) => {
    const textarea = document.querySelector('textarea');
    if (textarea && !window.hasSliderExtension) {
      window.hasSliderExtension = true;
      injectSlider();
      obs.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });

  let currentPage = 1;
  const productAuditData = new Map();
  let auditResultsDiv;
  let currentAuth = null;

  // Add styles for modal content
  const modalStyles = `
    .comparison-container {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .version-block {
      flex: 1;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }

    .version-block h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .version-block .score {
      font-size: 14px;
      color: #666;
    }

    .content-box {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 10px;
      min-height: 100px;
      max-height: 300px;
      overflow-y: auto;
    }

    .suggested-content[contenteditable="true"] {
      outline: none;
      border: 1px solid #e0e0e0;
      padding: 8px;
      border-radius: 4px;
      background: #fff;
      min-height: 100px;
    }

    .suggested-content[contenteditable="true"]:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
    }

    .apply-changes-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
      transition: all 0.3s ease;
    }

    .apply-changes-btn:hover {
      background: #0056b3;
    }

    .apply-changes-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .apply-changes-btn.loading {
      background: #ccc;
      position: relative;
    }

    .apply-changes-btn.success {
      background: #28a745;
    }

    .apply-changes-btn.error {
      background: #dc3545;
    }

    .analysis-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }

    .analysis-section h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .analysis-section p {
      margin: 0;
      color: #666;
    }

    .category-tag, .tag {
      display: inline-block;
      padding: 4px 8px;
      margin: 2px;
      border-radius: 4px;
      font-size: 12px;
    }

    .category-tag {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
    }

    .tag {
      background: #f3e5f5;
      color: #7b1fa2;
      border: 1px solid #e1bee7;
    }

    .specification-item {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .specification-item:last-child {
      border-bottom: none;
    }

    .specification-item strong {
      display: block;
      margin-bottom: 4px;
      color: #333;
    }

    .global-analysis {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }

    .global-analysis h3 {
      margin: 0 0 20px 0;
      color: #333;
      text-align: center;
    }

    .analysis-content {
      background: white;
      border-radius: 6px;
      padding: 15px;
    }

    .analysis-content h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .improvements-list {
      margin: 10px 0;
      padding-left: 20px;
    }

    .improvements-list li {
      margin-bottom: 8px;
      color: #666;
    }
  `;

  // Add styles to the document
  const styleElement = document.createElement('style');
  styleElement.textContent = modalStyles;
  document.head.appendChild(styleElement);

  // Function to fetch products from API
  async function fetchProducts(page = 1) {
    try {
      console.log('Fetching products for page:', page);
      // Check if authorized with WooCommerce first
      const auth = JSON.parse(localStorage.getItem('wooAuth'));
      console.log('Auth state:', auth);
      
      // Store current auth state
      currentAuth = auth.wooAuth;
      
      if (!auth.wooAuth?.isConnected || !auth.wooAuth?.userId) {
        console.log('Not authenticated, showing connect message');
        auditResultsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p>Please connect to WooCommerce first to view products.</p>
            <button id="goToWooAuth" class="btn btn-primary">Go to WooCommerce Connection</button>
          </div>
        `;
        
        // Add click handler for the auth button
        document.getElementById('goToWooAuth')?.addEventListener('click', () => {
          // Switch to WooCommerce auth tab
          const wooAuthTab = document.querySelector('[data-tab="connect"]');
          if (wooAuthTab) {
            wooAuthTab.click();
          }
        });
        
        return null;
      }

      // Add loading state
      auditResultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div class="spinner" style="display: inline-block;">
            <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle class="spinner" cx="12" cy="12" r="10" fill="none" stroke="#96588a" stroke-width="2"/>
            </svg>
          </div>
          <p>Loading WooCommerce products...</p>
        </div>
      `;

      console.log('Making API request with userId:', auth.wooAuth.userId);
      const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-user-id': auth.wooAuth.userId
        }
      });

      console.log('API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API error:', errorData);
        if (response.status === 401 || response.status === 403) {
          // Clear auth state and show connect button
          currentAuth = null;
          localStorage.setItem('wooAuth', JSON.stringify({ isConnected: false, userId: null }));
          throw new Error('Authentication failed. Please reconnect to WooCommerce.');
        }
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (!data.success) {
        console.error('API response indicates failure:', data.error);
        throw new Error(data.error || 'API response indicates failure');
      }

      // Return pagination data along with products
      const result = {
        products: data.products || [],
        totalProducts: data.totalProducts || data.products?.length || 0,
        totalPages: data.totalPages || Math.ceil((data.totalProducts || data.products?.length) / 10),
        itemsPerPage: data.itemsPerPage || 10
      };
      console.log('Processed API response:', result);
      return result;
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      
      // Check if the error is due to authentication
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('authentication')) {
        // Clear auth state and show connect button
        currentAuth = null;
        localStorage.setItem('wooAuth', JSON.stringify({ isConnected: false, userId: null }));
        auditResultsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p>Your WooCommerce connection has expired. Please reconnect.</p>
            <button id="goToWooAuth" class="btn btn-primary">Go to WooCommerce Connection</button>
          </div>
        `;
        
        // Add click handler for the auth button
        document.getElementById('goToWooAuth')?.addEventListener('click', () => {
          const wooAuthTab = document.querySelector('[data-tab="connect"]');
          if (wooAuthTab) {
            wooAuthTab.click();
          }
        });
      } else {
        // Show general error with retry button
        auditResultsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <h3>Error Loading WooCommerce Products</h3>
            <p>${error.message}</p>
            <button id="retryWooProducts" class="btn btn-secondary">Retry</button>
          </div>
        `;
        
        // Add retry handler
        document.getElementById('retryWooProducts')?.addEventListener('click', () => {
          renderPage();
        });
      }
      return null;
    }
  }

  async function attachPaginationListeners(totalPages) {
    console.log('Attaching pagination listeners, totalPages:', totalPages);
    
    // Remove old event listeners by cloning and replacing elements
    ['firstPage', 'prevPage', 'nextPage', 'lastPage'].forEach(id => {
      const oldElement = document.getElementById(id);
      if (oldElement) {
        const newElement = oldElement.cloneNode(true);
        oldElement.parentNode.replaceChild(newElement, oldElement);
      }
    });

    // Add pagination event listeners
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    console.log('Found pagination buttons:', {
      first: !!firstPageBtn,
      prev: !!prevPageBtn,
      next: !!nextPageBtn,
      last: !!lastPageBtn
    });

    if (nextPageBtn) {
      nextPageBtn.onclick = async () => {
        console.log('Next button clicked, current page:', currentPage, 'total pages:', totalPages);
        if (currentPage < totalPages && currentAuth?.isConnected) {
          currentPage++;
          console.log('Moving to page:', currentPage);
          await renderPage();
        }
      };
    }

    if (prevPageBtn) {
      prevPageBtn.onclick = async () => {
        console.log('Previous button clicked, current page:', currentPage);
        if (currentPage > 1 && currentAuth?.isConnected) {
          currentPage--;
          console.log('Moving to page:', currentPage);
          await renderPage();
        }
      };
    }

    if (firstPageBtn) {
      firstPageBtn.onclick = async () => {
        console.log('First button clicked, current page:', currentPage);
        if (currentPage !== 1 && currentAuth?.isConnected) {
          currentPage = 1;
          console.log('Moving to first page');
          await renderPage();
        }
      };
    }

    if (lastPageBtn) {
      lastPageBtn.onclick = async () => {
        console.log('Last button clicked, current page:', currentPage, 'total pages:', totalPages);
        if (currentPage !== totalPages && currentAuth?.isConnected) {
          currentPage = totalPages;
          console.log('Moving to last page:', totalPages);
          await renderPage();
        }
      };
    }
  }

  // Function to handle ChatGPT prompt generation and response
  async function handleGeneratePrompt(btn, product) {
    btn.disabled = true;
    btn.textContent = 'Generating...';

    // Find the compare button for this product
    const productCard = btn.closest('.product-card');
    const compareBtn = productCard.querySelector('.compare-btn');
    compareBtn.disabled = true;

    const prompt = `
Audit the following WooCommerce product and provide a comprehensive analysis:

Product Details:
- Title: ${product.title}
- Short Description: ${product.shortDescription || product.description?.substring(0, 150) + '...'}
- Full Description: ${product.description}
- Specifications: ${JSON.stringify(product.specifications || [])}
- Categories: ${JSON.stringify(product.categories || [])}
- Tags: ${JSON.stringify(product.tags || [])}
- Reviews Count: ${product.reviews_count || 0}

Please analyze all aspects and return a JSON response with the following structure: make sure you return the response in the same language as the product.
{
  "titleScore": number (0-100),
  "titleAnalysis": string,
  "newTitle": string,
  "shortDescriptionScore": number (0-100),
  "shortDescriptionAnalysis": string,
  "newShortDescription": string,
  "descriptionScore": number (0-100),
  "descriptionAnalysis": string,
  "newDescription": string,
  "specificationsScore": number (0-100),
  "specificationsAnalysis": string,
  "suggestedSpecs": string[],
  "categoriesScore": number (0-100),
  "categoriesAnalysis": string,
  "suggestedCategories": string[],
  "tagsScore": number (0-100),
  "tagsAnalysis": string,
  "suggestedTags": string[],
  "suggested reviews": string[],
  "reviews score": number (0-100),
  "reviews analysis": string
  
}`;

// "globalScore": number (0-100),
//   "overallAnalysis": string,
//   "priorityImprovements": string[]
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

    // Listen for ChatGPT response
    let debounceTimer;
    const observer = new MutationObserver((mutations) => {
      console.log('MutationObserver triggered, mutations:', mutations.length);
      
      // Clear any existing timer
      clearTimeout(debounceTimer);
      
      // Set a new timer to process the latest state
      debounceTimer = setTimeout(() => {
        console.log('Processing final state after mutations');
        
        // Try multiple selectors that might match ChatGPT's response
        const selectors = [
          '.markdown-content',
          '[data-message-author-role="assistant"]',
          '.prose',
          '[data-testid="conversation-turn-"]'
        ];
        
        let responseElement = null;
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            // Pick the last element
            responseElement = elements[elements.length - 1];
            console.log('Found latest response element with selector:', selector);
            break;
          }
        }
        

        if (responseElement) {
          try {
            console.log('Found ChatGPT response element');
            const responseText = responseElement.textContent;
            console.log('Full response text:', responseText);

            // If no valid JSON in code blocks, try the more general approach
            const jsonRegex = /\{(?:[^{}]|{[^{}]*})*\}/g;
            const matches = responseText.match(jsonRegex);
            console.log('Found JSON matches:', matches?.length);
            
            if (matches) {
              // Try each match until we find valid JSON with the expected structure
              for (const match of matches) {
                console.log('Trying to parse JSON match:', match);
                try {
                  // Clean the JSON string before parsing
                  const cleanJson = match
                    .replace(/[\n\r]/g, '')  // Remove line breaks
                    .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
                    .trim();                 // Remove leading/trailing whitespace
                  
                  const parsed = JSON.parse(cleanJson);
                  console.log('Successfully parsed JSON:', parsed);
                  
                  // Verify this is our audit results by checking required fields
                  if (parsed.titleScore !== undefined) {
                    console.log('Found valid audit results JSON');
                    
                    // Store the audit results and product data
                    const auditData = {
                      audit: parsed,
                      product: product,
                      timestamp: Date.now()
                    };
                    localStorage.setItem(`audit_${product.id}`, JSON.stringify(auditData));

                    // Enable and attach event listener to compare button
                    compareBtn.disabled = false;
                    compareBtn.addEventListener('click', async () => {
                      // Create modal if it doesn't exist
                      if (!document.getElementById('auditModal')) {
                        createAuditModal();
                      }
                      
                      // Get modal after ensuring it exists
                      const modal = document.getElementById('auditModal');
                      if (!modal) {
                        console.error('Failed to create or find audit modal');
                        return;
                      }

                      // Show modal
                      const modalContent = modal.querySelector('.audit-modal');
                      if (modalContent) {
                        modalContent.style.display = 'block';
                      }

                      // Update modal content with fresh audit results
                      updateModalContent(modal, product, parsed);
                    });

                    // Display the results summary
                    const resultsDiv = productCard.querySelector('.audit-results');
                    if (resultsDiv) {
                      console.log('Displaying results summary');
                      resultsDiv.innerHTML = `
                        <div class="audit-summary">
                          <h4>Audit Results</h4>
                          <p><strong>Global Score:</strong> ${parsed.globalScore}/100</p>
                          <p><strong>Analysis:</strong> ${parsed.overallAnalysis}</p>
                          <div class="priority-improvements">
                            <h5>Priority Improvements:</h5>
                            <ul>
                              ${parsed.priorityImprovements.map(imp => `<li>${imp}</li>`).join('')}
                            </ul>
                          </div>
                        </div>
                      `;
                    }
                    break;
                  } else {
                    console.log('Found JSON but missing required fields. Available fields:', Object.keys(parsed));
                  }
                } catch (error) {
                  console.log('Invalid JSON match:', error.message);
                  console.log('Attempted to parse:', match);
                }
              }
            } else {
              console.log('No JSON matches found in response');
            }
          } catch (error) {
            console.error('Error processing ChatGPT response:', error);
          }
        } else {
          console.log('No response element found with any selector');
        }
      }, 1000); // Wait 1 second after last mutation before processing
    });

    // Start observing ChatGPT's response area
    console.log('Setting up observer');
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
      console.log('Starting observation of target node');
      observer.observe(targetNode, { 
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true
      });
    } else {
      console.error('Could not find any suitable target node for observation');
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Generate ChatGPT Prompt';
    }, 1000);
  }

  // Function to handle modal updates
  function updateModalContent(modal, product, auditResults) {
    if (!modal || !product || !auditResults) {
      console.error('Missing required data for modal update:', { modal, product, auditResults });
      return;
    }

    // Helper function to create a comparison block
    function createComparisonBlock(original, suggested, score, analysis, field) {
      return `
        <div class="comparison-container">
          <div class="version-block original">
            <h4>Current Version</h4>
            <div class="content-box">
              <div class="original-content">${original}</div>
            </div>
          </div>
          <div class="version-block suggested">
            <h4>Enhanced Version <span class="score">(Score: ${score || 0}/100)</span></h4>
            <div class="content-box">
              <div class="suggested-content" contenteditable="true">${suggested}</div>
            </div>
            <button class="apply-changes-btn" data-field="${field}">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <h4>Analysis</h4>
          <p>${analysis || 'No analysis available'}</p>
        </div>
      `;
    }

    // Helper function to format arrays as tags
    function formatAsTags(items, className) {
      if (!Array.isArray(items) || items.length === 0) return 'None';
      return items.map(item => {
        const text = typeof item === 'object' ? item.name : item;
        return `<span class="${className}">${text}</span>`;
      }).join(' ');
    }

    // Helper function to format specifications
    function formatSpecifications(specs) {
      console.log('Formatting specifications:', specs);
      
      if (!Array.isArray(specs) || specs.length === 0) {
        console.log('No specifications to format');
        return 'No specifications';
      }
      
      return specs.map(spec => {
        console.log('Processing spec:', spec);
        
        // Handle different specification formats
        if (typeof spec === 'string') {
          // If it's already in "Name: Values" format
          return `<div class="specification-item">${spec}</div>`;
        }
        
        const name = spec.name || '';
        const options = Array.isArray(spec.options) ? spec.options.join(', ') : (spec.options || '');
        
        return `<div class="specification-item">${name}: ${options}</div>`;
      }).join('\n');
    }

    // Update title tab
    const titleTab = modal.querySelector('#tab-title');
    if (titleTab) {
      titleTab.innerHTML = createComparisonBlock(
        product.title || 'No title',
        auditResults.newTitle || 'No suggestion',
        auditResults.titleScore,
        auditResults.titleAnalysis,
        'name' // Using 'name' as it's the field name in WooCommerce API
      );
    }

    // Update short description tab
    const shortDescTab = modal.querySelector('#tab-short-desc');
    if (shortDescTab) {
      shortDescTab.innerHTML = createComparisonBlock(
        product.shortDescription || 'No short description',
        auditResults.newShortDescription || 'No suggestion',
        auditResults.shortDescriptionScore,
        auditResults.shortDescriptionAnalysis,
        'short_description' // Using 'short_description' as it's the field name in WooCommerce API
      );
    }

    // Update description tab
    const descTab = modal.querySelector('#tab-description');
    if (descTab) {
      descTab.innerHTML = createComparisonBlock(
        product.description || 'No description',
        auditResults.newDescription || 'No suggestion',
        auditResults.descriptionScore,
        auditResults.descriptionAnalysis,
        'description'
      );
    }

    // Update specifications tab
    const specsTab = modal.querySelector('#tab-specifications');
    if (specsTab) {
      console.log('Current product specifications:', product.specifications);
      console.log('Suggested specifications:', auditResults.suggestedSpecs);
      
      const currentSpecs = formatSpecifications(product.specifications);
      console.log('Formatted current specs:', currentSpecs);
      
      let suggestedSpecs;
      if (Array.isArray(auditResults.suggestedSpecs)) {
        suggestedSpecs = auditResults.suggestedSpecs.map(spec => {
          if (typeof spec === 'string') {
            // If it's already in "Name: Values" format
            return `<div class="specification-item">${spec}</div>`;
          }
          const name = spec.name || '';
          const options = Array.isArray(spec.options) ? spec.options.join(', ') : (spec.options || '');
          return `<div class="specification-item">${name}: ${options}</div>`;
        }).join('\n');
      } else {
        suggestedSpecs = 'No suggestions';
      }
      console.log('Formatted suggested specs:', suggestedSpecs);

      specsTab.innerHTML = createComparisonBlock(
        currentSpecs,
        suggestedSpecs,
        auditResults.specificationsScore,
        auditResults.specificationsAnalysis,
        'attributes'
      );
    }

    // Update categories tab
    const categoriesTab = modal.querySelector('#tab-categories');
    if (categoriesTab) {
      categoriesTab.innerHTML = createComparisonBlock(
        formatAsTags(product.categories, 'category-tag'),
        formatAsTags(auditResults.suggestedCategories || [], 'category-tag'),
        auditResults.categoriesScore,
        auditResults.categoriesAnalysis,
        'categories'
      );
    }

    // Update tags tab
    const tagsTab = modal.querySelector('#tab-tags');
    if (tagsTab) {
      tagsTab.innerHTML = createComparisonBlock(
        formatAsTags(product.tags, 'tag'),
        formatAsTags(auditResults.suggestedTags || [], 'tag'),
        auditResults.tagsScore,
        auditResults.tagsAnalysis,
        'tags'
      );
    }

    // Update global analysis tab
    const analysisTab = modal.querySelector('#tab-analysis');
    if (analysisTab) {
      analysisTab.innerHTML = `
        <div class="global-analysis">
          <h3>Global Score: ${auditResults.globalScore || 0}/100</h3>
          <div class="analysis-content">
            <h4>Overall Analysis</h4>
            <p>${auditResults.overallAnalysis || 'No analysis available'}</p>
            <h4>Priority Improvements</h4>
            <ul class="improvements-list">
              ${(auditResults.priorityImprovements || [])
                .map(imp => `<li>${imp}</li>`)
                .join('') || '<li>No improvements suggested</li>'}
            </ul>
          </div>
        </div>
      `;
    }

    // Add event listeners for apply changes buttons
    const applyButtons = modal.querySelectorAll('.apply-changes-btn');
    applyButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const field = button.dataset.field;
        const content = button.closest('.version-block').querySelector('.suggested-content').textContent.trim();

        try {
          button.disabled = true;
          button.textContent = 'Applying...';
          button.classList.add('loading');

          // Format the update data
          const updates = formatUpdateData(field, content);
          console.log('Sending update to WooCommerce:', { productId: product.id, updates });

          const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/${product.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-woo-user-id': currentAuth.userId
            },
            body: JSON.stringify(updates)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(errorData.error || 'Failed to update product');
          }

          const responseData = await response.json();
          console.log('Update response:', responseData);

          if (!responseData.success) {
            throw new Error(responseData.error || 'Failed to update product');
          }

          // Update the original content
          const originalContent = button.closest('.comparison-container').querySelector('.original-content');
          originalContent.textContent = content;

          button.textContent = 'Changes Applied ✓';
          button.classList.remove('loading');
          button.classList.add('success');

          setTimeout(() => {
            button.textContent = 'Apply Changes';
            button.classList.remove('success');
            button.disabled = false;
          }, 2000);

        } catch (error) {
          console.error('Error applying changes:', error);
          button.textContent = error.message || 'Error - Try Again';
          button.classList.remove('loading');
          button.classList.add('error');

          setTimeout(() => {
            button.textContent = 'Apply Changes';
            button.classList.remove('error');
            button.disabled = false;
          }, 3000);
        }
      });
    });
  }

  // Function to attach compare button listeners
  function attachCompareButtonListeners(products) {
    const compareButtons = auditResultsDiv.querySelectorAll('.compare-btn');
    compareButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const productId = btn.dataset.productId;
        const modal = document.getElementById('auditModal');
        if (!modal) {
          createAuditModal();
        }

        const product = products.find(p => p.id === productId);
        if (!product) return;

        const storedData = JSON.parse(localStorage.getItem(`audit_${product.id}`));
        if (!storedData) {
          alert('No audit results available for comparison. Please generate an audit first.');
          return;
        }

        // Show modal
        modal.querySelector('.audit-modal').style.display = 'block';

        // Update modal content
        updateModalContent(modal, product, storedData.audit);
      });
    });
  }

  // Function to attach generate prompt button listeners
  function attachGeneratePromptListeners(products) {
    const buttons = auditResultsDiv.querySelectorAll('.generate-prompt-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => handleGeneratePrompt(btn, products[i]));
    });
  }

  async function renderPage() {
    console.log('Rendering page:', currentPage);
    if (!auditResultsDiv) {
      console.error('auditResultsDiv not found');
      return;
    }

    // Check if we have current auth state
    if (!currentAuth?.isConnected) {
      console.log('No auth state, checking storage');
      const auth = JSON.parse(localStorage.getItem('wooAuth'));
      currentAuth = auth.wooAuth;
      console.log('Retrieved auth state:', currentAuth);
    }

    const data = await fetchProducts(currentPage);
    console.log('Fetched products data:', data);
    if (!data) {
      console.log('No data returned from fetchProducts');
      return;
    }

    const { products, totalProducts, totalPages } = data;
    console.log(`Rendering ${products.length} products, page ${currentPage}/${totalPages}`);

    // Create product cards
    auditResultsDiv.innerHTML = `
      <div class="products-grid">
        ${products.map((p, i) => `
          <div class="product-card" data-index="${i}" data-product-id="${p.id}">
            <div class="product-header">
              <img src="${p.images?.[0]?.src || 'https://via.placeholder.com/150'}" 
                   alt="${p.title}"
                   style="width: 100%; height: 150px; object-fit: contain; background: #f5f5f5;" />
              <span class="product-status">${p.status || 'Active'}</span>
            </div>
            <div class="product-info">
              <h3>${p.title}</h3>
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Stock: ${p.stock_quantity || 0}</p>
              <p class="product-price">${p.price || '$0.00'}</p>
              <p class="product-description">${p.shortDescription || p.description?.substring(0, 150) + '...' || 'No description available.'}</p>
              <div class="product-tags">
                ${(p.categories || []).map(cat => `
                  <span class="category-tag">${typeof cat === 'object' ? cat.name : cat}</span>
                `).join('')}
                ${(p.tags || []).map(tag => `
                  <span class="tag">${typeof tag === 'object' ? tag.name : tag}</span>
                `).join('')}
              </div>
              <div class="button-group">
                <button class="generate-prompt-btn">Generate ChatGPT Prompt</button>
                <button class="compare-btn" data-product-id="${p.id}" disabled>Compare Changes</button>
              </div>
              <div class="audit-results"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="products-summary">
        <p>Total Products: ${totalProducts}</p>
      </div>
      <div class="pagination">
        <button id="firstPage" ${currentPage === 1 ? 'disabled' : ''}>⟪ First</button>
        <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>⟨ Previous</button>
        <span class="page-info">
          Page ${currentPage} of ${totalPages}
          (${(currentPage - 1) * data.itemsPerPage + 1}-${Math.min(currentPage * data.itemsPerPage, totalProducts)} of ${totalProducts} products)
        </span>
        <button id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>Next ⟩</button>
        <button id="lastPage" ${currentPage >= totalPages ? 'disabled' : ''}>Last ⟫</button>
      </div>
    `;

    console.log('Page rendered, attaching pagination listeners');
    // Attach pagination listeners
    await attachPaginationListeners(totalPages);

    // Attach generate prompt button listeners
    attachGeneratePromptListeners(products);
  }

  function injectSlider() {
    console.log('Starting slider injection...');
    fetch(chrome.runtime.getURL('slider.html'))
      .then(response => response.text())
      .then(html => {
        console.log('Slider HTML fetched');
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        console.log('Slider container added to DOM');

        // Add link to external CSS file
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = chrome.runtime.getURL('styles.css');
        document.head.appendChild(cssLink);

        // Get slider elements
        const toggleBtn = document.querySelector('.my-slider-toggle-btn');
        const slider = document.querySelector('.my-slider');
        console.log('Toggle button found:', !!toggleBtn);
        console.log('Slider found:', !!slider);

        // Hide toggle button and open slider by default
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (slider) {
          slider.classList.add('open');
          document.body.classList.add('slider-open');
        }

        /* Commented out toggle button functionality
        toggleBtn.addEventListener('click', () => {
          slider.classList.add('open');
          document.body.classList.add('slider-open');
          toggleBtn.style.display = 'none';
        });
        */

        // Keep close button functionality
        slider.querySelector('.my-slider-close').addEventListener('click', () => {
          slider.classList.remove('open');
          document.body.classList.remove('slider-open');
          // Commented out: toggleBtn.style.display = 'block';
        });

        // Add tab switching functionality
        const tabButtons = document.querySelectorAll('.my-slider-tab-btn');
        const tabContents = document.querySelectorAll('.my-slider-tab-content');
        console.log('Number of tab buttons found:', tabButtons.length);
        console.log('Number of tab contents found:', tabContents.length);

        tabButtons.forEach(btn => {
          btn.addEventListener('click', async () => {
            const target = btn.getAttribute('data-tab');
            console.log('Tab clicked:', target);
            
            // Update active state of buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show selected content
            tabContents.forEach(content => content.style.display = 'none');
            const targetContent = document.getElementById(`tab-${target}`);
            if (targetContent) {
              targetContent.style.display = 'block';
              
              // If switching to audit tab, check auth state and render if needed
              if (target === 'audit') {
                const auth = JSON.parse(localStorage.getItem('wooAuth'));
                currentAuth = auth.wooAuth;
                if (currentAuth?.isConnected) {
                  renderPage();
                }
              }
            }
          });
        });

        // Initialize auditResultsDiv
        auditResultsDiv = document.getElementById('auditResults');
        
        // Create and initialize WooAuth
        const authorizeButton = document.getElementById('authorizeWoo');
        if (authorizeButton) {
          console.log('Adding click listener to authorize button');
          authorizeButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Authorize button clicked');
            window.wooAuth?.authorize();
          });
        }

        // Listen for auth changes
        document.addEventListener('wooAuthChanged', (event) => {
          if (event.detail.connected) {
            renderPage();
          }
        });
      })
      .catch(error => console.error('Error injecting slider:', error));
  }

  function formatUpdateData(field, content) {
    // Format data according to WooCommerce API structure
    switch (field) {
      case 'name':
        return { name: content };
      case 'description':
        return { description: content };
      case 'short_description':
        return { short_description: content };
      case 'attributes':
        try {
          console.log('Raw content for attributes:', content);
          
          // If content is empty or invalid
          if (!content || content === 'No specifications') {
            console.log('Empty or invalid content');
            return { attributes: [] };
          }

          // Split content into lines and parse each specification
          const lines = content.split('\n').filter(line => line.trim());
          console.log('Split lines:', lines);

          const specs = lines.map(line => {
            console.log('Processing line:', line);
            
            // Try to match HTML format first
            let match = line.match(/<strong>(.*?)<\/strong>:?\s*(.*)/);
            
            if (!match) {
              // Try plain text format (Name: Value1, Value2)
              match = line.match(/(.*?):\s*(.*)/);
            }

            if (!match) {
              console.log('No match found for line:', line);
              return null;
            }
            
            const [, name, optionsStr] = match;
            console.log('Matched name:', name, 'options:', optionsStr);
            
            const options = optionsStr
              .split(',')
              .map(o => o.trim())
              .filter(o => o);
              
            console.log('Parsed options:', options);
            
            return {
              name: name.trim(),
              options: options.length > 0 ? options : [''],
              visible: true,
              variation: false,
              position: 0
            };
          }).filter(spec => spec && spec.name);

          console.log('Final formatted specifications:', specs);
          return { attributes: specs };
        } catch (e) {
          console.error('Error parsing specifications:', e);
          console.error('Error details:', e.message);
          console.error('Error stack:', e.stack);
          return { attributes: [] };
        }
      case 'categories':
        try {
          const categoryTags = content.match(/<span class="category-tag">(.*?)<\/span>/g) || [];
          const categories = categoryTags.map(tag => {
            const name = tag.match(/<span class="category-tag">(.*?)<\/span>/)[1];
            return { name };
          });
          return { categories };
        } catch (e) {
          console.error('Error parsing categories:', e);
          return { categories: [] };
        }
      case 'tags':
        try {
          const tagSpans = content.match(/<span class="tag">(.*?)<\/span>/g) || [];
          const tags = tagSpans.map(tag => {
            const name = tag.match(/<span class="tag">(.*?)<\/span>/)[1];
            return { name };
          });
          return { tags };
        } catch (e) {
          console.error('Error parsing tags:', e);
          return { tags: [] };
        }
      default:
        return { [field]: content };
    }
  }
})();
