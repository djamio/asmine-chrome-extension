function createAuditModal() {
    const modal = document.createElement('div');
    modal.id = 'compareModal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9998;"></div>
      <div class="modal-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 1200px; max-height: 90vh; overflow-y: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 9999;">
        <button id="closeModalBtn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; z-index: 10000;">×</button>
        <div id="compareTabs" style="position: sticky; top: 0; background: white; padding: 10px 0; border-bottom: 1px solid #eee; margin: -20px -20px 20px -20px; padding: 20px;">
          <button class="tab-btn active" data-tab="title">Title</button>
          <button class="tab-btn" data-tab="short-desc">Short Description</button>
          <button class="tab-btn" data-tab="description">Description</button>
          <button class="tab-btn" data-tab="specs">Specifications</button>
          <button class="tab-btn" data-tab="categories">Categories</button>
          <button class="tab-btn" data-tab="tags">Tags</button>
          <button class="tab-btn" data-tab="reviews">Reviews</button>
        </div>
        <div id="compareContent">
          <div id="tab-title" class="tab-content"></div>
          <div id="tab-short-desc" class="tab-content" style="display: none;"></div>
          <div id="tab-description" class="tab-content" style="display: none;"></div>
          <div id="tab-specs" class="tab-content" style="display: none;"></div>
          <div id="tab-categories" class="tab-content" style="display: none;"></div>
          <div id="tab-tags" class="tab-content" style="display: none;"></div>
          <div id="tab-reviews" class="tab-content" style="display: none;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  
    // Add styles for the modal
    const style = document.createElement('style');
    style.textContent = `
      .tab-btn {
        padding: 8px 16px;
        margin: 0 4px;
        border: none;
        background: #f0f0f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .tab-btn:hover {
        background: #e0e0e0;
      }
      .tab-btn.active {
        background: #10a37f;
        color: white;
      }
      .modal-content {
        scrollbar-width: thin;
        scrollbar-color: #10a37f #f0f0f0;
      }
      .modal-content::-webkit-scrollbar {
        width: 8px;
      }
      .modal-content::-webkit-scrollbar-track {
        background: #f0f0f0;
      }
      .modal-content::-webkit-scrollbar-thumb {
        background-color: #10a37f;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  
    // Add tab switching functionality
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(div => div.style.display = 'none');
        btn.classList.add('active');
        document.getElementById('tab-' + tab).style.display = 'block';
      });
    });
  
    // Close button and overlay functionality
    const closeBtn = modal.querySelector('#closeModalBtn');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
      modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
  }
  
window.createAuditModal = createAuditModal;
  