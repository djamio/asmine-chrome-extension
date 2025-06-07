class ReviewsManager {
  constructor() {
    this.reviews = new Map(); // Store reviews by product ID
    this.currentPage = 1;
    this.itemsPerPage = 5;
    this.totalPages = 1;
    this.cachedProducts = null;
  }

  // Initialize the reviews tab
  initReviewsTab() {
    const reviewsTab = document.getElementById('tab-customer-reviews');
    if (!reviewsTab) return;

    reviewsTab.innerHTML = this.createReviewsTabContent();
    this.attachEventListeners();
    
    // Try to get cached products first
    if (window.cachedProducts && window.cachedProducts.length > 0) {
      this.cachedProducts = window.cachedProducts;
      this.renderReviewsList();
    } else {
      // If no cached products, fetch them
      this.fetchProducts().then(products => {
        this.cachedProducts = products;
        this.renderReviewsList();
      });
    }
  }

  // Create the main content structure for the reviews tab
  createReviewsTabContent() {
    return `
      <div class="reviews-tab-container">
        <div class="reviews-header">
          <h2>Customer Reviews</h2>
          <button id="generate-all-reviews" class="action-button">
            Generate Reviews for All Products
          </button>
        </div>
        <div class="reviews-list-container">
          <!-- Reviews will be rendered here -->
        </div>
        <div class="reviews-pagination">
          <button id="first-page" class="pagination-btn">⟪ First</button>
          <button id="prev-page" class="pagination-btn">⟨ Previous</button>
          <span class="page-info"></span>
          <button id="next-page" class="pagination-btn">Next ⟩</button>
          <button id="last-page" class="pagination-btn">Last ⟫</button>
        </div>
      </div>
    `;
  }

  // Render the reviews list with pagination
  renderReviewsList() {
    const container = document.querySelector('.reviews-list-container');
    if (!container || !this.cachedProducts) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const productsToShow = this.cachedProducts.slice(startIndex, endIndex);

    let html = '';
    for (const product of productsToShow) {
      const reviews = this.reviews.get(product.id) || [];
      html += `
        <div class="product-reviews-section" data-product-id="${product.id}">
          <h3>${product.name}</h3>
          <div class="product-info">
            <p class="product-meta">SKU: ${product.sku || 'N/A'} | Price: $${typeof product.price === 'number' ? product.price.toFixed(2) : product.price || '0.00'}</p>
            <p class="product-description">${product.short_description || product.description?.substring(0, 150) + '...' || 'No description available.'}</p>
          </div>
          <div class="reviews-summary">
            <div class="average-rating">
              ${reviews.length > 0 ? this.generateStarRating(this.calculateAverageRating(reviews)) : 'No reviews yet'}
              ${reviews.length > 0 ? `<span class="rating-count">(${reviews.length} reviews)</span>` : ''}
            </div>
            <div class="reviews-actions">
              <button class="generate-reviews-btn action-button" data-product-id="${product.id}">
                Generate Reviews
              </button>
              ${reviews.length > 0 ? `
                <button class="apply-reviews-btn action-button" data-product-id="${product.id}">
                  Apply Reviews
                </button>
              ` : ''}
            </div>
          </div>
          <div class="reviews-list">
            ${reviews.map(review => this.createReviewCard(review)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html || '<p class="no-products">No products available. Please run an audit first to load products.</p>';
    this.updatePaginationInfo();
    this.attachReviewActionListeners();
  }

  // Attach event listeners for pagination and buttons
  attachEventListeners() {
    document.getElementById('generate-all-reviews')?.addEventListener('click', () => this.generateAllReviews());
    document.getElementById('first-page')?.addEventListener('click', () => this.goToPage(1));
    document.getElementById('prev-page')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    document.getElementById('next-page')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    document.getElementById('last-page')?.addEventListener('click', () => this.goToPage(this.totalPages));
  }

  // Attach event listeners for review action buttons
  attachReviewActionListeners() {
    // Generate reviews for a single product
    document.querySelectorAll('.generate-reviews-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        const product = this.cachedProducts.find(p => p.id === parseInt(productId));
        if (!product) return;

        const originalText = e.target.textContent;
        e.target.disabled = true;
        e.target.textContent = 'Generating...';

        try {
          await this.generateProductReviews(product);
          this.renderReviewsList();
        } catch (error) {
          console.error('Error generating reviews:', error);
          this.showErrorMessage('Failed to generate reviews');
        } finally {
          e.target.disabled = false;
          e.target.textContent = originalText;
        }
      });
    });

    // Apply reviews for a single product
    document.querySelectorAll('.apply-reviews-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        const reviews = this.reviews.get(parseInt(productId));
        if (!reviews) return;

        const originalText = e.target.textContent;
        e.target.disabled = true;
        e.target.textContent = 'Applying...';

        try {
          await this.applyReviewsToProduct(productId, reviews);
          e.target.textContent = 'Applied';
          this.showSuccessMessage('Reviews applied successfully!');
        } catch (error) {
          console.error('Error applying reviews:', error);
          this.showErrorMessage('Failed to apply reviews');
          e.target.textContent = originalText;
          e.target.disabled = false;
        }
      });
    });
  }

  // Update pagination information
  updatePaginationInfo() {
    const pageInfo = document.querySelector('.page-info');
    if (!pageInfo || !this.cachedProducts) return;

    const totalItems = this.cachedProducts.length;
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, totalItems);

    pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages} (${start}-${end} of ${totalItems} products)`;

    // Update button states
    document.getElementById('first-page').disabled = this.currentPage === 1;
    document.getElementById('prev-page').disabled = this.currentPage === 1;
    document.getElementById('next-page').disabled = this.currentPage >= this.totalPages;
    document.getElementById('last-page').disabled = this.currentPage >= this.totalPages;
  }

  // Helper function to extract JSON from text
  extractJSONFromText(text) {
    try {
      // Try to find JSON array in the text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no array found, try to find any JSON object
      const objectMatch = text.match(/{[\s\S]*}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Error extracting JSON:', error);
      throw new Error('Failed to parse ChatGPT response as JSON');
    }
  }

  // Generate reviews for a single product
  async generateProductReviews(product) {
    const prompt = `
      Generate 5 realistic customer reviews for the following product:
      
      Product Name: ${product.name}
      Description: ${product.description || product.short_description}
      Price: $${product.price}
      
      For each review, provide:
      1. Reviewer name (realistic)
      2. Rating (1-5 stars)
      3. Review text (50-100 words)
      4. Date (within last 6 months)
      
      Make the reviews diverse in:
      - Ratings (mix of positive and negative)
      - Writing styles
      - Specific product features mentioned
      - Length and detail
      
      Return ONLY a JSON array with this exact format:
      [
        {
          "reviewer": "Name",
          "rating": number,
          "review": "text",
          "date": "YYYY-MM-DD"
        }
      ]
      
      Ensure the response is ONLY the JSON array, no other text.
    `;

    try {
      // Send to ChatGPT and get response
      const response = await this.sendToChatGPT(prompt);
      const reviews = this.extractJSONFromText(response);
      
      // Validate the reviews structure
      if (!Array.isArray(reviews)) {
        throw new Error('Invalid reviews format: expected array');
      }

      // Validate each review
      reviews.forEach((review, index) => {
        if (!review.reviewer || !review.rating || !review.review || !review.date) {
          throw new Error(`Invalid review format at index ${index}`);
        }
        if (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5) {
          review.rating = parseInt(review.rating) || 3; // Default to 3 if invalid
        }
        // Ensure date is valid
        if (!Date.parse(review.date)) {
          review.date = new Date().toISOString().split('T')[0]; // Default to today if invalid
        }
      });
      
      // Store the reviews for this product
      this.reviews.set(product.id, reviews);
      
      return reviews;
    } catch (error) {
      console.error('Error generating reviews:', error);
      this.showErrorMessage(`Failed to generate reviews: ${error.message}`);
      return null;
    }
  }

  // Generate reviews for all products
  async generateAllReviews() {
    const btn = document.getElementById('generate-all-reviews');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      const products = await this.fetchProducts();
      for (const product of products) {
        await this.generateProductReviews(product);
      }
      this.renderReviewsList();
    } catch (error) {
      console.error('Error generating all reviews:', error);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // Create a single review card
  createReviewCard(review) {
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <span class="reviewer-name">${review.reviewer}</span>
            <div class="review-rating">${this.generateStarRating(review.rating)}</div>
          </div>
          <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
        </div>
        <div class="review-content">${review.review}</div>
      </div>
    `;
  }

  // Generate star rating HTML
  generateStarRating(rating) {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  // Calculate average rating
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }

  // Navigate to a specific page
  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderReviewsList();
  }

  // Apply reviews to a product
  async applyReviewsToProduct(productId, reviews) {
    const response = await fetch(`https://asmine-production.up.railway.app/api/products/${productId}/reviews/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ reviews })
    });

    if (!response.ok) {
      throw new Error('Failed to apply reviews');
    }

    return response.json();
  }

  // Show success message
  showSuccessMessage(message) {
    const div = document.createElement('div');
    div.className = 'success-message';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  // Show error message
  showErrorMessage(message) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  // Helper function to send prompts to ChatGPT
  async sendToChatGPT(prompt) {
    const textarea = document.querySelector('textarea');
    if (!textarea) throw new Error('ChatGPT input not found');

    textarea.value = prompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    const sendButton = textarea.closest('form').querySelector('button');
    if (!sendButton) throw new Error('Send button not found');
    
    sendButton.click();

    // Wait for response
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkResponse = () => {
        const messages = document.querySelectorAll('.markdown.prose');
        const lastMessage = messages[messages.length - 1]?.innerText;
        
        if (lastMessage) {
          try {
            // Try to extract JSON from the response
            resolve(lastMessage);
          } catch (error) {
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkResponse, 1000);
            } else {
              reject(new Error('Timeout waiting for valid ChatGPT response'));
            }
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkResponse, 1000);
        } else {
          reject(new Error('Timeout waiting for ChatGPT response'));
        }
      };
      
      setTimeout(checkResponse, 1000);
    });
  }

  // Fetch products from API
  async fetchProducts() {
    const response = await fetch('https://asmine-production.up.railway.app/api/products', {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return data.products || [];
  }
}

// Make ReviewsManager available globally
window.ReviewsManager = ReviewsManager; 