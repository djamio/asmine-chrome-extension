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
      // Check if authorized with eBay first
      const auth = await chrome.storage.local.get(['ebayAuth']);
      if (!auth.ebayAuth?.isAuthorized) {
        auditResultsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p>Please authorize with eBay first to view products.</p>
            <button id="goToEbayAuth" class="btn btn-primary">Go to eBay Authorization</button>
          </div>
        `;
        
        // Add click handler for the auth button
        document.getElementById('goToEbayAuth')?.addEventListener('click', () => {
          // Switch to eBay auth tab
          const ebayAuthTab = document.querySelector('[data-tab="ebay"]');
          if (ebayAuthTab) {
            ebayAuthTab.click();
          }
        });
        
        return null;
      }

      // Add loading state
      auditResultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div class="spinner" style="display: inline-block;">
            <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle class="spinner" cx="12" cy="12" r="10" fill="none" stroke="#10a37f" stroke-width="2"/>
            </svg>
          </div>
          <p>Loading eBay products...</p>
        </div>
      `;

      console.log('Making API call with state:', auth.ebayAuth.state);
      const response = await fetch('https://asmine-production.up.railway.app/api/ebay/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-ebay-state': auth.ebayAuth.state
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('eBay products response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'API response indicates failure');
      }

      return {
        products: data.products || [],
        totalProducts: data.products?.length || 0,
        totalPages: 1,
        itemsPerPage: data.products?.length || 0
      };
    } catch (error) {
      console.error('Error fetching eBay products:', error);
      if (auditResultsDiv) {
        auditResultsDiv.innerHTML = `
          <div style="color: red; padding: 20px; text-align: center;">
            <h3>Error Loading eBay Products</h3>
            <p>${error.message}</p>
            <button id="retryEbayProducts" class="btn btn-secondary">Retry</button>
          </div>
        `;
        
        // Add retry handler
        document.getElementById('retryEbayProducts')?.addEventListener('click', () => {
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

    const { products, totalProducts } = data;

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
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Quantity: ${p.quantity || 0}</p>
              <p class="product-price">${p.price || '$0.00'}</p>
              <p class="product-description">${p.description?.substring(0, 150) + '...' || 'No description available.'}</p>
              <button class="generate-prompt-btn">Generate ChatGPT Prompt</button>
              <div class="audit-results"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="products-summary">
        <p>Total Products: ${totalProducts}</p>
      </div>
    `;

    // Add event listeners for generate prompt buttons
    const buttons = auditResultsDiv.querySelectorAll('.generate-prompt-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', async () => {
        const p = products[i];
        btn.disabled = true;
        btn.textContent = 'Generating...';

        const prompt = `
Audit the following eBay product and provide a comprehensive analysis:

Product Details:
- Title: ${p.title}
- Description: ${p.description}
- Price: ${p.price}
- Quantity: ${p.quantity}
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

        const textarea = document.querySelector('textarea');
        if (textarea) {
          try {
            textarea.value = prompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          } catch (error) {
            console.error('Error sending prompt:', error);
          } finally {
            btn.disabled = false;
            btn.textContent = 'Generate ChatGPT Prompt';
          }
        }
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

        // Add slider toggle functionality
        const toggleBtn = document.querySelector('.my-slider-toggle-btn');
        const slider = document.querySelector('.my-slider');
        console.log('Toggle button found:', !!toggleBtn);
        console.log('Slider found:', !!slider);

        toggleBtn.addEventListener('click', () => {
          slider.classList.add('open');
          document.body.classList.add('slider-open');
          toggleBtn.style.display = 'none';
        });

        slider.querySelector('.my-slider-close').addEventListener('click', () => {
          slider.classList.remove('open');
          document.body.classList.remove('slider-open');
          toggleBtn.style.display = 'block';
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

        // Initialize eBay authorization
        console.log('Initializing eBay authorization...');
        if (typeof window.EbayAuth === 'undefined') {
          console.error('EbayAuth is not loaded. Make sure ebayAuth.js is loaded before slider.js');
          return;
        }

        const ebayAuth = new window.EbayAuth();
        const authorizeButton = document.getElementById('authorizeEbay');
        console.log('Authorize button found:', !!authorizeButton);

        if (authorizeButton) {
          console.log('Adding click listener to authorize button');
          authorizeButton.onclick = (e) => {
            e.preventDefault();
            console.log('Authorize button clicked');
            ebayAuth.authorize();
          };
        } else {
          console.error('Authorize button not found in DOM');
        }

        // Initialize the audit results div
        auditResultsDiv = container.querySelector('#auditResults');
        console.log('Audit results div found:', !!auditResultsDiv);
        renderPage();
      })
      .catch(error => {
        console.error('Error injecting slider:', error);
      });
  }
})();
