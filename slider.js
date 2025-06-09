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

  // Function to fetch products from API
  async function fetchProducts(page = 1) {
    try {
      console.log('Fetching products for page:', page);
      // Check if authorized with WooCommerce first
      const auth = await chrome.storage.local.get(['wooAuth']);
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
          await chrome.storage.local.set({ wooAuth: { isConnected: false, userId: null } });
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
        await chrome.storage.local.set({ wooAuth: { isConnected: false, userId: null } });
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

    const prompt = `
Audit the following WooCommerce product and provide a comprehensive analysis:

Product Details:
- Title: ${product.title}
- Short Description: ${product.shortDescription || product.description?.substring(0, 150) + '...'}
- Full Description: ${product.description}
- Specifications: ${JSON.stringify(product.attributes || [])}
- Categories: ${JSON.stringify(product.categories || [])}
- Tags: ${JSON.stringify(product.tags || [])}
- Reviews Count: ${product.reviews_count || 0}

Please analyze all aspects and return a JSON response with the following structure:
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
          const element = document.querySelector(selector);
          if (element) {
            console.log('Found response element with selector:', selector);
            responseElement = element;
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
                  if (parsed.titleScore !== undefined && 
                      parsed.overallAnalysis !== undefined && 
                      parsed.priorityImprovements !== undefined) {
                    console.log('Found valid audit results JSON');
                    processAuditResults(parsed, btn);
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
      console.error('Missing required data for modal update');
      return;
    }

    console.log('Updating modal content with:', { product, auditResults });

    // Update title tab
    const titleTab = document.getElementById('tab-title');
    if (titleTab) {
      titleTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Original Title</h4>
            <div class="original-content">${product.title}</div>
          </div>
          <div class="version-block">
            <h4>Enhanced Title <span class="score">(Score: ${auditResults.titleScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">${auditResults.newTitle}</div>
            <button class="apply-changes-btn" data-field="title">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.titleAnalysis}</p>
        </div>
      `;
    }

    // Update short description tab
    const shortDescTab = document.getElementById('tab-short-desc');
    if (shortDescTab) {
      shortDescTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Original Short Description</h4>
            <div class="original-content">${product.shortDescription || ''}</div>
          </div>
          <div class="version-block">
            <h4>Enhanced Short Description <span class="score">(Score: ${auditResults.shortDescriptionScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">${auditResults.newShortDescription}</div>
            <button class="apply-changes-btn" data-field="shortDescription">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.shortDescriptionAnalysis}</p>
        </div>
      `;
    }

    // Update description tab
    const descTab = document.getElementById('tab-description');
    if (descTab) {
      descTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Original Description</h4>
            <div class="original-content">${product.description || ''}</div>
          </div>
          <div class="version-block">
            <h4>Enhanced Description <span class="score">(Score: ${auditResults.descriptionScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">${auditResults.newDescription}</div>
            <button class="apply-changes-btn" data-field="description">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.descriptionAnalysis}</p>
        </div>
      `;
    }

    // Update specifications tab
    const specsTab = document.getElementById('tab-specifications');
    if (specsTab) {
      specsTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Current Specifications</h4>
            <div class="original-content">
              ${(product.attributes || []).map(attr => `
                <p><strong>${attr.name}:</strong> ${attr.options.join(', ')}</p>
              `).join('') || 'No specifications available'}
            </div>
          </div>
          <div class="version-block">
            <h4>Suggested Specifications <span class="score">(Score: ${auditResults.specificationsScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">
              ${auditResults.suggestedSpecs.map(spec => `<p>${spec}</p>`).join('')}
            </div>
            <button class="apply-changes-btn" data-field="specifications">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.specificationsAnalysis}</p>
        </div>
      `;
    }

    // Update categories tab
    const categoriesTab = document.getElementById('tab-categories');
    if (categoriesTab) {
      categoriesTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Current Categories</h4>
            <div class="original-content">
              ${(product.categories || []).map(cat => `
                <span class="category-tag">${typeof cat === 'object' ? cat.name : cat}</span>
              `).join('') || 'No categories assigned'}
            </div>
          </div>
          <div class="version-block">
            <h4>Suggested Categories <span class="score">(Score: ${auditResults.categoriesScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">
              ${auditResults.suggestedCategories.map(cat => `
                <span class="category-tag">${cat}</span>
              `).join('')}
            </div>
            <button class="apply-changes-btn" data-field="categories">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.categoriesAnalysis}</p>
        </div>
      `;
    }

    // Update tags tab
    const tagsTab = document.getElementById('tab-tags');
    if (tagsTab) {
      tagsTab.innerHTML = `
        <div class="comparison-container">
          <div class="version-block">
            <h4>Current Tags</h4>
            <div class="original-content">
              ${(product.tags || []).map(tag => `
                <span class="tag">${typeof tag === 'object' ? tag.name : tag}</span>
              `).join('') || 'No tags assigned'}
            </div>
          </div>
          <div class="version-block">
            <h4>Suggested Tags <span class="score">(Score: ${auditResults.tagsScore}/100)</span></h4>
            <div class="enhanced-content" contenteditable="true">
              ${auditResults.suggestedTags.map(tag => `
                <span class="tag">${tag}</span>
              `).join('')}
            </div>
            <button class="apply-changes-btn" data-field="tags">Apply Changes</button>
          </div>
        </div>
        <div class="analysis-section">
          <p><strong>Analysis:</strong> ${auditResults.tagsAnalysis}</p>
        </div>
      `;
    }

    // Add event listeners for apply changes buttons
    const applyButtons = modal.querySelectorAll('.apply-changes-btn');
    applyButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const field = button.dataset.field;
        const content = button.closest('.version-block').querySelector('.enhanced-content').textContent;

        try {
          button.disabled = true;
          button.textContent = 'Applying...';
          button.classList.add('loading');

          const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products/${product.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-woo-user-id': currentAuth.userId
            },
            body: JSON.stringify({
              [field]: content
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update product');
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

          setTimeout(() => {
            button.textContent = 'Apply Changes';
            button.classList.remove('error');
            button.disabled = false;
          }, 3000);
        }
      });
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
      const auth = await chrome.storage.local.get(['wooAuth']);
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

    // Add event listeners for generate prompt buttons
    const buttons = auditResultsDiv.querySelectorAll('.generate-prompt-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => handleGeneratePrompt(btn, products[i]));
    });

    // Add event listeners for compare buttons
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
                const auth = await chrome.storage.local.get(['wooAuth']);
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

  // Helper function to process audit results
  function processAuditResults(auditResults, btn) {
    // Store the results and product data
    const productId = btn.closest('.product-card').dataset.productId;
    console.log('Storing results for product:', productId);
    
    // Get the product data from the card
    const productCard = btn.closest('.product-card');
    const productData = {
      id: productId,
      name: productCard.querySelector('h3').textContent,
      description: productCard.querySelector('.product-description').textContent,
    };
    
    // Store both audit results and product data
    localStorage.setItem(`audit_${productId}`, JSON.stringify({
      audit: auditResults,
      product: productData
    }));

    // Enable the compare button
    const compareBtn = btn.closest('.product-card').querySelector('.compare-btn');
    if (compareBtn) {
      console.log('Found compare button, enabling it');
      compareBtn.disabled = false;
      
      // Add click handler for compare button
      compareBtn.onclick = () => {
        console.log('Compare button clicked');
        const storedData = JSON.parse(localStorage.getItem(`audit_${productId}`));
        const storedResults = storedData.audit;
        const product = storedData.product;
        
        // Create and show modal
        createAuditModal();
        const modal = document.getElementById('auditModal');
        
        if (!modal) {
          console.error('Failed to create modal');
          return;
        }

        // Populate title tab
        const titleOriginal = modal.querySelector('#tab-title .original-content');
        const titleSuggested = modal.querySelector('#tab-title .suggested-content');
        const titleScore = modal.querySelector('#tab-title .score');
        const titleAnalysis = modal.querySelector('#tab-title .analysis');

        titleOriginal.textContent = product.name;
        titleSuggested.textContent = storedResults.newTitle;
        titleScore.textContent = `Score: ${storedResults.titleScore}/100`;
        titleAnalysis.textContent = storedResults.titleAnalysis;

        // Populate description tab
        const descOriginal = modal.querySelector('#tab-description .original-content');
        const descSuggested = modal.querySelector('#tab-description .suggested-content');
        const descScore = modal.querySelector('#tab-description .score');
        const descAnalysis = modal.querySelector('#tab-description .analysis');

        descOriginal.textContent = product.description || 'Aucune description';
        descSuggested.textContent = storedResults.newDescription;
        descScore.textContent = `Score: ${storedResults.descriptionScore}/100`;
        descAnalysis.textContent = storedResults.descriptionAnalysis;

        // Populate analysis tab
        const globalScore = modal.querySelector('.global-score');
        const overallAnalysis = modal.querySelector('.overall-analysis');
        const improvementsList = modal.querySelector('.improvements-list');

        globalScore.textContent = `Score Global: ${storedResults.globalScore}/100`;
        overallAnalysis.textContent = storedResults.overallAnalysis;
        improvementsList.innerHTML = storedResults.priorityImprovements
          .map(imp => `<li>${imp}</li>`)
          .join('');

        // Show the modal
        modal.querySelector('.audit-modal').style.display = 'block';
      };
    } else {
      console.error('Compare button not found');
    }

    // Display the results summary
    const resultsDiv = btn.closest('.product-card').querySelector('.audit-results');
    if (resultsDiv) {
      console.log('Displaying results summary');
      resultsDiv.innerHTML = `
        <div class="audit-summary">
          <h4>Audit Results</h4>
          <p><strong>Global Score:</strong> ${auditResults.globalScore}/100</p>
          <p><strong>Analysis:</strong> ${auditResults.overallAnalysis}</p>
          <div class="priority-improvements">
            <h5>Priority Improvements:</h5>
            <ul>
              ${auditResults.priorityImprovements.map(imp => `<li>${imp}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }
  }
})();
