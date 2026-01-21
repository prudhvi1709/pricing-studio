/**
 * Simplified Tier Migration Model
 * Interactive dual-slider interface for tier pricing
 */

// Chart instance
let migrationChartSimple = null;

// Baseline values
const baselineAdLitePrice = 5.99;
const baselineAdFreePrice = 8.99;
const baselineGap = baselineAdFreePrice - baselineAdLitePrice; // $3.00

// Baseline tier distribution
const baselineLitePct = 62;
const baselineFreePct = 38;

// Baseline migration rates
const baselineUpgrade = 8.2;
const baselineDowngrade = 3.5;
const baselineCancelLite = 4.2;
const baselineCancelFree = 3.8;

// Subscriber counts (approximations)
const adLiteSubs = 10000;
const adFreeSubs = 12000;

/**
 * Initialize the simplified migration section
 */
function initMigrationSimple() {
  console.log('Initializing simplified migration model...');

  // Create chart
  createMigrationChartSimple();

  // Setup interactivity
  setupMigrationInteractivity();

  // Initial update
  updateMigrationModel();
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

  if (!adliteSlider || !adfreeSlider) return;

  const adlitePrice = parseFloat(adliteSlider.value);
  const adfreePrice = parseFloat(adfreeSlider.value);
  const newGap = adfreePrice - adlitePrice;
  const gapChange = ((newGap - baselineGap) / baselineGap) * 100;

  // Update displays
  document.getElementById('mig-adlite-display').textContent = '$' + adlitePrice.toFixed(2);
  document.getElementById('mig-adfree-display').textContent = '$' + adfreePrice.toFixed(2);
  document.getElementById('mig-price-gap').textContent = '$' + newGap.toFixed(2);
  document.getElementById('mig-gap-change').textContent = (gapChange >= 0 ? '+' : '') + gapChange.toFixed(1) + '%';

  // Calculate migration probabilities (simplified model)
  // Narrower gap = more upgrades, wider gap = more downgrades
  const gapFactor = newGap / baselineGap;
  const upgradePct = baselineUpgrade / gapFactor;
  const downgradePct = baselineDowngrade * gapFactor;

  // Update table
  document.getElementById('mig-upgrade-pct').textContent = upgradePct.toFixed(1) + '%';
  document.getElementById('mig-downgrade-pct').textContent = downgradePct.toFixed(1) + '%';
  document.getElementById('mig-cancel-lite-pct').textContent = baselineCancelLite.toFixed(1) + '%';
  document.getElementById('mig-cancel-free-pct').textContent = baselineCancelFree.toFixed(1) + '%';

  // Calculate subscriber counts
  const upgradeSubs = Math.round(adLiteSubs * (upgradePct / 100));
  const downgradeSubs = Math.round(adFreeSubs * (downgradePct / 100));
  const cancelLiteSubs = Math.round(adLiteSubs * (baselineCancelLite / 100));
  const cancelFreeSubs = Math.round(adFreeSubs * (baselineCancelFree / 100));

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
  const shift = (upgradePct - baselineUpgrade) - (downgradePct - baselineDowngrade);
  const newLitePct = Math.max(40, Math.min(80, baselineLitePct - shift));
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
    const liteTrend = [baselineLitePct];
    const freeTrend = [baselineFreePct];
    for (let i = 1; i <= 4; i++) {
      liteTrend.push(baselineLitePct + (newLitePct - baselineLitePct) * (i / 4));
      freeTrend.push(baselineFreePct + (newFreePct - baselineFreePct) * (i / 4));
    }
    migrationChartSimple.data.datasets[0].data = liteTrend;
    migrationChartSimple.data.datasets[1].data = freeTrend;
    migrationChartSimple.update('none'); // Instant update
  }
}

// Export for use in step-navigation.js
window.initMigrationSimple = initMigrationSimple;
