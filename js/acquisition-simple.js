/**
 * Simplified Acquisition Elasticity Model
 * Interactive slider-based interface for immediate feedback
 */

import { loadElasticityParams, loadWeeklyAggregated } from './data-loader.js';

// Chart instance
let acquisitionChartSimple = null;

// Elasticity parameters (loaded from elasticity-params.json and weekly_aggregated.csv)
let acquisitionParams = null;

/**
 * Load acquisition parameters from actual data sources
 */
async function loadAcquisitionParams() {
  try {
    const [elasticityData, weeklyData] = await Promise.all([
      loadElasticityParams(),
      loadWeeklyAggregated()
    ]);

    // Calculate average weekly new subscribers by tier (from last 12 weeks)
    const recentWeeks = weeklyData.slice(-12);
    const avgNewSubs = {};

    ['ad_supported', 'ad_free', 'annual'].forEach(tier => {
      const tierWeeks = recentWeeks.filter(w => w.tier === tier);
      const avgNew = tierWeeks.reduce((sum, w) => sum + parseFloat(w.new_subscribers || 0), 0) / tierWeeks.length;
      avgNewSubs[tier] = Math.round(avgNew);
    });

    // Build params object from actual data
    acquisitionParams = {};
    ['ad_supported', 'ad_free', 'annual'].forEach(tier => {
      const tierData = elasticityData.tiers[tier];
      const totalNew = avgNewSubs[tier];

      acquisitionParams[tier] = {
        base_elasticity: tierData.base_elasticity,
        price: tierData.price_range.current,
        segments: {
          new_0_3mo: {
            elasticity: tierData.segments.new_0_3mo.elasticity,
            size_pct: tierData.segments.new_0_3mo.size_pct,
            baseline_adds: Math.round(totalNew * tierData.segments.new_0_3mo.size_pct)
          },
          tenured_3_12mo: {
            elasticity: tierData.segments.tenured_3_12mo.elasticity,
            size_pct: tierData.segments.tenured_3_12mo.size_pct,
            baseline_adds: Math.round(totalNew * tierData.segments.tenured_3_12mo.size_pct)
          },
          tenured_12plus: {
            elasticity: tierData.segments.tenured_12plus.elasticity,
            size_pct: tierData.segments.tenured_12plus.size_pct,
            baseline_adds: Math.round(totalNew * tierData.segments.tenured_12plus.size_pct)
          }
        }
      };
    });

    console.log('Acquisition parameters loaded from actual data:', acquisitionParams);
    return acquisitionParams;
  } catch (error) {
    console.error('Error loading acquisition parameters:', error);
    throw error;
  }
}

/**
 * Initialize the simplified acquisition section
 */
async function initAcquisitionSimple() {
  console.log('Initializing simplified acquisition model...');

  try {
    // Load parameters from actual data
    await loadAcquisitionParams();

    // Create chart
    createAcquisitionChartSimple();

    // Setup interactivity
    setupAcquisitionInteractivity();

    // Initial update
    updateAcquisitionModel();
  } catch (error) {
    console.error('Failed to initialize acquisition model:', error);
    // Show error to user
    const container = document.getElementById('step-3-acquisition-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load acquisition model data. Please refresh the page.
        </div>
      `;
    }
  }
}

/**
 * Create the acquisition chart
 */
function createAcquisitionChartSimple() {
  const ctx = document.getElementById('acquisition-chart-simple');
  if (!ctx) {
    console.warn('Acquisition chart canvas not found');
    return;
  }

  // Destroy existing chart
  if (acquisitionChartSimple) {
    acquisitionChartSimple.destroy();
  }

  acquisitionChartSimple = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['New (0-3mo)', 'Mid-tenure (3-12mo)', 'Loyal (12+mo)'],
      datasets: [
        {
          label: 'Baseline',
          data: [1000, 1400, 1600],
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2
        },
        {
          label: 'Projected',
          data: [1000, 1400, 1600],
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' new subs';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark'
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.1)'
          },
          ticks: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529'
          },
          title: {
            display: true,
            text: 'New Subscribers',
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529'
          }
        }
      }
    }
  });
}

/**
 * Setup slider interactivity
 */
function setupAcquisitionInteractivity() {
  const tierSelect = document.getElementById('acq-tier-select');
  const priceSlider = document.getElementById('acq-price-slider');

  if (!tierSelect || !priceSlider) {
    console.warn('Acquisition controls not found');
    return;
  }

  // Tier selection change
  tierSelect.addEventListener('change', () => {
    const tier = tierSelect.value;
    const params = acquisitionParams[tier];

    // Update slider range based on tier
    if (tier === 'annual') {
      priceSlider.min = 49.99;
      priceSlider.max = 99.99;
      priceSlider.value = params.price;
      priceSlider.step = 5;
    } else if (tier === 'ad_free') {
      priceSlider.min = 6.99;
      priceSlider.max = 12.99;
      priceSlider.value = params.price;
      priceSlider.step = 0.5;
    } else {
      priceSlider.min = 3.99;
      priceSlider.max = 9.99;
      priceSlider.value = params.price;
      priceSlider.step = 0.5;
    }

    updateAcquisitionModel();
  });

  // Price slider input
  priceSlider.addEventListener('input', updateAcquisitionModel);
}

/**
 * Update the acquisition model based on current inputs
 */
function updateAcquisitionModel() {
  const tierSelect = document.getElementById('acq-tier-select');
  const priceSlider = document.getElementById('acq-price-slider');
  const priceDisplay = document.getElementById('acq-price-display');

  if (!tierSelect || !priceSlider || !acquisitionParams) return;

  const tier = tierSelect.value;
  const params = acquisitionParams[tier];
  if (!params) return;
  const currentPrice = params.price;
  const newPrice = parseFloat(priceSlider.value);
  const priceChangePct = ((newPrice - currentPrice) / currentPrice) * 100;
  const elasticity = params.base_elasticity;

  // Update displays
  priceDisplay.textContent = '$' + newPrice.toFixed(2);
  document.getElementById('acq-price-change').textContent =
    (priceChangePct >= 0 ? '+' : '') + priceChangePct.toFixed(1) + '%';
  document.getElementById('acq-elasticity').textContent = elasticity.toFixed(1);

  // Calculate acquisition impact
  const acqImpact = elasticity * (priceChangePct / 100) * 100;
  const acqImpactEl = document.getElementById('acq-impact');
  acqImpactEl.textContent = (acqImpact >= 0 ? '+' : '') + acqImpact.toFixed(1) + '%';
  acqImpactEl.className = 'metric-value ' + (acqImpact >= 0 ? 'text-success' : 'text-danger');

  // Update segment table
  const segments = params.segments;
  const segNewImpact = segments.new_0_3mo.elasticity * (priceChangePct / 100) * 100;
  const segMidImpact = segments.tenured_3_12mo.elasticity * (priceChangePct / 100) * 100;
  const segLoyalImpact = segments.tenured_12plus.elasticity * (priceChangePct / 100) * 100;

  updateSegmentCell('acq-seg-new', segNewImpact);
  updateSegmentCell('acq-seg-mid', segMidImpact);
  updateSegmentCell('acq-seg-loyal', segLoyalImpact);

  // Update chart
  if (acquisitionChartSimple) {
    const baselineData = [
      segments.new_0_3mo.baseline_adds,
      segments.tenured_3_12mo.baseline_adds,
      segments.tenured_12plus.baseline_adds
    ];
    const projectedData = [
      Math.round(segments.new_0_3mo.baseline_adds * (1 + segNewImpact / 100)),
      Math.round(segments.tenured_3_12mo.baseline_adds * (1 + segMidImpact / 100)),
      Math.round(segments.tenured_12plus.baseline_adds * (1 + segLoyalImpact / 100))
    ];
    acquisitionChartSimple.data.datasets[0].data = baselineData;
    acquisitionChartSimple.data.datasets[1].data = projectedData;
    acquisitionChartSimple.update('none'); // Use 'none' for instant update without animation
  }
}

/**
 * Update a segment cell with color coding
 */
function updateSegmentCell(id, impact) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = (impact >= 0 ? '+' : '') + impact.toFixed(1) + '%';
    el.style.color = impact >= 0 ? 'var(--dplus-green)' : 'var(--dplus-red)';
  }
}

// Export for use in step-navigation.js
window.initAcquisitionSimple = initAcquisitionSimple;
