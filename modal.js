function createAuditModal() {
  console.log('Starting modal creation');
  // Remove any existing modal
  const existingModal = document.getElementById('auditModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
    const modal = document.createElement('div');
  modal.id = 'auditModal';
    modal.innerHTML = `
    <div class="audit-modal">
      <div class="audit-modal-content">
        <span class="close">&times;</span>
        <div class="tabs">
          <button class="tab-btn active" data-tab="title">Title</button>
          <button class="tab-btn" data-tab="short-desc">Short Description</button>
          <button class="tab-btn" data-tab="description">Description</button>
          <button class="tab-btn" data-tab="specifications">Specifications</button>
          <button class="tab-btn" data-tab="categories">Categories</button>
          <button class="tab-btn" data-tab="tags">Tags</button>
          <button class="tab-btn" data-tab="reviews">Reviews</button>
          <button class="tab-btn" data-tab="analysis">Global Analysis</button>
        </div>
        <div class="tab-content">
          <div id="tab-title" class="tab-pane active">
            <h3>Title Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Original Title</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Enhanced Title</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-short-desc" class="tab-pane">
            <h3>Short Description Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Original Short Description</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Enhanced Short Description</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-description" class="tab-pane">
            <h3>Description Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Original Description</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Enhanced Description</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-specifications" class="tab-pane">
            <h3>Specifications Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Current Specifications</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Suggested Specifications</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-categories" class="tab-pane">
            <h3>Categories Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Current Categories</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Suggested Categories</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-tags" class="tab-pane">
            <h3>Tags Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Current Tags</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Suggested Tags</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-reviews" class="tab-pane">
            <h3>Reviews Analysis</h3>
            <div class="comparison">
              <div class="original">
                <h4>Current Reviews</h4>
                <div class="content original-content"></div>
              </div>
              <div class="suggested">
                <h4>Suggested Reviews</h4>
                <div class="content suggested-content"></div>
                <div class="score"></div>
                <div class="analysis"></div>
              </div>
            </div>
          </div>
          <div id="tab-analysis" class="tab-pane">
            <h3>Global Analysis</h3>
            <div class="global-score"></div>
            <div class="overall-analysis"></div>
            <div class="improvements">
              <h4>Priority Improvements</h4>
              <ul class="improvements-list"></ul>
            </div>
          </div>
        </div>
        </div>
      </div>
    `;
  
  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .audit-modal {
      display: none;
      position: fixed;
      z-index: 9999;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    }

    .audit-modal-content {
      background-color: white;
      margin: 5% auto;
      padding: 20px;
      width: 80%;
      max-width: 80vw;
      border-radius: 8px;
      position: relative;
      max-height: 80vh;
      overflow-y: auto;
    }

    .close {
      position: absolute;
      right: 20px;
      top: 10px;
      font-size: 28px;
      cursor: pointer;
      color: #666;
    }

    .close:hover {
      color: black;
    }

    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }

      .tab-btn {
      padding: 10px 20px;
        border: none;
      background: #f8f9fa;
        cursor: pointer;
      font-size: 16px;
      color: #666;
      border-radius: 4px 4px 0 0;
      transition: all 0.3s ease;
      }

      .tab-btn:hover {
      background-color: #e9ecef;
      }

      .tab-btn.active {
      background: #10a37f;
      color: white;
      }

    .tab-pane {
      display: none;
    }

    .tab-pane.active {
      display: block;
    }

    .comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      }

    .original, .suggested {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
      }

    .content {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      min-height: 100px;
      }

    .suggested .content {
      border-color: #96588a;
    }

    .score {
      margin-top: 10px;
      font-weight: bold;
      color: #96588a;
    }

    .analysis {
      margin-top: 10px;
      padding: 10px;
      background: #f5f5f5;
        border-radius: 4px;
      }

    .global-score {
      font-size: 24px;
      font-weight: bold;
      color: #96588a;
      margin-bottom: 20px;
    }

    /* Reviews specific styles */
    .review-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .review-author {
      font-weight: 600;
      color: #2d3748;
    }

    .review-date {
      color: #718096;
      font-size: 0.9em;
    }

    .review-rating {
      color: #ecc94b;
      letter-spacing: 2px;
    }

    .review-content {
      color: #4a5568;
      line-height: 1.5;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    `;

  document.head.appendChild(styles);
  document.body.appendChild(modal);
  
    // Add tab switching functionality
  const tabButtons = modal.querySelectorAll('.tab-btn');
  const tabPanes = modal.querySelectorAll('.tab-pane');
    
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = `tab-${button.dataset.tab}`;
      modal.querySelector(`#${tabId}`).classList.add('active');
      });
    });
  
  // Add close button functionality
  const closeButton = modal.querySelector('.close');
  closeButton.addEventListener('click', () => {
    modal.querySelector('.audit-modal').style.display = 'none';
  });

  return modal;
  }
  
window.createAuditModal = createAuditModal;
  