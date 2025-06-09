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
                   alt="${p.name}"
                   style="width: 100%; height: 150px; object-fit: contain; background: #f5f5f5;" />
              <span class="product-status">${p.status || 'Active'}</span>
            </div>
            <div class="product-info">
              <h3>${p.name}</h3>
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Stock: ${p.stock_quantity || 0}</p>
              <p class="product-price">${p.price || '$0.00'}</p>
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
      btn.addEventListener('click', () => {
        const p = products[i];
        btn.disabled = true;
        btn.textContent = 'Generating...';

        const prompt = `
Audit the following WooCommerce product and provide a comprehensive analysis:

Product Details:
- Title: ${p.name}
- Short Description: ${p.short_description || p.description?.substring(0, 150) + '...'}
- Full Description: ${p.description}
- Specifications: ${JSON.stringify(p.attributes || [])}
- Categories: ${JSON.stringify(p.categories || [])}
- Tags: ${JSON.stringify(p.tags || [])}
- Reviews Count: ${p.reviews_count || 0}

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
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
              const responseElement = document.querySelector('.markdown-content');
              if (responseElement) {
                try {
                  const responseText = responseElement.textContent;
                  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const auditResults = JSON.parse(jsonMatch[0]);
                    
                    // Store the results
                    localStorage.setItem(`audit_${p.id}`, JSON.stringify(auditResults));
                    
                    // Enable the compare button
                    const compareBtn = btn.parentElement.querySelector('.compare-btn');
                    compareBtn.disabled = false;

                    // Display the results summary
                    const resultsDiv = btn.closest('.product-card').querySelector('.audit-results');
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

                    // Stop observing
                    observer.disconnect();
                  }
                } catch (error) {
                  console.error('Error parsing ChatGPT response:', error);
                }
              }
            }
          }
        });

        // Start observing ChatGPT's response area
        const targetNode = document.querySelector('.chat-content');
        if (targetNode) {
          observer.observe(targetNode, { childList: true, subtree: true });
        }

        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Generate ChatGPT Prompt';
        }, 1000);
      });
    });

    // Add event listeners for compare buttons
    const compareButtons = auditResultsDiv.querySelectorAll('.compare-btn');
    compareButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const productId = btn.dataset.productId;
        const modal = document.getElementById('compareModal');
        if (!modal) {
          createAuditModal();
        }

        const product = products.find(p => p.id === productId);
        if (!product) return;

        const auditResults = JSON.parse(localStorage.getItem(`audit_${product.id}`));
        if (!auditResults) {
          alert('No audit results available for comparison. Please generate an audit first.');
          return;
        }

        // Show modal
        modal.style.display = 'block';

        // Update tab contents
        document.getElementById('tab-title').innerHTML = `
          <div class="comparison-container">
            <div class="version-block">
              <h4>Original Title</h4>
              <div class="original-content">${product.name}</div>
            </div>
            <div class="version-block">
              <h4>Enhanced Title <span class="score">(Score: ${auditResults.titleScore}/100)</span></h4>
              <div class="enhanced-content" contenteditable="true">${auditResults.newTitle}</div>
              <button class="apply-changes-btn" data-field="name">Apply Changes</button>
            </div>
          </div>
          <div class="analysis-section">
            <p><strong>Analysis:</strong> ${auditResults.titleAnalysis}</p>
          </div>
        `;

        document.getElementById('tab-short-desc').innerHTML = `
          <div class="comparison-container">
            <div class="version-block">
              <h4>Original Short Description</h4>
              <div class="original-content">${product.short_description || ''}</div>
            </div>
            <div class="version-block">
              <h4>Enhanced Short Description <span class="score">(Score: ${auditResults.shortDescriptionScore}/100)</span></h4>
              <div class="enhanced-content" contenteditable="true">${auditResults.newShortDescription}</div>
              <button class="apply-changes-btn" data-field="short_description">Apply Changes</button>
            </div>
          </div>
          <div class="analysis-section">
            <p><strong>Analysis:</strong> ${auditResults.shortDescriptionAnalysis}</p>
          </div>
        `;

        document.getElementById('tab-description').innerHTML = `
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

        document.getElementById('tab-specs').innerHTML = `
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
              <div class="enhanced-content">
                ${auditResults.suggestedSpecs.map(spec => `<p>${spec}</p>`).join('')}
              </div>
            </div>
          </div>
          <div class="analysis-section">
            <p><strong>Analysis:</strong> ${auditResults.specificationsAnalysis}</p>
          </div>
        `;

        document.getElementById('tab-categories').innerHTML = `
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
              <div class="enhanced-content">
                ${auditResults.suggestedCategories.map(cat => `
                  <span class="category-tag">${cat}</span>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="analysis-section">
            <p><strong>Analysis:</strong> ${auditResults.categoriesAnalysis}</p>
          </div>
        `;

        document.getElementById('tab-tags').innerHTML = `
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
              <div class="enhanced-content">
                ${auditResults.suggestedTags.map(tag => `
                  <span class="tag">${tag}</span>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="analysis-section">
            <p><strong>Analysis:</strong> ${auditResults.tagsAnalysis}</p>
          </div>
        `;

        // Add event listeners for apply changes buttons
        modal.querySelectorAll('.apply-changes-btn').forEach(applyBtn => {
          applyBtn.addEventListener('click', async () => {
            const field = applyBtn.dataset.field;
            const newContent = applyBtn.parentElement.querySelector('.enhanced-content').textContent;
            
            try {
              applyBtn.disabled = true;
              applyBtn.textContent = 'Applying...';
              
              // Update the product via WooCommerce API
              const response = await fetch(`${apiBaseUrl}/products/${product.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-woo-user-id': localStorage.getItem('user_id')
                },
                body: JSON.stringify({
                  [field]: newContent
                })
              });

              if (!response.ok) throw new Error('Failed to update product');
              
              applyBtn.textContent = 'Applied!';
              setTimeout(() => {
                applyBtn.textContent = 'Apply Changes';
                applyBtn.disabled = false;
              }, 2000);

              // Refresh the product display
              renderPage();
            } catch (error) {
              console.error('Error applying changes:', error);
              applyBtn.textContent = 'Error';
              setTimeout(() => {
                applyBtn.textContent = 'Apply Changes';
                applyBtn.disabled = false;
              }, 2000);
            }
          });
        });
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
})();
