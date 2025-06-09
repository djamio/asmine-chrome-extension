function createAuditModal() {
    const modal = document.createElement('div');
    modal.id = 'compareModal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button id="closeModalBtn">×</button>
        <div id="compareTabs">
          <button class="tab-btn active" data-tab="title">Title</button>
          <button class="tab-btn" data-tab="short-desc">Short Description</button>
          <button class="tab-btn" data-tab="description">Full Description</button>
          <button class="tab-btn" data-tab="specs">Specifications</button>
          <button class="tab-btn" data-tab="categories">Categories</button>
          <button class="tab-btn" data-tab="tags">Tags</button>
        </div>
        <div id="compareContent">
          <div id="tab-title" class="tab-content"></div>
          <div id="tab-short-desc" class="tab-content" style="display: none;"></div>
          <div id="tab-description" class="tab-content" style="display: none;"></div>
          <div id="tab-specs" class="tab-content" style="display: none;"></div>
          <div id="tab-categories" class="tab-content" style="display: none;"></div>
          <div id="tab-tags" class="tab-content" style="display: none;"></div>
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
  