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

    // Populate title tab
    const titleTab = modal.querySelector('#tab-title');
    if (titleTab) {
      const titleOriginal = titleTab.querySelector('.original-content');
      const titleSuggested = titleTab.querySelector('.suggested-content');
      const titleScore = titleTab.querySelector('.score');
      const titleAnalysis = titleTab.querySelector('.analysis');

      if (titleOriginal) titleOriginal.textContent = product.title || 'No title';
      if (titleSuggested) titleSuggested.textContent = auditResults.newTitle || 'No suggestion';
      if (titleScore) titleScore.textContent = `Score: ${auditResults.titleScore || 0}/100`;
      if (titleAnalysis) titleAnalysis.textContent = auditResults.titleAnalysis || 'No analysis available';
    }

    // Populate short description tab
    const shortDescTab = modal.querySelector('#tab-short-description');
    if (shortDescTab) {
      const shortDescOriginal = shortDescTab.querySelector('.original-content');
      const shortDescSuggested = shortDescTab.querySelector('.suggested-content');
      const shortDescScore = shortDescTab.querySelector('.score');
      const shortDescAnalysis = shortDescTab.querySelector('.analysis');

      if (shortDescOriginal) shortDescOriginal.textContent = product.shortDescription || 'No short description';
      if (shortDescSuggested) shortDescSuggested.textContent = auditResults.newShortDescription || 'No suggestion';
      if (shortDescScore) shortDescScore.textContent = `Score: ${auditResults.shortDescriptionScore || 0}/100`;
      if (shortDescAnalysis) shortDescAnalysis.textContent = auditResults.shortDescriptionAnalysis || 'No analysis available';
    }

    // Populate description tab
    const descTab = modal.querySelector('#tab-description');
    if (descTab) {
      const descOriginal = descTab.querySelector('.original-content');
      const descSuggested = descTab.querySelector('.suggested-content');
      const descScore = descTab.querySelector('.score');
      const descAnalysis = descTab.querySelector('.analysis');

      if (descOriginal) descOriginal.textContent = product.description || 'No description';
      if (descSuggested) descSuggested.textContent = auditResults.newDescription || 'No suggestion';
      if (descScore) descScore.textContent = `Score: ${auditResults.descriptionScore || 0}/100`;
      if (descAnalysis) descAnalysis.textContent = auditResults.descriptionAnalysis || 'No analysis available';
    }

    // Populate specifications tab
    const specsTab = modal.querySelector('#tab-specifications');
    if (specsTab) {
      const specsOriginal = specsTab.querySelector('.original-content');
      const specsSuggested = specsTab.querySelector('.suggested-content');
      const specsScore = specsTab.querySelector('.score');
      const specsAnalysis = specsTab.querySelector('.analysis');

      if (specsOriginal) specsOriginal.textContent = (product.attributes || []).map(attr => 
        `${attr.name || ''}: ${attr.options?.join(', ') || ''}`
      ).join('\n') || 'No specifications';
      
      if (specsSuggested) specsSuggested.textContent = (auditResults.suggestedSpecs || []).join('\n') || 'No suggestions';
      if (specsScore) specsScore.textContent = `Score: ${auditResults.specificationsScore || 0}/100`;
      if (specsAnalysis) specsAnalysis.textContent = auditResults.specificationsAnalysis || 'No analysis available';
    }

    // Populate categories tab
    const categoriesTab = modal.querySelector('#tab-categories');
    if (categoriesTab) {
      const categoriesOriginal = categoriesTab.querySelector('.original-content');
      const categoriesSuggested = categoriesTab.querySelector('.suggested-content');
      const categoriesScore = categoriesTab.querySelector('.score');
      const categoriesAnalysis = categoriesTab.querySelector('.analysis');

      if (categoriesOriginal) {
        const categories = product.categories || [];
        categoriesOriginal.textContent = categories.map(cat => 
          typeof cat === 'object' ? cat.name : cat
        ).join('\n') || 'No categories';
      }
      
      if (categoriesSuggested) categoriesSuggested.textContent = (auditResults.suggestedCategories || []).join('\n') || 'No suggestions';
      if (categoriesScore) categoriesScore.textContent = `Score: ${auditResults.categoriesScore || 0}/100`;
      if (categoriesAnalysis) categoriesAnalysis.textContent = auditResults.categoriesAnalysis || 'No analysis available';
    }

    // Populate tags tab
    const tagsTab = modal.querySelector('#tab-tags');
    if (tagsTab) {
      const tagsOriginal = tagsTab.querySelector('.original-content');
      const tagsSuggested = tagsTab.querySelector('.suggested-content');
      const tagsScore = tagsTab.querySelector('.score');
      const tagsAnalysis = tagsTab.querySelector('.analysis');

      if (tagsOriginal) {
        const tags = product.tags || [];
        tagsOriginal.textContent = tags.map(tag => 
          typeof tag === 'object' ? tag.name : tag
        ).join('\n') || 'No tags';
      }
      
      if (tagsSuggested) tagsSuggested.textContent = (auditResults.suggestedTags || []).join('\n') || 'No suggestions';
      if (tagsScore) tagsScore.textContent = `Score: ${auditResults.tagsScore || 0}/100`;
      if (tagsAnalysis) tagsAnalysis.textContent = auditResults.tagsAnalysis || 'No analysis available';
    }

    // Populate global analysis tab
    const analysisTab = modal.querySelector('#tab-analysis');
    if (analysisTab) {
      const globalScore = analysisTab.querySelector('.global-score');
      const overallAnalysis = analysisTab.querySelector('.overall-analysis');
      const improvementsList = analysisTab.querySelector('.improvements-list');

      if (globalScore) globalScore.textContent = `Global Score: ${auditResults.globalScore || 0}/100`;
      if (overallAnalysis) overallAnalysis.textContent = auditResults.overallAnalysis || 'No analysis available';
      if (improvementsList) {
        improvementsList.innerHTML = (auditResults.priorityImprovements || [])
          .map(imp => `<li>${imp}</li>`)
          .join('') || '<li>No improvements suggested</li>';
      }
    }
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
})();
