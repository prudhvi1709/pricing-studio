/**
 * Step Navigation System
 * Manages the step-by-step navigation flow for the Price Elasticity Studio
 * Now with 10 steps (0-9) for better progressive disclosure
 */

const TOTAL_STEPS = 10; // 0-9
let currentStep = 0;

/**
 * Navigate to a specific step
 * @param {number} step - Step number (0-9)
 */
function goToStep(step) {
  if (step < 0 || step >= TOTAL_STEPS) return;

  // Hide all section wrappers
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show the target section wrapper
  const section = document.getElementById(`section-${step}`);
  if (section) {
    section.classList.add('active');
  }

  // Update step indicators
  document.querySelectorAll('.step-dot').forEach((dot, index) => {
    dot.classList.remove('active', 'completed');
    if (index < step) {
      dot.classList.add('completed');
    } else if (index === step) {
      dot.classList.add('active');
    }
  });

  currentStep = step;

  // Show/hide appropriate original content sections
  showStepContent(step);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show content for the current step
 * @param {number} step - Step number
 */
function showStepContent(step) {
  // Hide all original content sections
  const allSections = [
    'load-data-section',
    'kpi-section',
    'elasticity-models-section',
    'comparison-section',
    'analytics-section',
    'segmentation-section',
    'segment-analysis-section',
    'event-calendar-section',
    'data-viewer-section',
    'chat-section'
  ];

  allSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      // Remove hide-tabs class when hiding elasticity section
      if (id === 'elasticity-models-section') {
        el.classList.remove('hide-elasticity-tabs');
      }
    }
  });

  // Show sections based on current step
  switch(step) {
    case 0:
      // Hero - no additional content
      break;
    case 1:
      // Dashboard - load-data-section and kpi-section are now INSIDE section-1
      // Trigger data loading if not already loaded
      if (window.loadAppData && !window.dataLoaded) {
        window.dataLoaded = true; // Set immediately to prevent multiple calls
        window.loadAppData().catch(error => {
          console.error('Failed to load data:', error);
          window.dataLoaded = false; // Reset on error
          // Show error message to user
          const loadSection = document.getElementById('load-data-section');
          if (loadSection) {
            loadSection.innerHTML = `
              <div class="glass-card">
                <div class="alert alert-danger mb-0">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  <strong>Failed to load data.</strong> ${error.message}
                  <button class="btn btn-sm btn-outline-danger ms-3" onclick="location.reload()">Retry</button>
                </div>
              </div>
            `;
          }
        });
      }
      break;
    case 2:
      // Data Explorer - Show data viewer
      const dataViewerSection = document.getElementById('data-viewer-section');
      const dataViewerContainer = document.getElementById('step-2-data-viewer-container');
      if (dataViewerSection && dataViewerContainer) {
        dataViewerSection.style.display = 'block';
        // Move data viewer into step 2 container if not already there
        if (dataViewerSection.parentElement !== dataViewerContainer) {
          dataViewerContainer.appendChild(dataViewerSection);
        }
      }
      break;
    case 3:
      // Acquisition Elasticity - Show elasticity models, force Acquisition tab, hide tabs
      showElasticityModel('acquisition', 'step-3-acquisition-container');
      break;
    case 4:
      // Churn Elasticity - Show elasticity models, force Churn tab, hide tabs
      showElasticityModel('churn', 'step-4-churn-container');
      break;
    case 5:
      // Tier Migration - Show elasticity models, force Migration tab, hide tabs
      showElasticityModel('migration', 'step-5-migration-container');
      break;
    case 6:
      // Customer Cohorts & Elasticity (segmentation only)
      const segmentationSection6 = document.getElementById('segmentation-section');
      const segmentContainer6 = document.getElementById('step-6-segmentation-container');
      if (segmentationSection6 && segmentContainer6) {
        segmentationSection6.style.display = 'block';
        if (segmentationSection6.parentElement !== segmentContainer6) {
          segmentContainer6.appendChild(segmentationSection6);
        }
      }
      break;
    case 7:
      // Segment Elasticity Comparison (analysis only)
      const segmentAnalysisSection7 = document.getElementById('segment-analysis-section');
      const analysisContainer7 = document.getElementById('step-7-analysis-container');
      if (segmentAnalysisSection7 && analysisContainer7) {
        segmentAnalysisSection7.style.display = 'block';
        if (segmentAnalysisSection7.parentElement !== analysisContainer7) {
          analysisContainer7.appendChild(segmentAnalysisSection7);
        }
      }
      break;
    case 8:
      // Event Calendar
      const eventCalendarSection = document.getElementById('event-calendar-section');
      if (eventCalendarSection) eventCalendarSection.style.display = 'block';
      break;
    case 9:
      // Chat & Advanced Tools
      const chatSection = document.getElementById('chat-section');
      const chatContainer = document.getElementById('step-9-chat-container');
      if (chatSection) {
        chatSection.style.display = 'block';
        if (chatContainer && chatSection.parentElement !== chatContainer) {
          chatContainer.appendChild(chatSection);
        }
      }
      break;
  }
}

/**
 * Helper function to show elasticity model for a specific tab
 * @param {string} modelType - 'acquisition', 'churn', or 'migration'
 * @param {string} containerId - ID of the container to append content to
 */
function showElasticityModel(modelType, containerId) {
  const elasticityModelsSection = document.getElementById('elasticity-models-section');
  const container = document.getElementById(containerId);

  if (!elasticityModelsSection || !container) return;

  // Show ONLY the elasticity models section (scenario engine)
  // NOT the comparison or analytics sections - those are separate
  elasticityModelsSection.style.display = 'block';

  // Move it into the container if not already there
  if (elasticityModelsSection.parentElement !== container) {
    container.appendChild(elasticityModelsSection);
  }

  // Hide the tab navigation (we'll show content directly)
  const tabNav = elasticityModelsSection.querySelector('.nav-tabs');
  if (tabNav) {
    tabNav.style.display = 'none';
  }

  // Activate the correct tab pane
  const allTabs = elasticityModelsSection.querySelectorAll('.tab-pane');
  allTabs.forEach(tab => {
    tab.classList.remove('show', 'active');
  });

  // Show the specific tab based on modelType
  let targetTabId = '';
  if (modelType === 'acquisition') {
    targetTabId = 'acquisition-pane';
  } else if (modelType === 'churn') {
    targetTabId = 'churn-pane';
  } else if (modelType === 'migration') {
    targetTabId = 'migration-pane';
  }

  const targetTab = document.getElementById(targetTabId);
  if (targetTab) {
    targetTab.classList.add('show', 'active');
  }

  // Ensure scenario cards are populated
  if (window.populateElasticityModelTabs && typeof window.populateElasticityModelTabs === 'function') {
    window.populateElasticityModelTabs();
  }
}

/**
 * Initialize step navigation
 */
function initStepNavigation() {
  // Add click handlers to step dots
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      goToStep(step);
    });
  });

  // Start at step 0 (hero)
  goToStep(0);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStepNavigation);
} else {
  initStepNavigation();
}

// Make goToStep available globally for onclick handlers
window.goToStep = goToStep;
