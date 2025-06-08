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

  // Function to fetch products from API
  async function fetchProducts(page = 1) {
    try {
      // Check if authorized with WooCommerce first
      const auth = await chrome.storage.local.get(['wooAuth']);
      if (!auth.wooAuth?.isConnected || !auth.wooAuth?.userId) {
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

      const response = await fetch(`https://asmine-production.up.railway.app/api/woo/products?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-woo-user-id': auth.wooAuth.userId
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('WooCommerce products response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'API response indicates failure');
      }

      // Return pagination data along with products
      return {
        products: data.products || [],
        totalProducts: data.totalProducts || data.products?.length || 0,
        totalPages: data.totalPages || Math.ceil((data.totalProducts || data.products?.length) / 10),
        itemsPerPage: data.itemsPerPage || 10
      };
    } catch (error) {
      console.error('Error fetching WooCommerce products:', error);
      if (auditResultsDiv) {
        auditResultsDiv.innerHTML = `
          <div style="color: red; padding: 20px; text-align: center;">
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

  async function renderPage() {
    if (!auditResultsDiv) return;

    const data = await fetchProducts(currentPage);
    if (!data) return;

    const { products, totalProducts, totalPages } = data;

    // Create product cards
    auditResultsDiv.innerHTML = `
      <div class="products-grid">
        ${products.map((p, i) => `
          <div class="product-card" data-index="${i}">
            <div class="product-header">
              <img src="${p.image || 'https://via.placeholder.com/150'}" 
                   alt="${p.title}"
                   style="width: 100%; height: 150px; object-fit: contain; background: #f5f5f5;" />
              <span class="product-status">${p.status || 'Active'}</span>
            </div>
            <div class="product-info">
              <h3>${p.title}</h3>
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Stock: ${p.stock_quantity || 0}</p>
              <p class="product-price">${p.price || '$0.00'}</p>
              <p class="product-description">${p.description?.substring(0, 150) + '...' || 'No description available.'}</p>
              <div class="product-tags">
                ${(p.categories || []).map(cat => `
                  <span class="category-tag">${typeof cat === 'object' ? cat.name : cat}</span>
                `).join('')}
                ${(p.tags || []).map(tag => `
                  <span class="tag">${typeof tag === 'object' ? tag.name : tag}</span>
                `).join('')}
              </div>
              <button class="generate-prompt-btn">Generate ChatGPT Prompt</button>
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
- Title: ${p.title}
- Description: ${p.description}
- Price: ${p.price}
- Stock: ${p.stock_quantity}
- SKU: ${p.sku || 'N/A'}

Please analyze all aspects and return a JSON response with the following structure:
{
  "titleScore": number (0-100),
  "titleAnalysis": string,
  "newTitle": string,
  "descriptionScore": number (0-100),
  "descriptionAnalysis": string,
  "newDescription": string,
  "priceAnalysis": string,
  "inventoryAnalysis": string,
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
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Generate ChatGPT Prompt';
        }, 1000);
      });
    });

    // Add pagination event listeners
    document.getElementById('firstPage')?.addEventListener('click', () => {
      if (currentPage !== 1) {
        currentPage = 1;
        renderPage();
      }
    });

    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
      }
    });

    document.getElementById('lastPage')?.addEventListener('click', () => {
      if (currentPage !== totalPages) {
        currentPage = totalPages;
        renderPage();
      }
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
          btn.addEventListener('click', () => {
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
