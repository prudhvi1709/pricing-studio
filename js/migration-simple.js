/**
 * Simplified Tier Migration Model
 * Interactive dual-slider interface for tier pricing
 */

import { loadElasticityParams, loadWeeklyAggregated } from './data-loader.js';

// Chart instance
let migrationChartSimple = null;

// Migration parameters (loaded from elasticity-params.json and weekly_aggregated.csv)
let migrationParams = null;

/**
 * Load migration parameters from actual data sources
 */
async function loadMigrationParams() {
  try {
    const [elasticityData, weeklyData] = await Promise.all([
      loadElasticityParams(),
      loadWeeklyAggregated()
    ]);

    // Get latest week's subscriber counts by tier
    const latestWeek = weeklyData[weeklyData.length - 1];
    const latestByTier = {};

    // Group latest data by tier
    for (let i = weeklyData.length - 1; i >= weeklyData.length - 3 && i >= 0; i--) {
      const row = weeklyData[i];
      if (!latestByTier[row.tier]) {
        latestByTier[row.tier] = row;
      }
    }

    const adSupportedData = latestByTier.ad_supported || {};
    const adFreeData = latestByTier.ad_free || {};

    // Load actual prices and subscriber counts
    const baselineAdLitePrice = elasticityData.tiers.ad_supported.price_range.current;
    const baselineAdFreePrice = elasticityData.tiers.ad_free.price_range.current;
    const baselineGap = baselineAdFreePrice - baselineAdLitePrice;

    const adLiteSubs = parseFloat(adSupportedData.active_subscribers || 10000);
    const adFreeSubs = parseFloat(adFreeData.active_subscribers || 12000);

    // Calculate baseline tier distribution
    const totalSubs = adLiteSubs + adFreeSubs;
    const baselineLitePct = (adLiteSubs / totalSubs) * 100;
    const baselineFreePct = (adFreeSubs / totalSubs) * 100;

    // Baseline churn rates from elasticity params
    const baselineCancelLite = elasticityData.churn_elasticity.ad_supported.baseline_churn * 100;
    const baselineCancelFree = elasticityData.churn_elasticity.ad_free.baseline_churn * 100;

    // Migration rates (estimated from cross-elasticity)
    // Positive cross-elasticity means substitutes - price increase in one tier increases demand for another
    const crossElasticity = elasticityData.cross_elasticity;
    const baselineUpgrade = Math.abs(crossElasticity.ad_supported_to_ad_free) * 10; // ~3% baseline
    const baselineDowngrade = Math.abs(crossElasticity.ad_free_to_ad_supported) * 10; // ~2% baseline

    migrationParams = {
      baselineAdLitePrice,
      baselineAdFreePrice,
      baselineGap,
      baselineLitePct,
      baselineFreePct,
      baselineUpgrade,
      baselineDowngrade,
      baselineCancelLite,
      baselineCancelFree,
      adLiteSubs,
      adFreeSubs,
      crossElasticity: crossElasticity.ad_supported_to_ad_free
    };

    console.log('Migration parameters loaded from actual data:', migrationParams);
    return migrationParams;
  } catch (error) {
    console.error('Error loading migration parameters:', error);
    throw error;
  }
}

/**
 * Initialize the simplified migration section
 */
async function initMigrationSimple() {
  console.log('Initializing simplified migration model...');

  try {
    // Load parameters from actual data
    await loadMigrationParams();

    // Create chart
    createMigrationChartSimple();

    // Setup interactivity
    setupMigrationInteractivity();

    // Initial update
    updateMigrationModel();
  } catch (error) {
    console.error('Failed to initialize migration model:', error);
    // Show error to user
    const container = document.getElementById('step-5-migration-container');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Failed to load migration model data. Please refresh the page.
        </div>
      `;
    }
  }
}

/**
 * Create the migration chart
 */
function createMigrationChartSimple() {
  const ctx = document.getElementById('migration-chart-simple');
  if (!ctx) {
    console.warn('Migration chart canvas not found');
    return;
  }

  // Destroy existing chart
  if (migrationChartSimple) {
    migrationChartSimple.destroy();
  }

  migrationChartSimple = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Month 0', 'Month 3', 'Month 6', 'Month 9', 'Month 12'],
      datasets: [
        {
          label: 'Ad-Lite %',
          data: [62, 61, 60, 59, 58],
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Ad-Free %',
          data: [38, 39, 40, 41, 42],
          borderColor: 'rgba(0, 102, 255, 1)',
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
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
              return context.dataset.label + ': ' + context.parsed.y.toFixed(0) + '%';
            }
          }
        }
      },
      scales: {
        y: {
          min: 30,
          max: 70,
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
            text: 'Tier Mix (%)',
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
function setupMigrationInteractivity() {
  const adliteSlider = document.getElementById('mig-adlite-slider');
  const adfreeSlider = document.getElementById('mig-adfree-slider');

  if (!adliteSlider || !adfreeSlider) {
    console.warn('Migration controls not found');
    return;
  }

  // Slider inputs
  adliteSlider.addEventListener('input', updateMigrationModel);
  adfreeSlider.addEventListener('input', updateMigrationModel);
}

/**
 * Update the migration model based on current inputs
 */
function updateMigrationModel() {
  const adliteSlider = document.getElementById('mig-adlite-slider');
  const adfreeSlider = document.getElementById('mig-adfree-slider');

  if (!adliteSlider || !adfreeSlider || !migrationParams) return;

  const adlitePrice = parseFloat(adliteSlider.value);
  const adfreePrice = parseFloat(adfreeSlider.value);
  const newGap = adfreePrice - adlitePrice;
  const gapChange = ((newGap - migrationParams.baselineGap) / migrationParams.baselineGap) * 100;

  // Update displays
  document.getElementById('mig-adlite-display').textContent = '$' + adlitePrice.toFixed(2);
  document.getElementById('mig-adfree-display').textContent = '$' + adfreePrice.toFixed(2);
  document.getElementById('mig-price-gap').textContent = '$' + newGap.toFixed(2);
  document.getElementById('mig-gap-change').textContent = (gapChange >= 0 ? '+' : '') + gapChange.toFixed(1) + '%';

  // Calculate migration probabilities (simplified model)
  // Narrower gap = more upgrades, wider gap = more downgrades
  const gapFactor = newGap / migrationParams.baselineGap;
  const upgradePct = migrationParams.baselineUpgrade / gapFactor;
  const downgradePct = migrationParams.baselineDowngrade * gapFactor;

  // Update table
  document.getElementById('mig-upgrade-pct').textContent = upgradePct.toFixed(1) + '%';
  document.getElementById('mig-downgrade-pct').textContent = downgradePct.toFixed(1) + '%';
  document.getElementById('mig-cancel-lite-pct').textContent = migrationParams.baselineCancelLite.toFixed(1) + '%';
  document.getElementById('mig-cancel-free-pct').textContent = migrationParams.baselineCancelFree.toFixed(1) + '%';

  // Calculate subscriber counts
  const upgradeSubs = Math.round(migrationParams.adLiteSubs * (upgradePct / 100));
  const downgradeSubs = Math.round(migrationParams.adFreeSubs * (downgradePct / 100));
  const cancelLiteSubs = Math.round(migrationParams.adLiteSubs * (migrationParams.baselineCancelLite / 100));
  const cancelFreeSubs = Math.round(migrationParams.adFreeSubs * (migrationParams.baselineCancelFree / 100));

  document.getElementById('mig-upgrade-subs').textContent = '~' + upgradeSubs.toLocaleString();
  document.getElementById('mig-downgrade-subs').textContent = '~' + downgradeSubs.toLocaleString();
  document.getElementById('mig-cancel-lite-subs').textContent = '~' + cancelLiteSubs.toLocaleString();
  document.getElementById('mig-cancel-free-subs').textContent = '~' + cancelFreeSubs.toLocaleString();

  // Calculate revenue impacts
  const upgradeRev = upgradeSubs * (adfreePrice - adlitePrice);
  const downgradeRev = downgradeSubs * (adlitePrice - adfreePrice);
  const cancelLiteRev = cancelLiteSubs * adlitePrice * -1;
  const cancelFreeRev = cancelFreeSubs * adfreePrice * -1;

  document.getElementById('mig-upgrade-rev').textContent = '+$' + Math.abs(upgradeRev).toLocaleString();
  document.getElementById('mig-downgrade-rev').textContent = '$' + downgradeRev.toLocaleString();
  document.getElementById('mig-cancel-lite-rev').textContent = '$' + cancelLiteRev.toLocaleString();
  document.getElementById('mig-cancel-free-rev').textContent = '$' + cancelFreeRev.toLocaleString();

  // Calculate tier mix shift
  const shift = (upgradePct - migrationParams.baselineUpgrade) - (downgradePct - migrationParams.baselineDowngrade);
  const newLitePct = Math.max(40, Math.min(80, migrationParams.baselineLitePct - shift));
  const newFreePct = 100 - newLitePct;

  document.getElementById('mig-adlite-pct').textContent = newLitePct.toFixed(0) + '%';
  document.getElementById('mig-adfree-pct').textContent = newFreePct.toFixed(0) + '%';

  // Update arrow direction
  const arrow = document.getElementById('mig-arrow');
  if (shift > 0.5) {
    arrow.textContent = '→';
    arrow.style.color = 'var(--dplus-green)';
  } else if (shift < -0.5) {
    arrow.textContent = '←';
    arrow.style.color = 'var(--dplus-red)';
  } else {
    arrow.textContent = '↔';
    arrow.style.color = 'var(--dplus-blue)';
  }

  // Update chart
  if (migrationChartSimple) {
    const liteTrend = [migrationParams.baselineLitePct];
    const freeTrend = [migrationParams.baselineFreePct];
    for (let i = 1; i <= 4; i++) {
      liteTrend.push(migrationParams.baselineLitePct + (newLitePct - migrationParams.baselineLitePct) * (i / 4));
      freeTrend.push(migrationParams.baselineFreePct + (newFreePct - migrationParams.baselineFreePct) * (i / 4));
    }
    migrationChartSimple.data.datasets[0].data = liteTrend;
    migrationChartSimple.data.datasets[1].data = freeTrend;
    migrationChartSimple.update('none'); // Instant update
  }
}

// Export for use in step-navigation.js
window.initMigrationSimple = initMigrationSimple;
