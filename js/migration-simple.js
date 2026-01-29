/**
 * Simplified Tier Migration Model
 * Interactive dual-slider interface for tier pricing
 */

import { loadElasticityParams, loadWeeklyAggregated } from './data-loader.js';

// Chart instance
let migrationChartSimple = null;

// Migration parameters (loaded from elasticity-params.json and weekly_aggregated.csv)
let migrationParams = null;

// Cohort data for asymmetry factors
let cohortData = null;

/**
 * Load cohort data for migration asymmetry
 */
async function loadCohortData() {
  try {
    const response = await fetch('data/cohort_coefficients.json');
    cohortData = await response.json();
    console.log('✓ Loaded cohort profiles for migration');
    return cohortData;
  } catch (error) {
    console.error('Error loading cohort data:', error);
    return null;
  }
}

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
    await loadCohortData();

    // Create chart and Sankey diagram
    createMigrationChartSimple();
    createSankeyDiagram();

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

  // Use loaded baseline data or fallback to placeholder values
  const initialLitePct = migrationParams ? migrationParams.baselineLitePct : 62;
  const initialFreePct = migrationParams ? migrationParams.baselineFreePct : 38;

  migrationChartSimple = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Month 0', 'Month 3', 'Month 6', 'Month 9', 'Month 12'],
      datasets: [
        {
          label: 'Ad-Lite %',
          data: [initialLitePct, initialLitePct, initialLitePct, initialLitePct, initialLitePct],
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Ad-Free %',
          data: [initialFreePct, initialFreePct, initialFreePct, initialFreePct, initialFreePct],
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
 * Create the Sankey flow diagram
 */
function createSankeyDiagram() {
  if (!migrationParams) return;

  const container = document.getElementById('sankey-diagram');
  if (!container) {
    console.warn('Sankey diagram container not found');
    return;
  }

  // Clear any existing content
  container.innerHTML = '';

  // Initial render with baseline data
  updateSankeyDiagram();
}

/**
 * Update the Sankey diagram with current migration flows
 */
function updateSankeyDiagram(upgradeRate = null, downgradeRate = null, cancelLiteRate = null, cancelFreeRate = null) {
  if (!migrationParams) return;

  const container = document.getElementById('sankey-diagram');
  if (!container) return;

  // Use provided rates or defaults
  const upgrade = upgradeRate !== null ? upgradeRate : migrationParams.baselineUpgrade;
  const downgrade = downgradeRate !== null ? downgradeRate : migrationParams.baselineDowngrade;
  const cancelLite = cancelLiteRate !== null ? cancelLiteRate : migrationParams.baselineCancelLite;
  const cancelFree = cancelFreeRate !== null ? cancelFreeRate : migrationParams.baselineCancelFree;

  // Calculate stay rates
  const stayLite = 100 - upgrade - cancelLite;
  const stayFree = 100 - downgrade - cancelFree;

  // Total subscribers
  const totalLite = migrationParams.adLiteSubs;
  const totalFree = migrationParams.adFreeSubs;

  // Calculate flows (convert percentages to actual numbers)
  const liteToLite = Math.round((stayLite / 100) * totalLite);
  const liteToFree = Math.round((upgrade / 100) * totalLite);
  const liteToChurn = Math.round((cancelLite / 100) * totalLite);

  const freeToFree = Math.round((stayFree / 100) * totalFree);
  const freeToLite = Math.round((downgrade / 100) * totalFree);
  const freeToChurn = Math.round((cancelFree / 100) * totalFree);

  // Define nodes
  const nodes = [
    { name: 'Ad-Lite\n(Current)', id: 0 },
    { name: 'Ad-Free\n(Current)', id: 1 },
    { name: 'Ad-Lite\n(Projected)', id: 2 },
    { name: 'Ad-Free\n(Projected)', id: 3 },
    { name: 'Churned', id: 4 }
  ];

  // Define links
  const links = [
    { source: 0, target: 2, value: liteToLite, type: 'stay' },
    { source: 0, target: 3, value: liteToFree, type: 'upgrade' },
    { source: 0, target: 4, value: liteToChurn, type: 'churn' },
    { source: 1, target: 3, value: freeToFree, type: 'stay' },
    { source: 1, target: 2, value: freeToLite, type: 'downgrade' },
    { source: 1, target: 4, value: freeToChurn, type: 'churn' }
  ];

  // Get container dimensions
  const width = container.clientWidth;
  const height = 400;
  const margin = { top: 20, right: 100, bottom: 20, left: 100 };

  // Clear and create SVG
  container.innerHTML = '';
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Create sankey generator
  const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodeWidth(20)
    .nodePadding(30)
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  // Generate sankey layout
  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  // Color scale
  const colors = {
    stay: '#6366f1',        // Blue
    upgrade: '#10b981',     // Green
    downgrade: '#ef4444',   // Red
    churn: '#6b7280'        // Gray
  };

  // Draw links (flows)
  svg.append('g')
    .selectAll('path')
    .data(sankeyLinks)
    .join('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => colors[d.type])
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('fill', 'none')
    .attr('opacity', 0.4)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 0.7);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.4);
    })
    .append('title')
    .text(d => {
      const pct = (d.value / (d.source.id < 2 ? (d.source.id === 0 ? totalLite : totalFree) : 1) * 100).toFixed(1);
      return `${d.source.name.replace('\n', ' ')} → ${d.target.name.replace('\n', ' ')}\n${d.value.toLocaleString()} subs (${pct}%)`;
    });

  // Draw nodes
  svg.append('g')
    .selectAll('rect')
    .data(sankeyNodes)
    .join('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => Math.max(1, d.y1 - d.y0))
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => {
      if (d.id === 4) return colors.churn;
      if (d.id < 2) return '#94a3b8'; // Light gray for current
      return '#1e293b'; // Dark for projected
    })
    .attr('opacity', 0.8);

  // Add node labels
  svg.append('g')
    .selectAll('text')
    .data(sankeyNodes)
    .join('text')
    .attr('x', d => d.x0 < width / 2 ? d.x0 - 6 : d.x1 + 6)
    .attr('y', d => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < width / 2 ? 'end' : 'start')
    .attr('font-size', '12px')
    .attr('font-weight', '600')
    .attr('fill', document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e5e5e5' : '#1e293b')
    .each(function(d) {
      const lines = d.name.split('\n');
      const text = d3.select(this);
      lines.forEach((line, i) => {
        text.append('tspan')
          .attr('x', d.x0 < width / 2 ? d.x0 - 6 : d.x1 + 6)
          .attr('dy', i === 0 ? 0 : '1.2em')
          .text(line);
      });
    });
}

/**
 * Setup slider interactivity
 */
function setupMigrationInteractivity() {
  const adliteSlider = document.getElementById('mig-adlite-slider');
  const adfreeSlider = document.getElementById('mig-adfree-slider');
  const cohortSelect = document.getElementById('mig-cohort-select');

  if (!adliteSlider || !adfreeSlider) {
    console.warn('Migration controls not found');
    return;
  }

  // Slider inputs
  adliteSlider.addEventListener('input', updateMigrationModel);
  adfreeSlider.addEventListener('input', updateMigrationModel);

  // Cohort selection change
  if (cohortSelect && cohortData) {
    cohortSelect.addEventListener('change', () => {
      const selectedCohort = cohortSelect.value;
      console.log('🔄 Switching to migration cohort:', selectedCohort);

      if (cohortData[selectedCohort]) {
        const cohort = cohortData[selectedCohort];

        // Update baseline migration rates from cohort profile
        if (cohort.migration_upgrade !== undefined) {
          migrationParams.baselineUpgrade = cohort.migration_upgrade * 3; // Scale to percentage
          console.log(`  ✓ Upgrade willingness: ${migrationParams.baselineUpgrade.toFixed(1)}%`);
        }
        if (cohort.migration_downgrade !== undefined) {
          migrationParams.baselineDowngrade = cohort.migration_downgrade * 2; // Scale to percentage
          console.log(`  ✓ Downgrade propensity: ${migrationParams.baselineDowngrade.toFixed(1)}%`);
        }
      }

      updateMigrationModel();
    });
  }
}

/**
 * Update the migration model based on current inputs
 */
function updateMigrationModel() {
  const adliteSlider = document.getElementById('mig-adlite-slider');
  const adfreeSlider = document.getElementById('mig-adfree-slider');

  if (!adliteSlider || !adfreeSlider || !migrationParams) {
    console.warn('⚠️ updateMigrationModel early return:', {
      adliteSlider: !!adliteSlider,
      adfreeSlider: !!adfreeSlider,
      migrationParams: !!migrationParams
    });
    return;
  }

  const adlitePrice = parseFloat(adliteSlider.value);
  const adfreePrice = parseFloat(adfreeSlider.value);
  const newGap = adfreePrice - adlitePrice;
  const gapChange = ((newGap - migrationParams.baselineGap) / migrationParams.baselineGap) * 100;

  console.log('📊 Migration Model Update:', {
    baselineAdLitePrice: migrationParams.baselineAdLitePrice,
    baselineAdFreePrice: migrationParams.baselineAdFreePrice,
    adlitePrice,
    adfreePrice,
    baselineGap: migrationParams.baselineGap,
    newGap,
    gapChange: gapChange.toFixed(2) + '%',
    chartExists: !!migrationChartSimple
  });

  // Update displays
  document.getElementById('mig-adlite-display').textContent = '$' + adlitePrice.toFixed(2);
  document.getElementById('mig-adfree-display').textContent = '$' + adfreePrice.toFixed(2);
  document.getElementById('mig-price-gap').textContent = '$' + newGap.toFixed(2);
  document.getElementById('mig-gap-change').textContent = (gapChange >= 0 ? '+' : '') + gapChange.toFixed(1) + '%';

  // Calculate migration probabilities (non-linear model with crossover)
  // Upgrade curve: Sigmoid with plateau (high willingness at small gaps, then flattens)
  // Downgrade curve: Exponential with acceleration (low at small gaps, steep increase at large gaps)

  // Upgrade: Sigmoid function (decreasing with gap size, plateaus)
  const upgradeMax = 10.0;  // Max 10% upgrade rate at narrow gaps
  const upgradeK = -0.75;    // Steepness (negative = decreasing)
  const upgradeMidpoint = 2.5;  // Inflection at $2.5 gap
  const upgradePct = upgradeMax / (1 + Math.exp(upgradeK * (newGap - upgradeMidpoint)));

  // Downgrade: Exponential with threshold acceleration
  const downgradeBase = 0.8;  // Base rate at narrow gaps
  const downgradeThreshold = 4.5;  // Acceleration kicks in at $4.5 gap
  let downgradePct;

  if (newGap < downgradeThreshold) {
    // Quadratic growth before threshold (steeper than before)
    downgradePct = downgradeBase + 3.5 * Math.pow(newGap / downgradeThreshold, 2);
  } else {
    // Exponential growth beyond threshold
    downgradePct = downgradeBase + 3.5 + 4.0 * Math.exp(0.35 * (newGap - downgradeThreshold));
  }

  // Crossover point should be around $4 gap:
  // At $4: upgrade ~4.5%, downgrade ~4.5% (equilibrium!)
  // At $2: upgrade ~10%, downgrade ~1% (net upgrade flow)
  // At $6: upgrade ~1.5%, downgrade ~10% (net downgrade flow)

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

  // Update chart with proper compounding migration rates
  if (migrationChartSimple) {
    // Calculate net migration rate per period (monthly)
    // Net flow = upgrades - downgrades (as a percentage of Ad-Lite population)
    const netFlowRate = (upgradePct - downgradePct) / 100; // Convert to decimal

    // Apply compounding migration each month
    const liteTrend = [migrationParams.baselineLitePct];
    const freeTrend = [migrationParams.baselineFreePct];

    let currentLitePct = migrationParams.baselineLitePct;

    for (let month = 1; month <= 4; month++) {
      // Each month, a percentage of Ad-Lite subscribers migrate
      // This compounds because we apply rate to the NEW mix, not the original
      const absoluteChange = currentLitePct * netFlowRate;
      currentLitePct = Math.max(40, Math.min(80, currentLitePct - absoluteChange));
      const currentFreePct = 100 - currentLitePct;

      liteTrend.push(currentLitePct);
      freeTrend.push(currentFreePct);
    }

    console.log('📈 Updating Migration Chart:', {
      baselineLitePct: migrationParams.baselineLitePct,
      baselineFreePct: migrationParams.baselineFreePct,
      newLitePct: newLitePct,
      newFreePct: newFreePct,
      shift: shift,
      liteTrend: liteTrend,
      freeTrend: freeTrend
    });

    migrationChartSimple.data.datasets[0].data = liteTrend;
    migrationChartSimple.data.datasets[1].data = freeTrend;
    migrationChartSimple.update('none'); // Instant update
  }

  // Update Sankey diagram
  updateSankeyDiagram(
    upgradePct,
    downgradePct,
    migrationParams.baselineCancelLite,
    migrationParams.baselineCancelFree
  );
}

// Export for use in step-navigation.js
window.initMigrationSimple = initMigrationSimple;