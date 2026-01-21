/**
 * Simplified Acquisition Elasticity Model
 * Interactive slider-based interface for immediate feedback
 */

// Chart instance
let acquisitionChartSimple = null;

// Elasticity parameters (from elasticity-params.json structure)
const acquisitionParams = {
  ad_supported: {
    base_elasticity: -1.9,
    price: 5.99,
    segments: {
      new_0_3mo: { elasticity: -2.5, size_pct: 0.25, baseline_adds: 1000 },
      tenured_3_12mo: { elasticity: -1.9, size_pct: 0.35, baseline_adds: 1400 },
      tenured_12plus: { elasticity: -1.6, size_pct: 0.40, baseline_adds: 1600 }
    }
  },
  ad_free: {
    base_elasticity: -1.5,
    price: 8.99,
    segments: {
      new_0_3mo: { elasticity: -1.8, size_pct: 0.20, baseline_adds: 800 },
      tenured_3_12mo: { elasticity: -1.5, size_pct: 0.35, baseline_adds: 1200 },
      tenured_12plus: { elasticity: -1.2, size_pct: 0.45, baseline_adds: 1500 }
    }
  },
  annual: {
    base_elasticity: -1.3,
    price: 71.88,
    segments: {
      new_0_3mo: { elasticity: -1.6, size_pct: 0.15, baseline_adds: 300 },
      tenured_3_12mo: { elasticity: -1.3, size_pct: 0.30, baseline_adds: 600 },
      tenured_12plus: { elasticity: -1.0, size_pct: 0.55, baseline_adds: 1100 }
    }
  }
};

/**
 * Initialize the simplified acquisition section
 */
function initAcquisitionSimple() {
  console.log('Initializing simplified acquisition model...');

  // Create chart
  createAcquisitionChartSimple();

  // Setup interactivity
  setupAcquisitionInteractivity();

  // Initial update
  updateAcquisitionModel();
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

  if (!tierSelect || !priceSlider) return;

  const tier = tierSelect.value;
  const params = acquisitionParams[tier];
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
