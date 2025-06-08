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
      const response = await fetch(`https://asmine-production.up.railway.app/api/products?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API response indicates failure');
      }

      return {
        products: data.products || [],
        totalProducts: data.totalProducts || 0,
        totalPages: data.totalPages || 1,
        itemsPerPage: 20
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      if (auditResultsDiv) {
        auditResultsDiv.innerHTML = `
          <div style="color: red; padding: 20px; text-align: center;">
            <h3>Error Loading Products</h3>
            <p>${error.message}</p>
            <p>Please check if the API server is accessible</p>
          </div>
        `;
      }
      return null;
    }
  }

  async function renderPage() {
    if (!auditResultsDiv) return;

    // Show loading state
    auditResultsDiv.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="spinner" style="display: inline-block;">
          <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle class="spinner" cx="12" cy="12" r="10" fill="none" stroke="#10a37f" stroke-width="2"/>
          </svg>
        </div>
        <p>Loading products...</p>
      </div>
    `;

    const data = await fetchProducts(currentPage);
    if (!data) return;

    const { products, totalProducts, totalPages } = data;
    const itemsPerPage = 20;

    // Calculate pagination values
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalProducts);

    // Create product cards
    auditResultsDiv.innerHTML = `
      <div class="products-grid">
        ${products.map((p, i) => `
          <div class="product-card" data-index="${(currentPage - 1) * itemsPerPage + i}">
            <div class="product-header">
              <img src="${p.images?.[0]?.src || 'https://via.placeholder.com/150'}" 
                   alt="${p.images?.[0]?.alt || p.name}"
                   style="width: 100%; height: 150px; object-fit: contain; background: #f5f5f5;" />
              <span class="product-status ${p.status}">${p.status}</span>
            </div>
            <div class="product-info">
              <h3>${p.name}</h3>
              <p class="product-meta">SKU: ${p.sku || 'N/A'} | Stock: ${p.stock || 0}</p>
              <p class="product-price">$${typeof p.price === 'number' ? p.price.toFixed(2) : p.price || '0.00'}</p>
              <p class="product-description">${p.short_description || p.description?.substring(0, 150) + '...' || 'No description available.'}</p>
              <div class="product-tags">
                ${(p.categories || []).map(cat => `<span class="category-tag">${cat.name || cat}</span>`).join('')}
                ${(p.tags || []).map(tag => `<span class="tag">${tag.name || tag}</span>`).join('')}
              </div>
              <button class="generate-prompt-btn">Generate ChatGPT Prompt</button>
              <div class="audit-results"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="pagination">
        <button id="firstPage" ${currentPage === 1 ? 'disabled' : ''}>⟪ First</button>
        <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>⟨ Previous</button>
        <span class="page-info">
          Page ${currentPage} of ${totalPages}
          (${startItem}-${endItem} of ${totalProducts} products)
        </span>
        <button id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>Next ⟩</button>
        <button id="lastPage" ${currentPage >= totalPages ? 'disabled' : ''}>Last ⟫</button>
      </div>
    `;

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
      if (currentPage < totalPages) {
        currentPage = totalPages;
        renderPage();
      }
    });

    // Add event listeners for generate prompt buttons
    const buttons = auditResultsDiv.querySelectorAll('.generate-prompt-btn');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', async () => {
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

        const textarea = document.querySelector('textarea');
        if (textarea) {
          try {
            // Clear any existing text
            textarea.value = '';
            textarea.focus();
            document.execCommand('insertText', false, prompt);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Find and click the send button
            const btnSend = textarea.closest('form').querySelector('button');
            if (btnSend) btnSend.click();

            // Wait for response
            let attempts = 0;
            const maxAttempts = 30;
            const checkResponse = async () => {
              const messages = document.querySelectorAll('.markdown.prose');
              const lastMessage = messages.length > 0 ? messages[messages.length - 1].innerText : null;
              
              if (lastMessage && lastMessage.includes('{') && lastMessage.includes('}')) {
                try {
                  const jsonStart = lastMessage.indexOf('{');
                  const jsonEnd = lastMessage.lastIndexOf('}') + 1;
                  const jsonString = lastMessage.substring(jsonStart, jsonEnd);
                  const auditData = JSON.parse(jsonString);

                  // Store the audit data for this specific product
                  productAuditData.set(p.id, auditData);

                  // Update UI with results
                  const resultDiv = document.querySelector(`.product-card[data-index="${(currentPage - 1) * itemsPerPage + i}"] .audit-results`);
                  resultDiv.innerHTML = `
                    <div class="audit-summary">
                      <h4>Audit Results</h4>
                      <p>Global Score: ${auditData.globalScore}/100</p>
                      <p>${auditData.overallAnalysis}</p>
                      <h5>Priority Improvements:</h5>
                      <ul>
                        ${auditData.priorityImprovements.map(imp => `<li>${imp}</li>`).join('')}
                      </ul>
                    </div>
                  `;

                  // Reset button state
                  btn.disabled = false;
                  btn.textContent = 'Generate ChatGPT Prompt';
                } catch (err) {
                  if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkResponse, 1000);
                  } else {
                    // Reset button state and show error
                    btn.disabled = false;
                    btn.textContent = 'Generate ChatGPT Prompt';
                    console.error('JSON parsing error:', err.message);
                    const resultDiv = document.querySelector(`.product-card[data-index="${(currentPage - 1) * itemsPerPage + i}"] .audit-results`);
                    if (resultDiv) {
                      resultDiv.innerHTML = `<div style="color: red; margin-top: 10px;">Error: ${err.message}. Please try again.</div>`;
                    }
                  }
                }
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkResponse, 1000);
              } else {
                // Reset button state and show timeout error
                btn.disabled = false;
                btn.textContent = 'Generate ChatGPT Prompt';
                const resultDiv = document.querySelector(`.product-card[data-index="${(currentPage - 1) * itemsPerPage + i}"] .audit-results`);
                if (resultDiv) {
                  resultDiv.innerHTML = '<div style="color: red; margin-top: 10px;">Timeout: No response received. Please try again.</div>';
                }
              }
            };

            // Start checking for response
            setTimeout(checkResponse, 1000);
          } catch (err) {
            // Reset button state and show error
            btn.disabled = false;
            btn.textContent = 'Generate ChatGPT Prompt';
            console.error('Error:', err.message);
            const resultDiv = document.querySelector(`.product-card[data-index="${(currentPage - 1) * itemsPerPage + i}"] .audit-results`);
            if (resultDiv) {
              resultDiv.innerHTML = `<div style="color: red; margin-top: 10px;">Error: ${err.message}. Please try again.</div>`;
            }
          }
        } else {
          // Reset button state and show error
          btn.disabled = false;
          btn.textContent = 'Generate ChatGPT Prompt';
          const resultDiv = document.querySelector(`.product-card[data-index="${(currentPage - 1) * itemsPerPage + i}"] .audit-results`);
          if (resultDiv) {
            resultDiv.innerHTML = '<div style="color: red; margin-top: 10px;">Cannot find ChatGPT input. Please try again.</div>';
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
