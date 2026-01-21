/**
 * Simplified Churn Elasticity Model
 * Interactive slider-based interface with time-lagged effects
 */

// Chart instance
let churnChartSimple = null;

// Churn time lag coefficients (from sample_demo)
const churnTimeLag = {
  '0_4_weeks': 0.006,
  '4_8_weeks': 0.018,
  '8_12_weeks': 0.028,
  '12_plus': 0.008
};

// Baseline churn rate
const baselineChurn = 4.2; // percent

/**
 * Initialize the simplified churn section
 */
function initChurnSimple() {
  console.log('Initializing simplified churn model...');

  // Create chart
  createChurnChartSimple();

  // Setup interactivity
  setupChurnInteractivity();

  // Initial update
  updateChurnModel();
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

  churnChartSimple = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 0', 'Week 4', 'Week 8', 'Week 12', 'Week 16', 'Week 20'],
      datasets: [
        {
          label: 'Baseline Churn',
          data: [4.2, 4.2, 4.2, 4.2, 4.2, 4.2],
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.1,
          borderWidth: 2
        },
        {
          label: 'Projected Churn',
          data: [4.2, 5.0, 6.0, 7.0, 6.5, 5.1],
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
 * Setup slider interactivity
 */
function setupChurnInteractivity() {
  const priceSlider = document.getElementById('churn-price-slider');
  const tierBtns = document.querySelectorAll('.tier-btn');

  if (!priceSlider) {
    console.warn('Churn controls not found');
    return;
  }

  let currentTierPrice = 5.99;

  // Price slider input
  priceSlider.addEventListener('input', () => updateChurnModel(currentTierPrice));

  // Tier button clicks
  tierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tierBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTierPrice = parseFloat(btn.dataset.price);
      updateChurnModel(currentTierPrice);
    });
  });
}

/**
 * Update the churn model based on current inputs
 */
function updateChurnModel(currentTierPrice = 5.99) {
  const priceSlider = document.getElementById('churn-price-slider');
  if (!priceSlider) return;

  const priceIncrease = parseFloat(priceSlider.value);
  const priceChangePct = (priceIncrease / currentTierPrice) * 100;

  // Update displays
  document.getElementById('churn-increase-display').textContent = '+$' + priceIncrease.toFixed(2);
  document.getElementById('churn-pct-change').textContent = '+' + priceChangePct.toFixed(1) + '%';

  // Calculate churn impact by time horizon
  const impacts = {
    '0_4': priceChangePct * churnTimeLag['0_4_weeks'] * 1.5,
    '4_8': priceChangePct * churnTimeLag['4_8_weeks'] * 1.5,
    '8_12': priceChangePct * churnTimeLag['8_12_weeks'] * 1.5,
    '12plus': priceChangePct * churnTimeLag['12_plus'] * 1.5
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

  // Update chart
  if (churnChartSimple) {
    const projectedData = [
      baselineChurn,
      baselineChurn + impacts['0_4'],
      baselineChurn + impacts['4_8'],
      baselineChurn + impacts['8_12'],
      baselineChurn + (impacts['8_12'] + impacts['12plus']) / 2,
      baselineChurn + impacts['12plus']
    ];
    churnChartSimple.data.datasets[1].data = projectedData;
    churnChartSimple.update('none'); // Instant update
  }
}

// Export for use in step-navigation.js
window.initChurnSimple = initChurnSimple;
