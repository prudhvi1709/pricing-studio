/**
 * Simplified Churn Elasticity Model
 * Interactive slider-based interface with time-lagged effects
 */

import { loadElasticityParams } from './data-loader.js';

// Chart instances
let churnChartSimple = null;
let survivalCurveChart = null;

// Churn parameters (loaded from elasticity-params.json)
let churnParams = null;

// Churn time lag distribution (derived from time_horizon_adjustments in elasticity-params.json)
// These represent how churn impact is distributed across time horizons
let churnTimeLag = {
  '0_4_weeks': 0.10,   // 10% of total impact in first 4 weeks
  '4_8_weeks': 0.30,   // 30% of total impact in weeks 4-8 (peak)
  '8_12_weeks': 0.45,  // 45% of total impact in weeks 8-12 (continued peak)
  '12_plus': 0.15      // 15% residual impact beyond 12 weeks
};

// Baseline churn rate (loaded from elasticity-params.json)
let baselineChurn = null;

/**
 * Load churn parameters from actual data sources
 */
async function loadChurnParams() {
  try {
    const elasticityData = await loadElasticityParams();

    // Use ad_supported tier as default (UI allows tier selection via buttons)
    const adSupportedChurn = elasticityData.churn_elasticity.ad_supported;
    const adFreeChurn = elasticityData.churn_elasticity.ad_free;
    churnParams = {
      ad_supported: {
        churn_elasticity: adSupportedChurn.churn_elasticity,
        baseline_churn: adSupportedChurn.baseline_churn * 100, // Convert to percentage
        price: elasticityData.tiers.ad_supported.price_range.current
      },
      ad_free: {
        churn_elasticity: adFreeChurn.churn_elasticity,
        baseline_churn: adFreeChurn.baseline_churn * 100,
        price: elasticityData.tiers.ad_free.price_range.current
      }
    };

    // Set default baseline churn (ad_supported)
    baselineChurn = churnParams.ad_supported.baseline_churn;

    console.log('Churn parameters loaded from actual data:', churnParams);
    return churnParams;
  } catch (error) {
    console.error('Error loading churn parameters:', error);
    throw error;
  }
}

/**
 * Initialize the simplified churn section
 */
async function initChurnSimple() {
  console.log('Initializing simplified churn model...');

  try {
    // Load parameters from actual data
    await loadChurnParams();

    // Create charts with loaded parameters
    createChurnChartSimple();
    createSurvivalCurveChart();

    // Setup interactivity
    setupChurnInteractivity();

    // Initial update
    updateChurnModel();
  } catch (error) {
    console.error('Failed to initialize churn model:', error);
    // Show error to user
    const container = document.getElementById('step-4-churn-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load churn model data. Please refresh the page.
        </div>
      `;
    }
  }
}

/**
 * Create the churn chart
 */
function createChurnChartSimple() {
  const ctx = document.getElementById('churn-chart-simple');
  if (!ctx) {
    console.warn('Churn chart canvas not found');
    return;
  }

  // Destroy existing chart
  if (churnChartSimple) {
    churnChartSimple.destroy();
  }

  // Use loaded baseline churn or fallback to ad_supported baseline
  const initialBaseline = churnParams ? churnParams.ad_supported.baseline_churn : 4.2;

  // Calculate initial projected data with default slider value ($1)
  const defaultPriceIncrease = 1; // Default slider value from HTML
  const tierParams = churnParams ? churnParams.ad_supported : null;
  let initialProjectedData = [initialBaseline, initialBaseline, initialBaseline, initialBaseline, initialBaseline, initialBaseline];

  if (tierParams) {
    const priceChangePct = (defaultPriceIncrease / tierParams.price) * 100;
    const totalChurnImpact = tierParams.baseline_churn * tierParams.churn_elasticity * (priceChangePct / 100);
    const impacts = {
      '0_4': totalChurnImpact * churnTimeLag['0_4_weeks'],
      '4_8': totalChurnImpact * churnTimeLag['4_8_weeks'],
      '8_12': totalChurnImpact * churnTimeLag['8_12_weeks'],
      '12plus': totalChurnImpact * churnTimeLag['12_plus']
    };

    initialProjectedData = [
      initialBaseline,
      initialBaseline + impacts['0_4'],
      initialBaseline + impacts['4_8'],
      initialBaseline + impacts['8_12'],
      initialBaseline + (impacts['8_12'] + impacts['12plus']) / 2,
      initialBaseline + impacts['12plus']
    ];

    console.log('🎨 Creating Churn Chart with initial projected data:', initialProjectedData);
  }

  churnChartSimple = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 0', 'Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20'],
      datasets: [
        {
          label: 'Baseline Churn',
          data: [initialBaseline, initialBaseline, initialBaseline, initialBaseline, initialBaseline, initialBaseline],
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Projected Churn',
          data: initialProjectedData,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3,
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
              return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
            }
          }
        }
      },
      scales: {
        y: {
          min: 3,
          max: 10,
          grid: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark'
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.1)'
          },
          ticks: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529',
            callback: (value) => value + '%'
          },
          title: {
            display: true,
            text: 'Churn Rate (%)',
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
 * Create the survival curve (retention forecast) chart
 */
function createSurvivalCurveChart() {
  const ctx = document.getElementById('survival-curve-chart');
  if (!ctx) {
    console.warn('Survival curve canvas not found');
    return;
  }

  // Destroy existing chart
  if (survivalCurveChart) {
    survivalCurveChart.destroy();
  }

  // Use loaded baseline churn to calculate initial retention curve
  const initialBaseline = churnParams ? churnParams.ad_supported.baseline_churn : 4.2;
  const baselineRetention = [
    100,
    100 - (initialBaseline * 0.25),
    100 - (initialBaseline * 0.5),
    100 - (initialBaseline * 0.75),
    100 - (initialBaseline * 1.0),
    100 - (initialBaseline * 1.25),
    100 - (initialBaseline * 1.5)
  ];

  // Calculate initial scenario retention with default slider value ($1)
  const defaultPriceIncrease = 1;
  const tierParams = churnParams ? churnParams.ad_supported : null;
  let initialScenarioRetention = baselineRetention;

  if (tierParams) {
    const priceChangePct = (defaultPriceIncrease / tierParams.price) * 100;
    const totalChurnImpact = tierParams.baseline_churn * tierParams.churn_elasticity * (priceChangePct / 100);
    const impacts = {
      '0_4': totalChurnImpact * churnTimeLag['0_4_weeks'],
      '4_8': totalChurnImpact * churnTimeLag['4_8_weeks'],
      '8_12': totalChurnImpact * churnTimeLag['8_12_weeks'],
      '12plus': totalChurnImpact * churnTimeLag['12_plus']
    };

    let cumulativeChurn = 0;
    const scenarioRetention = [100];
    cumulativeChurn += impacts['0_4'];
    scenarioRetention.push(100 - (initialBaseline * 0.25 + cumulativeChurn * 0.25));
    cumulativeChurn += impacts['4_8'];
    scenarioRetention.push(100 - (initialBaseline * 0.5 + cumulativeChurn * 0.5));
    cumulativeChurn += impacts['8_12'];
    scenarioRetention.push(100 - (initialBaseline * 0.75 + cumulativeChurn * 0.75));
    cumulativeChurn += impacts['12plus'] * 0.5;
    scenarioRetention.push(100 - (initialBaseline * 1.0 + cumulativeChurn * 1.0));
    cumulativeChurn += impacts['12plus'] * 0.3;
    scenarioRetention.push(100 - (initialBaseline * 1.25 + cumulativeChurn * 1.0));
    cumulativeChurn += impacts['12plus'] * 0.2;
    scenarioRetention.push(100 - (initialBaseline * 1.5 + cumulativeChurn * 1.0));

    initialScenarioRetention = scenarioRetention;
    console.log('🎨 Creating Survival Curve with initial scenario data:', initialScenarioRetention);
  }

  survivalCurveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 0', 'Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20', 'Week 24'],
      datasets: [
        {
          label: 'Baseline Retention',
          data: baselineRetention,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.0)',
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Scenario Retention',
          data: initialScenarioRetention,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.0)',
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Retention Loss',
          data: initialScenarioRetention,
          borderColor: 'transparent',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: '-1',
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529',
            filter: (item) => item.text !== 'Retention Loss'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'Retention Loss') return null;
              return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
            },
            afterBody: function(tooltipItems) {
              const index = tooltipItems[0].dataIndex;
              const baseline = tooltipItems[0].chart.data.datasets[0].data[index];
              const scenario = tooltipItems[0].chart.data.datasets[1].data[index];
              const loss = baseline - scenario;
              return loss > 0 ? `\nRetention Loss: ${loss.toFixed(1)}%` : '';
            }
          }
        }
      },
      scales: {
        y: {
          min: 80,
          max: 100,
          grid: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark'
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.1)'
          },
          ticks: {
            color: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#212529',
            callback: (value) => value + '%'
          },
          title: {
            display: true,
            text: 'Retention Rate (%)',
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
function setupChurnInteractivity() {
  const priceSlider = document.getElementById('churn-price-slider');
  const tierBtns = document.querySelectorAll('.tier-btn');

  if (!priceSlider || !churnParams) {
    console.warn('Churn controls not found or params not loaded');
    return;
  }

  let currentTier = 'ad_supported';

  // Price slider input
  priceSlider.addEventListener('input', () => updateChurnModel(currentTier));

  // Tier button clicks
  tierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tierBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Map price to tier name
      const price = parseFloat(btn.dataset.price);
      if (price === 5.99) {
        currentTier = 'ad_supported';
      } else if (price === 9.99) {
        currentTier = 'ad_free';
      }
      updateChurnModel(currentTier);
    });
  });
}

/**
 * Update the churn model based on current inputs
 */
function updateChurnModel(currentTier = 'ad_supported') {
  const priceSlider = document.getElementById('churn-price-slider');
  if (!priceSlider || !churnParams) {
    console.warn('⚠️ updateChurnModel early return:', { priceSlider: !!priceSlider, churnParams: !!churnParams });
    return;
  }

  const tierParams = churnParams[currentTier];
  if (!tierParams) {
    console.warn('⚠️ updateChurnModel no tier params for:', currentTier);
    return;
  }

  const priceIncrease = parseFloat(priceSlider.value);
  const currentTierPrice = tierParams.price;
  const priceChangePct = (priceIncrease / currentTierPrice) * 100;

  console.log('📊 Churn Model Update:', {
    priceIncrease,
    currentTierPrice,
    priceChangePct: priceChangePct.toFixed(2) + '%',
    baseline_churn: tierParams.baseline_churn,
    churn_elasticity: tierParams.churn_elasticity,
    chartExists: !!churnChartSimple
  });

  // Update displays
  document.getElementById('churn-increase-display').textContent = '+$' + priceIncrease.toFixed(2);
  document.getElementById('churn-pct-change').textContent = '+' + priceChangePct.toFixed(1) + '%';

  // Calculate total churn impact using actual churn elasticity
  // Formula: churn_change = baseline_churn × churn_elasticity × (price_change_pct / 100)
  const totalChurnImpact = tierParams.baseline_churn * tierParams.churn_elasticity * (priceChangePct / 100);

  // Distribute impact across time horizons using time lag distribution
  const impacts = {
    '0_4': totalChurnImpact * churnTimeLag['0_4_weeks'],
    '4_8': totalChurnImpact * churnTimeLag['4_8_weeks'],
    '8_12': totalChurnImpact * churnTimeLag['8_12_weeks'],
    '12plus': totalChurnImpact * churnTimeLag['12_plus']
  };

  // Update impact displays
  document.getElementById('churn-0-4').textContent = '+' + impacts['0_4'].toFixed(1) + 'pp';
  document.getElementById('churn-4-8').textContent = '+' + impacts['4_8'].toFixed(1) + 'pp';
  document.getElementById('churn-8-12').textContent = '+' + impacts['8_12'].toFixed(1) + 'pp';
  document.getElementById('churn-12plus').textContent = '+' + impacts['12plus'].toFixed(1) + 'pp';

  // Update peak impact
  const peakImpact = Math.max(...Object.values(impacts));
  document.getElementById('churn-peak-impact').textContent = '+' + peakImpact.toFixed(1) + 'pp';

  // Update bar widths (normalized to max of 5pp for visualization)
  const maxImpact = 5;
  document.getElementById('bar-0-4').style.width = Math.min(impacts['0_4'] / maxImpact * 100, 100) + '%';
  document.getElementById('bar-4-8').style.width = Math.min(impacts['4_8'] / maxImpact * 100, 100) + '%';
  document.getElementById('bar-8-12').style.width = Math.min(impacts['8_12'] / maxImpact * 100, 100) + '%';
  document.getElementById('bar-12plus').style.width = Math.min(impacts['12plus'] / maxImpact * 100, 100) + '%';

  // Update churn chart
  if (churnChartSimple) {
    const tierBaseline = tierParams.baseline_churn;
    const projectedData = [
      tierBaseline,
      tierBaseline + impacts['0_4'],
      tierBaseline + impacts['4_8'],
      tierBaseline + impacts['8_12'],
      tierBaseline + (impacts['8_12'] + impacts['12plus']) / 2,
      tierBaseline + impacts['12plus']
    ];

    console.log('📈 Updating Churn Chart:', {
      baseline: tierBaseline,
      impacts: impacts,
      projectedData: projectedData,
      baselineData: [tierBaseline, tierBaseline, tierBaseline, tierBaseline, tierBaseline, tierBaseline]
    });

    // Update baseline data too
    churnChartSimple.data.datasets[0].data = [tierBaseline, tierBaseline, tierBaseline, tierBaseline, tierBaseline, tierBaseline];
    churnChartSimple.data.datasets[1].data = projectedData;
    churnChartSimple.update('none'); // Instant update
  }

  // Update survival curve chart
  if (survivalCurveChart) {
    const tierBaseline = tierParams.baseline_churn;

    // Calculate cumulative churn and convert to retention
    // Baseline: consistent churn rate over time
    const baselineRetention = [
      100,
      100 - (tierBaseline * 0.25),
      100 - (tierBaseline * 0.5),
      100 - (tierBaseline * 0.75),
      100 - (tierBaseline * 1.0),
      100 - (tierBaseline * 1.25),
      100 - (tierBaseline * 1.5)
    ];

    // Scenario: time-lagged churn accumulation
    let cumulativeChurn = 0;
    const scenarioRetention = [100];

    // Week 4
    cumulativeChurn += impacts['0_4'];
    scenarioRetention.push(100 - (tierBaseline * 0.25 + cumulativeChurn * 0.25));

    // Week 8
    cumulativeChurn += impacts['4_8'];
    scenarioRetention.push(100 - (tierBaseline * 0.5 + cumulativeChurn * 0.5));

    // Week 12
    cumulativeChurn += impacts['8_12'];
    scenarioRetention.push(100 - (tierBaseline * 0.75 + cumulativeChurn * 0.75));

    // Week 16
    cumulativeChurn += impacts['12plus'] * 0.5;
    scenarioRetention.push(100 - (tierBaseline * 1.0 + cumulativeChurn * 1.0));

    // Week 20
    cumulativeChurn += impacts['12plus'] * 0.3;
    scenarioRetention.push(100 - (tierBaseline * 1.25 + cumulativeChurn * 1.0));

    // Week 24
    cumulativeChurn += impacts['12plus'] * 0.2;
    scenarioRetention.push(100 - (tierBaseline * 1.5 + cumulativeChurn * 1.0));

    survivalCurveChart.data.datasets[0].data = baselineRetention;
    survivalCurveChart.data.datasets[1].data = scenarioRetention;
    survivalCurveChart.data.datasets[2].data = scenarioRetention; // For shaded area
    survivalCurveChart.update('none');
  }
}

// Export for use in step-navigation.js
window.initChurnSimple = initChurnSimple;