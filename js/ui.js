export function createProductCard(product, index, currentPage, itemsPerPage) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.index = (currentPage - 1) * itemsPerPage + index;

  card.innerHTML = `
    <div class="product-header">
      <img src="${product.images?.[0]?.src || 'https://via.placeholder.com/150'}" 
           alt="${product.images?.[0]?.alt || product.name}"
           style="width: 100%; height: 150px; object-fit: contain; background: #f5f5f5;" />
      <span class="product-status ${product.status}">${product.status}</span>
    </div>
    <div class="product-info">
      <h3>${product.name}</h3>
      <p class="product-meta">SKU: ${product.sku || 'N/A'} | Stock: ${product.stock || 0}</p>
      <p class="product-price">$${typeof product.price === 'number' ? product.price.toFixed(2) : product.price || '0.00'}</p>
      <p class="product-description">${product.short_description || product.description?.substring(0, 150) + '...' || 'No description available.'}</p>
      <div class="product-tags">
        ${(product.categories || []).map(cat => `<span class="category-tag">${cat.name || cat}</span>`).join('')}
        ${(product.tags || []).map(tag => `<span class="tag">${tag.name || tag}</span>`).join('')}
      </div>
      <button class="generate-prompt-btn">
        <span class="btn-text">Generate ChatGPT Prompt</span>
        <span class="spinner" style="display: none;">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle class="spinner" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </span>
      </button>
      <div class="audit-results"></div>
    </div>
  `;

  return card;
}

export function createPagination(currentPage, totalPages, totalProducts, itemsPerPage) {
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts);

  return `
    <button id="firstPage" ${currentPage === 1 ? 'disabled' : ''}>⟪ First</button>
    <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>⟨ Previous</button>
    <span class="page-info">
      Page ${currentPage} of ${totalPages}
      (${startItem}-${endItem} of ${totalProducts} products)
    </span>
    <button id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>Next ⟩</button>
    <button id="lastPage" ${currentPage >= totalPages ? 'disabled' : ''}>Last ⟫</button>
  `;
}

export function showLoadingState(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner" style="display: inline-block;">
        <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="spinner" cx="12" cy="12" r="10" fill="none" stroke="#10a37f" stroke-width="2"/>
        </svg>
      </div>
      <p>Loading products...</p>
    </div>
  `;
}

export function showError(container, error) {
  container.innerHTML = `
    <div style="color: red; padding: 20px; text-align: center;">
      <h3>Error Loading Products</h3>
      <p>${error.message}</p>
      <p>Please check if the API server is accessible</p>
    </div>
  `;
}

export function createSuccessIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'success-indicator';
  indicator.innerHTML = `
    <div style="color: #10a37f; margin-top: 10px; display: flex; align-items: center;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM7 11.4L3.6 8 5 6.6l2 2 4-4L12.4 6 7 11.4z" fill="currentColor"/>
      </svg>
      Update successful
    </div>
  `;
  return indicator;
}

export function createErrorIndicator(message) {
  const indicator = document.createElement('div');
  indicator.className = 'error-indicator';
  indicator.innerHTML = `
    <div style="color: #dc3545; margin-top: 10px; display: flex; align-items: center;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" fill="currentColor"/>
      </svg>
      ${message}
    </div>
  `;
  return indicator;
}

export function createReviewsSection(reviews = [], auditData = {}) {
  return `
    <h3>Reviews Analysis</h3>
    <div class="content-section">
      <div class="reviews-stats">
        <div class="rating-summary">
          <h4>Rating Summary</h4>
          <div class="average-rating">
            <span class="rating-stars">${'★'.repeat(Math.round(auditData.averageRating || 0))}${'☆'.repeat(5 - Math.round(auditData.averageRating || 0))}</span>
            <span class="rating-number">${(auditData.averageRating || 0).toFixed(1)}</span>
            <span class="total-reviews">(${reviews.length} reviews)</span>
          </div>
        </div>
      </div>

      <div class="reviews-list">
        <h4>Current Reviews</h4>
        ${reviews.length > 0 ? `
          <div class="reviews-container">
            ${reviews.map(review => `
              <div class="review-item">
                <div class="review-header">
                  <div class="reviewer-info">
                    <span class="reviewer-name">${review.reviewer || 'Anonymous'}</span>
                    <span class="review-date">${new Date(review.date_created || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <div class="review-content">
                  <p class="review-text">${review.review || ''}</p>
                </div>
                <div class="review-actions">
                  <button class="edit-review-btn" data-review-id="${review.id}">Edit</button>
                  <button class="delete-review-btn" data-review-id="${review.id}">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p>No reviews yet</p>'}
      </div>

      <div class="add-review-section">
        <h4>Add New Review</h4>
        <div class="review-form">
          <div class="form-group">
            <label for="reviewer-name">Name:</label>
            <input type="text" id="reviewer-name" class="review-input" placeholder="Your name">
          </div>
          <div class="form-group">
            <label for="review-rating">Rating:</label>
            <div class="rating-input">
              ${[5,4,3,2,1].map(num => `
                <input type="radio" id="star${num}" name="rating" value="${num}">
                <label for="star${num}" title="${num} stars">★</label>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label for="review-text">Review:</label>
            <textarea id="review-text" class="review-input" rows="4" placeholder="Write your review here"></textarea>
          </div>
          <div class="form-actions">
            <button class="generate-review-btn">Generate Review with ChatGPT</button>
            <button class="submit-review-btn">Submit Review</button>
          </div>
        </div>
      </div>

      <div class="reviews-analysis">
        <h4>Reviews Analysis</h4>
        <p><strong>Score:</strong> ${auditData.reviewsScore || 0}/100</p>
        <p><strong>Analysis:</strong> ${auditData.reviewAnalysis || 'No analysis available'}</p>
        <button class="apply-changes-btn" data-field="reviews">Apply Changes</button>
      </div>
    </div>
  `;
} 