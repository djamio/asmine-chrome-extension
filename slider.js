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

    .compare-btn.loading {
      position: relative;
      color: transparent;
    }

    .compare-btn.loading::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      top: 50%;
      left: 50%;
      margin: -8px 0 0 -8px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: button-spin 0.8s linear infinite;
    }

    @keyframes button-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  // Add styles to the document
  const styleElement = document.createElement('style');
  styleElement.textContent = modalStyles;
  document.head.appendChild(styleElement);

  // Function to check if all required elements are loaded
  function checkRequiredElements() {
    const elements = {
      statusText: document.getElementById('authStatusText'),
      authorizeButton: document.getElementById('authorizeWoo'),
      resetButton: document.getElementById('resetWooAuth'),
      authForm: document.querySelector('.auth-form'),
      authInfo: document.querySelector('.auth-info'),
      shopUrlInput: document.getElementById('shopUrl'),
      auditResults: document.getElementById('auditResults')
    };

    console.log('Checking elements:', Object.entries(elements).reduce((acc, [key, value]) => {
      acc[key] = !!value;
      return acc;
    }, {}));

    return Object.values(elements).every(el => el !== null);
  }

  // Function to check if we should load products
  function shouldLoadProducts() {
    const auditTab = document.getElementById('tab-audit');
    return auditTab && auditTab.style.display === 'block' && currentAuth?.isConnected;
  }

  // Reusable function to display products list
  function displayProductsList(products, totalProducts = 0, totalPages = 1, currentPage = 1) {
    if (!auditResultsDiv) {
      console.error('auditResultsDiv not found');
      return;
    }

    // Add styles for product cards
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
      }

      .product-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .product-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }

      .product-header {
        position: relative;
        background: #f8f9fa;
        padding: 0;
      }

      .product-header img {
        width: 100%;
        height: 200px;
        object-fit: contain;
        background: #f8f9fa;
        border-bottom: 1px solid #eee;
      }

      .product-status {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 4px 8px;
        border-radius: 4px;
        background: #28a745;
        color: white;
        font-size: 12px;
        font-weight: 500;
      }

      .product-info {
        padding: 15px;
      }

      .product-info h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        height: 44px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .product-meta {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }

      .product-price {
        font-size: 16px;
        font-weight: 600;
        color: #2c5282;
        margin-bottom: 8px;
      }

      .product-description {
        font-size: 14px;
        color: #666;
        margin-bottom: 15px;
        line-height: 1.5;
        height: 63px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .product-tags {
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .category-tag, .tag {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .category-tag {
        background: #e3f2fd;
        color: #1976d2;
      }

      .tag {
        background: #f3e5f5;
        color: #7b1fa2;
      }

      .button-group {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }

      .generate-prompt-btn, .compare-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .generate-prompt-btn {
        background: #4CAF50;
        color: white;
      }

      .generate-prompt-btn:hover {
        background: #43A047;
      }

      .compare-btn {
        background: #2196F3;
        color: white;
      }

      .compare-btn:hover {
        background: #1E88E5;
      }

      .compare-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .audit-results {
        margin-top: 15px;
        padding: 10px;
        border-radius: 6px;
        background: #f8f9fa;
        display: none;
      }
    `;
    document.head.appendChild(styleElement);

    // Create product cards
    auditResultsDiv.innerHTML = `
      <div class="products-grid">
        ${products.map((p, i) => `
          <div class="product-card" data-index="${i}" data-product-id="${p.id}">
            <div class="product-header">
              <img src="${p.images?.[0]?.src || 'https://via.placeholder.com/150'}" 
                   alt="${p.title || p.name}"
                   loading="lazy" />
              <span class="product-status">${p.status || 'Active'}</span>
            </div>
            <div class="product-info">
              <h3>${p.title || p.name}</h3>
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Stock: ${p.stock_quantity || 0}</p>
              <p class="product-price">${p.price ? `$${p.price}` : '$0.00'}</p>
              <p class="product-description">${p.short_description || p.description?.substring(0, 150) + '...' || 'No description available.'}</p>
              <div class="product-tags">
                ${(p.categories || []).map(cat => `
                  <span class="category-tag">${typeof cat === 'object' ? cat.name : cat}</span>
                `).join('')}
                ${(p.tags || []).map(tag => `
                  <span class="tag">${typeof tag === 'object' ? tag.name : tag}</span>
                `).join('')}
              </div>
              <div class="button-group">
                <button class="generate-prompt-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Generate Audit
                </button>
                <button class="compare-btn" data-product-id="${p.id}" disabled>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l5 5"/>
                  </svg>
                  Compare
                </button>
              </div>
              <div class="audit-results"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="products-summary">
        <p>Total Products: ${totalProducts}</p>
      </div>
      ${totalPages > 1 ? `
        <div class="pagination">
          <button id="firstPage" ${currentPage === 1 ? 'disabled' : ''}>⟪ First</button>
          <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
          <span class="page-info">Page ${currentPage} of ${totalPages}</span>
          <button id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
          <button id="lastPage" ${currentPage === totalPages ? 'disabled' : ''}>Last ⟫</button>
        </div>
      ` : ''}
    `;

    // Attach event listeners
    attachGeneratePromptListeners(products);
    attachCompareButtonListeners(products);
    if (totalPages > 1) {
      attachPaginationListeners(totalPages);
    }
  }

  // Function to fetch products from API
  async function fetchProducts(page = 1) {
    try {
      console.log('Fetching products for page:', page);
      
      // Get WooAuth instance
      const wooAuth = window.wooAuth;
      if (!wooAuth) {
        throw new Error('WooCommerce authentication not initialized');
      }

      // Check if we have valid credentials
      if (!wooAuth.hasValidCredentials()) {
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
        <div class="loading-container">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
          </div>
          <p class="loading-text">Loading WooCommerce products...</p>
        </div>
      `;

      // Get stored credentials
      const credentials = wooAuth.getStoredCredentials();
      
      console.log('Making API request with stored credentials');
      const response = await fetch(`${wooAuth.API_URL}/woo/products?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-store-url': credentials.storeUrl,
          'x-woo-consumer-key': credentials.consumerKey,
          'x-woo-consumer-secret': credentials.consumerSecret
        }
      });

      if (!response.ok) {
        // If authentication fails, clear credentials and show connect message
        if (response.status === 401 || response.status === 403) {
          await wooAuth.resetAuth();
          throw new Error('Authentication failed. Please reconnect to WooCommerce.');
        }
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      if (data.products && data.products.length > 0) {
        displayProductsList(data.products, data.totalProducts, data.total_pages, page);
      } else {
        auditResultsDiv.innerHTML = `
          <div class="no-results">
            <p>No products found.</p>
          </div>
        `;
      }
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      auditResultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #dc3545;">Error loading products: ${error.message}</p>
          <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
        </div>
      `;
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
    try {
      // Disable both buttons and show loading state
      btn.disabled = true;
      btn.textContent = 'Generating...';
      const productCard = btn.closest('.product-card');
      const compareBtn = productCard.querySelector('.compare-btn');
      if (compareBtn) {
        compareBtn.disabled = true;
        compareBtn.classList.add('loading');
      }

      const prompt = `
        Audit the following WooCommerce product and provide a comprehensive analysis:
        
        Product Details:
        - Title: ${product.title}
        - Short Description: ${product.shortDescription || product.description?.substring(0, 150) + '...'}
        - Full Description: ${product.description && product.description.length ? product.description.slice(0, 200) : 'No description available'}
        - Specifications: ${JSON.stringify(product.specifications || [])}
        - Categories: ${JSON.stringify(product.categories || [])}
        - Tags: ${JSON.stringify(product.tags || [])}
        - Reviews Count: ${product.reviews_count || 0}
        
        Please analyze all aspects and return a JSON response with the following structure: make sure you return the response in the same language as the product.
        generate two reviews, and no nested categories or tags. for description please generate a nice html content 
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
          "suggestedReviews": [
            {
              "review": string,
              "rating": number (1-5),
              "date": string (ISO format: YYYY-MM-DD),
              "author": string
            }
          ],
          "reviewsScore": number (0-100),
          "reviewsAnalysis": string,
          "globalScore": number (0-100),
          "overallAnalysis": string,
          "priorityImprovements": string[]
        }`;

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
                      compareBtn.classList.remove('loading');
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

                      // Reset generate button state
                      btn.disabled = false;
                      btn.textContent = 'Generate ChatGPT Prompt';

                      // Disconnect the observer since we've found and processed the response
                      observer.disconnect();
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
        // Reset button states if we couldn't find the target node
        btn.disabled = false;
        btn.textContent = 'Generate ChatGPT Prompt';
        if (compareBtn) {
          compareBtn.disabled = false;
          compareBtn.classList.remove('loading');
        }
      }

    } catch (error) {
      console.error('Error in handleGeneratePrompt:', error);
      btn.disabled = false;
      btn.textContent = 'Generate ChatGPT Prompt';
      if (compareBtn) {
        compareBtn.disabled = false;
        compareBtn.classList.remove('loading');
      }
    }
  }

  // Helper function to format arrays as tags
  function formatAsTags(items, className) {
    console.log(`Formatting ${className}:`, items);
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`No ${className} to format`);
      return 'None';
    }
    
    return items.map(item => {
      console.log('Processing item:', item);
      const text = typeof item === 'object' ? item.name : item;
      return text;
    }).join(', ');
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

  // Helper function to format reviews
  function formatReviews(reviews) {
    console.log('Formatting reviews input:', reviews);
    
    if (!Array.isArray(reviews) || reviews.length === 0) {
      console.log('No reviews to format');
      return 'No reviews';
    }
    
    return reviews.map(review => {
      console.log('Processing review:', review);
      const reviewText = review.review || review.content || '';
      const author = review.reviewer || review.author || 'Anonymous';
      const date = review.date_created || review.date || new Date().toISOString().split('T')[0];
      const rating = review.rating || 0;

      return `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">${author}</span>
            <span class="review-date">${date}</span>
            <div class="review-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
          </div>
          <div class="review-content">${reviewText}</div>
        </div>
      `;
    }).join('\n');
  }

  // Function to parse reviews from HTML content
  function parseReviewsFromHTML(content) {
    console.log('Parsing reviews from HTML:', content);
    
    if (!content || content === 'No reviews') {
      console.log('No reviews to parse');
      return [];
    }

    const reviewElements = content.match(/<div class="review-item">([\s\S]*?)<\/div>/g) || [];
    console.log('Found review elements:', reviewElements);

    const reviews = reviewElements.map(element => {
      const authorMatch = element.match(/<span class="review-author">(.*?)<\/span>/);
      const dateMatch = element.match(/<span class="review-date">(.*?)<\/span>/);
      const ratingMatch = element.match(/<div class="review-rating">(.*?)<\/div>/);
      const contentMatch = element.match(/<div class="review-content">(.*?)<\/div>/);

      const rating = ratingMatch ? (ratingMatch[1].match(/★/g) || []).length : 0;

      const review = {
        author: authorMatch ? authorMatch[1] : 'Anonymous',
        date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        rating: rating,
        review: contentMatch ? contentMatch[1].trim() : ''
      };

      console.log('Parsed review:', review);
      return review;
    });

    console.log('Final parsed reviews:', reviews);
    return reviews;
  }

  // Function to handle modal updates
  function updateModalContent(modal, product, auditResults) {
    if (!modal || !product || !auditResults) {
      console.error('Missing required data for modal update:', { modal, product, auditResults });
      return;
    }

    // Get stored auth data
    const authData = JSON.parse(localStorage.getItem('wooAuth'));
    if (!authData?.wooAuth) {
      console.error('No WooCommerce authentication data found');
      return;
    }

    const { storeUrl, consumerKey, consumerSecret } = authData.wooAuth;
    if (!storeUrl || !consumerKey || !consumerSecret) {
      console.error('Missing required WooCommerce credentials');
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
      console.log('Current product categories:', product.categories);
      console.log('Suggested categories:', auditResults.suggestedCategories);
      
      const currentCategories = formatAsTags(product.categories, 'category-tag');
      console.log('Formatted current categories:', currentCategories);
      
      let suggestedCategories;
      if (Array.isArray(auditResults.suggestedCategories)) {
        suggestedCategories = formatAsTags(auditResults.suggestedCategories, 'category-tag');
      } else {
        suggestedCategories = 'No suggestions';
      }
      console.log('Formatted suggested categories:', suggestedCategories);

      categoriesTab.innerHTML = createComparisonBlock(
        currentCategories,
        suggestedCategories,
        auditResults.categoriesScore,
        auditResults.categoriesAnalysis,
        'categories'
      );
    }

    // Update tags tab
    const tagsTab = modal.querySelector('#tab-tags');
    if (tagsTab) {
      console.log('Current product tags:', product.tags);
      console.log('Suggested tags:', auditResults.suggestedTags);
      
      const currentTags = formatAsTags(product.tags, 'tag');
      console.log('Formatted current tags:', currentTags);
      
      let suggestedTags;
      if (Array.isArray(auditResults.suggestedTags)) {
        suggestedTags = formatAsTags(auditResults.suggestedTags, 'tag');
      } else {
        suggestedTags = 'No suggestions';
      }
      console.log('Formatted suggested tags:', suggestedTags);

      tagsTab.innerHTML = createComparisonBlock(
        currentTags,
        suggestedTags,
        auditResults.tagsScore,
        auditResults.tagsAnalysis,
        'tags'
      );
    }

    // Update reviews tab
    const reviewsTab = modal.querySelector('#tab-reviews');
    if (reviewsTab) {
      console.log('Current product reviews:', product.reviews);
      console.log('Suggested reviews:', auditResults.suggestedReviews);
      
      const currentReviews = formatReviews(product.reviews || []);
      const suggestedReviews = formatReviews(auditResults.suggestedReviews || []);
      console.log('Formatted current reviews:', currentReviews);
      console.log('Formatted suggested reviews:', suggestedReviews);

      reviewsTab.innerHTML = createComparisonBlock(
        currentReviews,
        suggestedReviews,
        auditResults.reviewsScore,
        auditResults.reviewsAnalysis,
        'reviews'
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

          let response;
          if (field === 'reviews') {
            // Format and update reviews
            const updates = formatUpdateData(field, content);
            response = await updateProductReviews(product.id, updates.reviews);
          } else {
            // Handle other fields
            const updates = formatUpdateData(field, content);
            response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/${product.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-woo-store-url': storeUrl,
                'x-woo-consumer-key': consumerKey,
                'x-woo-consumer-secret': consumerSecret
              },
              body: JSON.stringify(updates)
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Failed to update product');
            }

            response = await response.json();
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
          button.textContent = 'Error - Try Again';
          button.classList.remove('loading');
          button.classList.add('error');
          button.disabled = false;

          // Show error message
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error-message';
          errorDiv.textContent = error.message || 'Failed to apply changes';
          button.parentNode.appendChild(errorDiv);

          setTimeout(() => {
            button.textContent = 'Apply Changes';
            button.classList.remove('error');
            errorDiv.remove();
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
    displayProductsList(products, totalProducts, totalPages, currentPage);
  }

  function injectSlider() {
    console.log('Starting slider injection...');
    return fetch(chrome.runtime.getURL('slider.html'))
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
        const slider = document.querySelector('.my-slider');
        console.log('Slider found:', !!slider);

        // Open slider by default
        if (slider) {
          slider.classList.add('open');
          document.body.classList.add('slider-open');
        }

        // Keep close button functionality
        slider.querySelector('.my-slider-close').addEventListener('click', () => {
          slider.classList.remove('open');
          document.body.classList.remove('slider-open');
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
              
              // If switching to audit tab and we're connected, load products
              if (target === 'audit' && currentAuth?.isConnected) {
                console.log('Loading products for audit tab');
                renderPage();
              }
            }
          });
        });

        // Initialize auditResultsDiv
        auditResultsDiv = document.getElementById('auditResults');

        // Wait for all elements to be ready before initializing WooAuth
        return new Promise((resolve) => {
          const checkElements = () => {
            if (checkRequiredElements()) {
              console.log('All elements ready, initializing WooAuth');
              if (!window.wooAuth) {
                window.wooAuth = new WooAuth();
              }
              resolve();
            } else {
              console.log('Elements not ready, retrying in 100ms');
              setTimeout(checkElements, 100);
            }
          };
          checkElements();
        });
      })
      .then(() => {
        // Add event listeners after WooAuth is initialized
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
          console.log('Auth state changed:', event.detail);
          currentAuth = { isConnected: event.detail.connected };
          if (event.detail.connected && shouldLoadProducts()) {
            console.log('Connected and on audit tab, loading products');
            renderPage();
          }
        });

        // Check if we should load products immediately
        const auth = JSON.parse(localStorage.getItem('wooAuth'));
        if (auth?.wooAuth?.isConnected && shouldLoadProducts()) {
          console.log('Already connected and on audit tab, loading products');
          currentAuth = auth.wooAuth;
          renderPage();
        }
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
          console.log('Raw content for categories:', content);
          
          if (!content || content === 'None') {
            console.log('Empty or invalid categories');
            return { categories: [] };
          }

          // Split by commas and clean up
          const categoryNames = content.split(',')
            .map(cat => cat.trim())
            .filter(cat => cat);
            
          console.log('Parsed category names:', categoryNames);

          const categories = categoryNames.map(name => ({
            name: name
          }));

          console.log('Final formatted categories:', categories);
          return { categories };
        } catch (e) {
          console.error('Error parsing categories:', e);
          console.error('Error details:', e.message);
          console.error('Error stack:', e.stack);
          return { categories: [] };
        }
      case 'tags':
        try {
          console.log('Raw content for tags:', content);
          
          if (!content || content === 'None') {
            console.log('Empty or invalid tags');
            return { tags: [] };
          }

          // Split by commas and clean up
          const tagNames = content.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);
            
          console.log('Parsed tag names:', tagNames);

          const tags = tagNames.map(name => ({
            name: name
          }));

          console.log('Final formatted tags:', tags);
          return { tags };
        } catch (e) {
          console.error('Error parsing tags:', e);
          console.error('Error details:', e.message);
          console.error('Error stack:', e.stack);
          return { tags: [] };
        }
      case 'reviews':
        try {
          console.log('Raw content for reviews:', content);
          
          if (!content || content === 'No reviews') {
            console.log('Empty or invalid reviews');
            return { reviews: [] };
          }

          // Parse reviews from the suggested content
          const reviewElements = content.match(/<div class="review-item">([\s\S]*?)<\/div>/g) || [];
          console.log('Found review elements:', reviewElements);

          const reviews = reviewElements.map(element => {
            const authorMatch = element.match(/<span class="review-author">(.*?)<\/span>/);
            const dateMatch = element.match(/<span class="review-date">(.*?)<\/span>/);
            const ratingMatch = element.match(/<div class="review-rating">(.*?)<\/div>/);
            const contentMatch = element.match(/<div class="review-content">(.*?)<\/div>/);

            const rating = ratingMatch ? (ratingMatch[1].match(/★/g) || []).length : 0;

            return {
              reviewer: authorMatch ? authorMatch[1].trim() : 'Anonymous',
              date_created: dateMatch ? dateMatch[1].trim() : new Date().toISOString().split('T')[0],
              rating: rating,
              review: contentMatch ? contentMatch[1].trim() : '',
              verified: true,
              status: 'approved'
            };
          });

          console.log('Formatted reviews for update:', reviews);
          return { reviews };
        } catch (e) {
          console.error('Error parsing reviews:', e);
          console.error('Error details:', e.message);
          console.error('Error stack:', e.stack);
          return { reviews: [] };
        }
      default:
        return { [field]: content };
    }
  }

  // Function to update product reviews
  async function updateProductReviews(productId, reviews) {
    try {
      console.log('Updating reviews for product:', productId);
      console.log('Reviews data:', reviews);

      // Get stored auth data directly from localStorage
      const authData = JSON.parse(localStorage.getItem('wooAuth'));
      if (!authData?.wooAuth) {
        throw new Error('No WooCommerce authentication data found');
      }

      const { storeUrl, consumerKey, consumerSecret } = authData.wooAuth;
      if (!storeUrl || !consumerKey || !consumerSecret) {
        throw new Error('Missing required WooCommerce credentials');
      }

      console.log('Using credentials:', {
        storeUrl,
        hasConsumerKey: !!consumerKey,
        hasConsumerSecret: !!consumerSecret
      });

      // Get the suggested content
      const suggestedContent = document.querySelector('#tab-reviews .suggested-content');
      if (!suggestedContent) {
        throw new Error('Could not find suggested reviews content');
      }

      // Parse reviews from the suggested content
      const reviewElements = suggestedContent.querySelectorAll('.review-item');
      console.log('Found review elements:', reviewElements.length);

      const reviewsToUpdate = Array.from(reviewElements).map(element => {
        const author = element.querySelector('.review-author')?.textContent || 'Anonymous';
        const date = element.querySelector('.review-date')?.textContent || new Date().toISOString().split('T')[0];
        const ratingStars = element.querySelector('.review-rating')?.textContent.match(/★/g)?.length || 0;
        const reviewText = element.querySelector('.review-content')?.textContent.trim() || '';

        return {
          reviewer: author,
          date_created: date,
          rating: ratingStars,
          review: reviewText,
          verified: true,
          status: 'approved'
        };
      });

      console.log('Parsed reviews to update:', reviewsToUpdate);

      // Make the API request with proper headers
      const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/${productId}/reviews`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-store-url': storeUrl,
          'x-woo-consumer-key': consumerKey,
          'x-woo-consumer-secret': consumerSecret
        },
        body: JSON.stringify({ reviews: reviewsToUpdate })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to update reviews');
      }

      const responseData = await response.json();
      console.log('Update reviews response:', responseData);

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to update reviews');
      }

      return responseData;
    } catch (error) {
      console.error('Error updating reviews:', error);
      throw error;
    }
  }

  // Make sure WooAuth is initialized before trying to use it
  function initializeWooAuth() {
    if (!window.wooAuth) {
      window.wooAuth = new WooAuth();
    }
  }

  // Initialize WooAuth when the document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWooAuth);
  } else {
    initializeWooAuth();
  }

  // Function to initialize search functionality
  function initializeSearch() {
    console.log('Initializing search functionality...');
    
    const searchButton = document.getElementById('searchProducts');
    const searchInput = document.getElementById('productSearch');

    if (searchButton && searchInput) {
      console.log('Search elements found, adding listeners');
      
      // Search button click handler
      searchButton.addEventListener('click', () => {
        console.log('Search button clicked');
        const query = searchInput.value.trim();
        if (query) {
          searchProducts(query);
        }
      });

      // Enter key handler
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter key pressed in search');
          const query = e.target.value.trim();
          if (query) {
            searchProducts(query);
          }
        }
      });

      console.log('Search listeners added successfully');
    } else {
      console.warn('Search elements not found:', { searchButton, searchInput });
    }
  }

  // Initialize search when auth state changes
  document.addEventListener('wooAuthChanged', (event) => {
    console.log('Auth state changed, initializing search if connected');
    if (event.detail.connected) {
      // Wait a bit for the DOM to update
      setTimeout(initializeSearch, 500);
    }
  });

  // Also try to initialize search on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearch);
  } else {
    initializeSearch();
  }

  // Function to search products
  async function searchProducts(query) {
    try {
      console.log('Searching products with query:', query);
      
      // Get WooAuth instance and credentials
      const authData = JSON.parse(localStorage.getItem('wooAuth'));
      if (!authData?.wooAuth) {
        throw new Error('No WooCommerce authentication data found');
      }

      const { storeUrl, consumerKey, consumerSecret } = authData.wooAuth;
      if (!storeUrl || !consumerKey || !consumerSecret) {
        throw new Error('Missing required WooCommerce credentials');
      }

      // Show loading state
      auditResultsDiv.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
          </div>
          <p class="loading-text">Searching products...</p>
        </div>
      `;

      console.log('Making search API request...');
      
      // Make the API request
      const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-store-url': storeUrl,
          'x-woo-consumer-key': consumerKey,
          'x-woo-consumer-secret': consumerSecret
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search products');
      }

      const data = await response.json();
      console.log('Search response:', data);
      
      if (data.products && data.products.length > 0) {
        displayProductsList(data.products, data.totalProducts || data.products.length, data.total_pages || 1, data.current_page || 1);
      } else {
        auditResultsDiv.innerHTML = `
          <div class="no-results">
            <p>No products found matching "${query}"</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error searching products:', error);
      auditResultsDiv.innerHTML = `
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-message">
            <h4>Error Searching Products</h4>
            <p>${error.message || 'Failed to search products. Please try again.'}</p>
          </div>
        </div>
      `;
    }
  }
})();
