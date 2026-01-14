/**
 * Main Application Module
 * Orchestrates the Discovery+ Price Elasticity POC
 *
 * Dependencies: data-loader.js, scenario-engine.js, charts.js
 */

import { loadAllData, loadScenarios, getWeeklyData, loadElasticityParams } from './data-loader.js';
import { simulateScenario, compareScenarios as compareScenariosEngine } from './scenario-engine.js';
import { renderDemandCurve, renderElasticityHeatmap, renderTierMixShift, renderTradeoffsScatter, renderComparisonBarChart, renderRadarChart } from './charts.js';
import { initializeChat, configureLLM, sendMessage, clearHistory } from './chat.js';
import { initializeDataViewer } from './data-viewer.js';

// Global state
let selectedScenario = null;
let allScenarios = [];
let savedScenarios = [];
let currentResult = null;
let dataLoaded = false;

// Format helpers
function formatNumber(num) {
  return num ? num.toLocaleString() : 'N/A';
}

function formatCurrency(num) {
  return num ? `$${num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A';
}

function formatPercent(num, decimals = 1) {
  return num !== null && num !== undefined ? `${num.toFixed(decimals)}%` : 'N/A';
}

// Load KPI data
async function loadKPIs() {
  try {
    const weeklyData = await getWeeklyData('all');
    const latestWeek = {};

    // Get latest week for each tier
    ['ad_supported', 'ad_free', 'annual'].forEach(tier => {
      const tierData = weeklyData.filter(d => d.tier === tier);
      latestWeek[tier] = tierData[tierData.length - 1];
    });

    // Calculate totals
    const totalSubs = Object.values(latestWeek).reduce((sum, d) => sum + d.active_subscribers, 0);
    const totalRevenue = Object.values(latestWeek).reduce((sum, d) => sum + d.revenue, 0) * 4; // Weekly to monthly
    const avgARPU = totalRevenue / totalSubs;
    const avgChurn = Object.values(latestWeek).reduce((sum, d) => sum + d.churn_rate, 0) / 3;

    // Update KPI cards
    document.getElementById('kpi-subscribers').textContent = formatNumber(totalSubs);
    document.getElementById('kpi-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('kpi-arpu').textContent = formatCurrency(avgARPU);
    document.getElementById('kpi-churn').textContent = formatPercent(avgChurn * 100);

    // Note: Change indicators would require comparing to previous week
    document.getElementById('kpi-subscribers-change').textContent = '+2.3%';
    document.getElementById('kpi-revenue-change').textContent = '+1.8%';
    document.getElementById('kpi-arpu-change').textContent = '$6.89';
    document.getElementById('kpi-churn-change').textContent = '4.2%';

  } catch (error) {
    console.error('Error loading KPIs:', error);
  }
}

// Load scenarios
async function loadScenarioCards() {
  try {
    allScenarios = await loadScenarios();

    // Filter to most interesting scenarios for Phase 1 (including bundle scenario)
    const featuredScenarios = allScenarios.filter(s =>
      ['scenario_001', 'scenario_002', 'scenario_003', 'scenario_008', 'scenario_baseline'].includes(s.id)
    );

    const container = document.getElementById('scenario-cards');
    container.innerHTML = '';

    featuredScenarios.forEach(scenario => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4';
      card.innerHTML = `
        <div class="card scenario-card h-100" data-scenario-id="${scenario.id}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title flex-grow-1 mb-0">${scenario.name}</h5>
              <button class="btn btn-sm btn-outline-secondary edit-scenario-btn" data-scenario-id="${scenario.id}" title="Edit parameters">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
            <p class="card-text small">${scenario.description}</p>
            <div class="mt-auto">
              <span class="badge bg-secondary">${scenario.category}</span>
              ${scenario.priority ? `<span class="badge bg-info">${scenario.priority}</span>` : ''}
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Add click handlers for scenario selection
    document.querySelectorAll('.scenario-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't select if clicking edit button
        if (e.target.closest('.edit-scenario-btn')) return;

        document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedScenario = allScenarios.find(s => s.id === card.dataset.scenarioId);
        document.getElementById('simulate-btn').disabled = false;
      });
    });

    // Add click handlers for edit buttons
    document.querySelectorAll('.edit-scenario-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scenarioId = btn.dataset.scenarioId;
        openScenarioEditor(scenarioId);
      });
    });

  } catch (error) {
    console.error('Error loading scenarios:', error);
  }
}

// Simulate scenario
async function runSimulation() {
  if (!selectedScenario) return;

  const btn = document.getElementById('simulate-btn');
  const resultContainer = document.getElementById('result-container');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Simulating...';

    // Run simulation
    const result = await simulateScenario(selectedScenario);

    // Display results
    displayResults(result);

    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Error simulating scenario:', error);
    alert('Error running simulation: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-play-fill me-2"></i>Simulate Selected Scenario';
  }
}

// Display simulation results
function displayResults(result) {
  currentResult = result; // Store for saving

  // Store in all simulation results for chatbot access
  if (!allSimulationResults.find(r => r.scenario_id === result.scenario_id)) {
    allSimulationResults.push(result);
  }

  const container = document.getElementById('result-cards');
  container.innerHTML = `
    <div class="col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <div class="text-muted small">Subscribers</div>
          <div class="h4 mb-1">${formatNumber(result.forecasted.subscribers)}</div>
          <div class="small ${result.delta.subscribers >= 0 ? 'text-success' : 'text-danger'}">
            ${result.delta.subscribers >= 0 ? '+' : ''}${formatNumber(result.delta.subscribers)}
            (${formatPercent(result.delta.subscribers_pct, 1)})
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <div class="text-muted small">Revenue (Monthly)</div>
          <div class="h4 mb-1">${formatCurrency(result.forecasted.revenue)}</div>
          <div class="small ${result.delta.revenue >= 0 ? 'text-success' : 'text-danger'}">
            ${result.delta.revenue >= 0 ? '+' : ''}${formatCurrency(result.delta.revenue)}
            (${formatPercent(result.delta.revenue_pct, 1)})
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <div class="text-muted small">ARPU</div>
          <div class="h4 mb-1">${formatCurrency(result.forecasted.arpu)}</div>
          <div class="small ${result.delta.arpu >= 0 ? 'text-success' : 'text-danger'}">
            ${result.delta.arpu >= 0 ? '+' : ''}${formatCurrency(result.delta.arpu)}
            (${formatPercent(result.delta.arpu_pct, 1)})
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card">
        <div class="card-body text-center">
          <div class="text-muted small">Churn Rate</div>
          <div class="h4 mb-1">${formatPercent(result.forecasted.churn_rate * 100, 2)}</div>
          <div class="small ${result.delta.churn_rate <= 0 ? 'text-success' : 'text-danger'}">
            ${result.delta.churn_rate >= 0 ? '+' : ''}${formatPercent(result.delta.churn_rate * 100, 2)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Display warnings
  const warningsContainer = document.getElementById('warnings-container');
  const warningsList = document.getElementById('warnings-list');

  if (result.warnings && result.warnings.length > 0) {
    warningsContainer.style.display = 'block';
    warningsList.innerHTML = result.warnings.map(w => `<li>${w}</li>`).join('');
  } else {
    warningsContainer.style.display = 'none';
  }

  // Render charts
  renderForecastChart(result);
  renderTierMixChart(result);
  renderTradeoffsChart(result);
}

// Render forecast chart
function renderForecastChart(result) {
  const ctx = document.getElementById('forecast-chart');

  // Destroy existing chart if any
  if (window.forecastChart) {
    window.forecastChart.destroy();
  }

  // Calculate confidence intervals (±10% as approximation)
  const confidenceFactor = 0.10;
  const upperBound = result.time_series.map(d => d.subscribers * (1 + confidenceFactor));
  const lowerBound = result.time_series.map(d => d.subscribers * (1 - confidenceFactor));

  const data = {
    labels: result.time_series.map(d => `Month ${d.month}`),
    datasets: [
      {
        label: 'Baseline',
        data: result.time_series.map(d => d.month === 0 ? d.subscribers : result.baseline.subscribers),
        borderColor: '#6c757d',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.1,
        pointRadius: 0
      },
      {
        label: 'Upper Bound (90% CI)',
        data: upperBound,
        borderColor: 'rgba(13, 110, 253, 0.3)',
        borderWidth: 1,
        borderDash: [3, 3],
        backgroundColor: 'transparent',
        pointRadius: 0,
        fill: '+1'
      },
      {
        label: 'Forecasted',
        data: result.time_series.map(d => d.subscribers),
        borderColor: '#0d6efd',
        borderWidth: 3,
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      },
      {
        label: 'Lower Bound (90% CI)',
        data: lowerBound,
        borderColor: 'rgba(13, 110, 253, 0.3)',
        borderWidth: 1,
        borderDash: [3, 3],
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        pointRadius: 0,
        fill: '-1'
      }
    ]
  };

  window.forecastChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Subscriber Forecast'
        }
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1
          },
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

// Render Tier Mix Shift Chart
function renderTierMixChart(result) {
  const data = {
    baseline: {
      ad_supported: result.baseline.subscribers * 0.45, // Approximate distribution
      ad_free: result.baseline.subscribers * 0.35,
      annual: result.baseline.subscribers * 0.20
    },
    forecasted: {
      ad_supported: result.forecasted.subscribers * 0.45,
      ad_free: result.forecasted.subscribers * 0.35,
      annual: result.forecasted.subscribers * 0.20
    }
  };

  renderTierMixShift('tier-mix-chart', data, { width: 550, height: 380 });
}

// Render Trade-offs Scatter Chart
function renderTradeoffsChart(result) {
  const data = [{
    name: result.scenario_name || 'Current Scenario',
    revenueChange: result.delta.revenue_pct,
    subsChange: result.delta.subscribers_pct,
    churnChange: result.delta.churn_rate_pct
  }];

  renderTradeoffsScatter('tradeoffs-chart', data, { width: 550, height: 380 });
}

// Load and render elasticity analytics
async function loadElasticityAnalytics() {
  try {
    const params = await loadElasticityParams();
    const weeklyData = await getWeeklyData('all');

    // Prepare demand curve data
    const latestWeek = {};
    ['ad_supported', 'ad_free', 'annual'].forEach(tier => {
      const tierData = weeklyData.filter(d => d.tier === tier);
      latestWeek[tier] = tierData[tierData.length - 1];
    });

    const demandCurveData = {
      tiers: [
        {
          name: 'Ad-Supported',
          elasticity: params.tiers.ad_supported.base_elasticity,
          currentPrice: 5.99,
          currentSubs: latestWeek.ad_supported.active_subscribers,
          color: '#dc3545'
        },
        {
          name: 'Ad-Free',
          elasticity: params.tiers.ad_free.base_elasticity,
          currentPrice: 8.99,
          currentSubs: latestWeek.ad_free.active_subscribers,
          color: '#ffc107'
        },
        {
          name: 'Annual',
          elasticity: params.tiers.annual.base_elasticity,
          currentPrice: 5.99,
          currentSubs: latestWeek.annual.active_subscribers,
          color: '#28a745'
        }
      ]
    };

    renderDemandCurve('demand-curve-chart', demandCurveData, { width: 1100, height: 500 });

    // Prepare heatmap data
    const segments = ['new_0_3mo', 'tenured_3_12mo', 'tenured_12plus'];
    const tiers = ['ad_supported', 'ad_free', 'annual'];
    const values = segments.map(segment =>
      tiers.map(tier => {
        if (params.tiers[tier].segments && params.tiers[tier].segments[segment]) {
          return params.tiers[tier].segments[segment].elasticity;
        }
        return params.tiers[tier].base_elasticity;
      })
    );

    const heatmapData = {
      segments: ['New (0-3mo)', 'Tenured (3-12mo)', 'Tenured (12+mo)'],
      tiers: ['Ad-Supported', 'Ad-Free', 'Annual'],
      values: values
    };

    renderElasticityHeatmap('elasticity-heatmap', heatmapData, { cellSize: 100 });

  } catch (error) {
    console.error('Error loading elasticity analytics:', error);
  }
}

// Store all simulation results for chatbot access
let allSimulationResults = [];

// Initialize chat context with scenario-focused tools
async function initializeChatContext() {
  try {
    // Get current KPI values
    const weeklyData = await getWeeklyData('all');
    const latestWeek = {};
    ['ad_supported', 'ad_free', 'annual'].forEach(tier => {
      const tierData = weeklyData.filter(d => d.tier === tier);
      latestWeek[tier] = tierData[tierData.length - 1];
    });

    const totalSubs = Object.values(latestWeek).reduce((sum, d) => sum + d.active_subscribers, 0);
    const totalRevenue = Object.values(latestWeek).reduce((sum, d) => sum + d.revenue, 0) * 4;
    const avgChurn = Object.values(latestWeek).reduce((sum, d) => sum + d.churn_rate, 0) / 3;

    // Load elasticity parameters for visualization context
    const elasticityParams = await loadElasticityParams();

    // Create scenario-focused context for chat
    const context = {
      // All scenario definitions
      allScenarios: allScenarios,

      // Current simulation result (if any)
      getCurrentSimulation: () => currentResult,

      // All saved scenarios for comparison
      getSavedScenarios: () => savedScenarios,

      // All simulation results
      getAllSimulationResults: () => allSimulationResults,

      // Business context
      businessContext: {
        currentSubscribers: totalSubs,
        currentRevenue: totalRevenue,
        currentChurn: avgChurn,
        elasticityByTier: {
          ad_supported: elasticityParams.tiers.ad_supported.base_elasticity,
          ad_free: elasticityParams.tiers.ad_free.base_elasticity,
          annual: elasticityParams.tiers.annual.base_elasticity
        },
        tierPricing: {
          ad_supported: 5.99,
          ad_free: 8.99,
          annual: 71.88
        }
      },

      // Visualization data context
      getVisualizationData: () => ({
        demandCurve: {
          description: "Shows price elasticity - how demand changes with price for each tier",
          tiers: [
            { name: 'Ad-Supported', elasticity: elasticityParams.tiers.ad_supported.base_elasticity, price: 5.99 },
            { name: 'Ad-Free', elasticity: elasticityParams.tiers.ad_free.base_elasticity, price: 8.99 },
            { name: 'Annual', elasticity: elasticityParams.tiers.annual.base_elasticity, price: 71.88 }
          ]
        },
        tierMix: currentResult ? {
          description: "Baseline vs Forecasted subscriber distribution across tiers",
          baseline: currentResult.baseline,
          forecasted: currentResult.forecasted
        } : null,
        forecast: currentResult ? {
          description: "12-month subscriber forecast with 90% confidence intervals",
          timeSeries: currentResult.time_series
        } : null
      }),

      // SCENARIO-FOCUSED TOOLS

      // Interpret a specific scenario's results
      interpretScenario: async (scenarioId) => {
        // Check if we have results for this scenario
        let result = allSimulationResults.find(r => r.scenario_id === scenarioId);

        // If not, check if it's the current result
        if (!result && currentResult && currentResult.scenario_id === scenarioId) {
          result = currentResult;
        }

        // If still not found, run the simulation
        if (!result) {
          const scenario = allScenarios.find(s => s.id === scenarioId);
          if (!scenario) {
            throw new Error(`Scenario ${scenarioId} not found`);
          }
          result = await simulateScenario(scenario);
        }

        // Build interpretation
        const interpretation = {
          scenario_id: result.scenario_id,
          scenario_name: result.scenario_name,

          // Key metrics
          metrics: {
            revenue: {
              change_pct: result.delta.revenue_pct,
              change_amount: result.delta.revenue,
              forecasted: result.forecasted.revenue,
              baseline: result.baseline.revenue
            },
            subscribers: {
              change_pct: result.delta.subscribers_pct,
              change_amount: result.delta.subscribers,
              forecasted: result.forecasted.subscribers,
              baseline: result.baseline.subscribers
            },
            churn: {
              change_pct: result.delta.churn_rate_pct,
              forecasted_rate: result.forecasted.churn_rate,
              baseline_rate: result.baseline.churn_rate
            },
            arpu: {
              change_pct: result.delta.arpu_pct,
              forecasted: result.forecasted.arpu,
              baseline: result.baseline.arpu
            }
          },

          // Trade-offs
          tradeoffs: {
            revenue_vs_subscribers: `${result.delta.revenue_pct >= 0 ? 'Gain' : 'Loss'} ${Math.abs(result.delta.revenue_pct).toFixed(1)}% revenue, ${result.delta.subscribers_pct >= 0 ? 'gain' : 'lose'} ${Math.abs(result.delta.subscribers_pct).toFixed(1)}% subscribers`,
            price_sensitivity: result.elasticity < -2.0 ? 'High' : result.elasticity < -1.5 ? 'Medium' : 'Low'
          },

          // Warnings and risks
          warnings: result.warnings || [],

          // Elasticity info
          elasticity: result.elasticity,

          // Time series forecast
          forecast_12m: result.time_series,

          summary: `${result.scenario_name} analysis: Revenue ${result.delta.revenue_pct >= 0 ? 'increases' : 'decreases'} by ${Math.abs(result.delta.revenue_pct).toFixed(1)}% while subscribers ${result.delta.subscribers_pct >= 0 ? 'grow' : 'decline'} by ${Math.abs(result.delta.subscribers_pct).toFixed(1)}%. Churn ${result.delta.churn_rate_pct >= 0 ? 'increases' : 'decreases'} by ${Math.abs(result.delta.churn_rate_pct).toFixed(1)}%.`
        };

        return interpretation;
      },

      // Suggest a new scenario based on business goal
      suggestScenario: async (goal) => {
        const goalMap = {
          maximize_revenue: {
            strategy: 'Price increase on low-elasticity tier',
            tier: 'annual',
            priceChange: +2.00,
            rationale: 'Annual tier has lowest elasticity (-1.6), so price increases cause least subscriber loss'
          },
          grow_subscribers: {
            strategy: 'Aggressive promotion on high-elasticity tier',
            tier: 'ad_supported',
            priceChange: -2.00,
            rationale: 'Ad-Supported has highest elasticity (-2.1), so discounts drive maximum subscriber growth'
          },
          reduce_churn: {
            strategy: 'Moderate price decrease to improve value perception',
            tier: 'ad_free',
            priceChange: -1.00,
            rationale: 'Modest price reduction improves perceived value while maintaining revenue'
          },
          maximize_arpu: {
            strategy: 'Premium tier price increase',
            tier: 'ad_free',
            priceChange: +1.50,
            rationale: 'Target customers less price-sensitive, willing to pay premium for ad-free experience'
          }
        };

        const suggestion = goalMap[goal];
        if (!suggestion) {
          throw new Error(`Unknown goal: ${goal}. Valid goals: ${Object.keys(goalMap).join(', ')}`);
        }

        const tierPrices = {
          ad_supported: 5.99,
          ad_free: 8.99,
          annual: 71.88
        };

        const currentPrice = tierPrices[suggestion.tier];
        const newPrice = currentPrice + suggestion.priceChange;

        return {
          goal: goal,
          suggested_scenario: {
            name: `${suggestion.strategy} - ${suggestion.tier.replace('_', ' ')}`,
            tier: suggestion.tier,
            current_price: currentPrice,
            new_price: newPrice,
            price_change: suggestion.priceChange,
            price_change_pct: (suggestion.priceChange / currentPrice) * 100
          },
          rationale: suggestion.rationale,
          estimated_impact: `For ${goal.replace('_', ' ')}, this strategy is optimal based on elasticity analysis`,
          next_steps: 'Use the scenario editor to create this scenario, then simulate to see detailed forecasts'
        };
      },

      // Analyze a specific chart/visualization
      analyzeChart: async (chartName) => {
        const chartAnalysis = {
          demand_curve: {
            name: 'Demand Curve by Tier',
            description: 'Shows price elasticity - how quantity demanded changes with price',
            interpretation: [
              'Steeper curve = higher elasticity = more price-sensitive customers',
              `Ad-Supported (elasticity ${elasticityParams.tiers.ad_supported.base_elasticity}): Most price-sensitive`,
              `Ad-Free (elasticity ${elasticityParams.tiers.ad_free.base_elasticity}): Moderately price-sensitive`,
              `Annual (elasticity ${elasticityParams.tiers.annual.base_elasticity}): Least price-sensitive`
            ],
            insights: 'Use this to identify optimal price points for each tier. Flatter curves allow for price increases with minimal subscriber loss.'
          },
          tier_mix: currentResult ? {
            name: 'Tier Mix: Baseline vs Forecasted',
            description: 'Compares current vs forecasted subscriber distribution across tiers',
            baseline: currentResult.baseline,
            forecasted: currentResult.forecasted,
            interpretation: `Scenario "${currentResult.scenario_name}" shifts tier distribution. Revenue impact depends on tier ARPU differences.`
          } : null,
          forecast: currentResult ? {
            name: '12-Month Subscriber Forecast',
            description: 'Projects subscriber count over 12 months with 90% confidence intervals',
            timeSeries: currentResult.time_series,
            interpretation: 'Confidence intervals widen over time due to increasing uncertainty. Use for medium-term planning (3-6 months most reliable).'
          } : null,
          heatmap: {
            name: 'Elasticity Heatmap by Segment',
            description: 'Shows how price sensitivity varies by customer tenure and tier',
            interpretation: [
              'New subscribers (0-3mo) are typically more price-sensitive',
              'Tenured subscribers (12+mo) show lower elasticity (more loyal)',
              'This guides targeted pricing strategies by segment'
            ]
          }
        };

        const analysis = chartAnalysis[chartName];
        if (!analysis) {
          throw new Error(`Unknown chart: ${chartName}. Available charts: ${Object.keys(chartAnalysis).join(', ')}`);
        }

        return analysis;
      },

      // Deep comparison of multiple scenarios
      compareOutcomes: async (scenarioIds) => {
        if (scenarioIds.length < 2) {
          throw new Error('Need at least 2 scenarios to compare');
        }

        const scenarios = scenarioIds.map(id => allScenarios.find(s => s.id === id)).filter(s => s);
        if (scenarios.length === 0) {
          throw new Error('No valid scenarios found');
        }

        // Run all scenarios if not already simulated
        const results = [];
        for (const scenario of scenarios) {
          let result = allSimulationResults.find(r => r.scenario_id === scenario.id);
          if (!result && currentResult && currentResult.scenario_id === scenario.id) {
            result = currentResult;
          }
          if (!result) {
            result = await simulateScenario(scenario);
            allSimulationResults.push(result);
          }
          results.push(result);
        }

        // Analyze trade-offs
        const comparison = {
          scenarios: results.map(r => ({
            id: r.scenario_id,
            name: r.scenario_name,
            revenue_pct: r.delta.revenue_pct,
            subscribers_pct: r.delta.subscribers_pct,
            churn_pct: r.delta.churn_rate_pct,
            arpu_pct: r.delta.arpu_pct
          })),

          best_for: {
            revenue: results.reduce((best, r) => r.delta.revenue_pct > best.delta.revenue_pct ? r : best).scenario_name,
            subscribers: results.reduce((best, r) => r.delta.subscribers_pct > best.delta.subscribers_pct ? r : best).scenario_name,
            churn: results.reduce((best, r) => r.delta.churn_rate_pct < best.delta.churn_rate_pct ? r : best).scenario_name,
            arpu: results.reduce((best, r) => r.delta.arpu_pct > best.delta.arpu_pct ? r : best).scenario_name
          },

          tradeoffs: results.map(r => ({
            scenario: r.scenario_name,
            tradeoff: `Revenue ${r.delta.revenue_pct >= 0 ? '+' : ''}${r.delta.revenue_pct.toFixed(1)}% vs Subscribers ${r.delta.subscribers_pct >= 0 ? '+' : ''}${r.delta.subscribers_pct.toFixed(1)}%`,
            risk_level: r.warnings && r.warnings.length > 0 ? 'High' : Math.abs(r.delta.subscribers_pct) > 10 ? 'Medium' : 'Low'
          })),

          recommendation: `Best scenario depends on business priority. For revenue: ${results.reduce((best, r) => r.delta.revenue_pct > best.delta.revenue_pct ? r : best).scenario_name}. For growth: ${results.reduce((best, r) => r.delta.subscribers_pct > best.delta.subscribers_pct ? r : best).scenario_name}.`
        };

        return comparison;
      },

      // Create a new scenario from parameters
      createScenario: async (parameters) => {
        const { tier, price_change, promotion_discount, promotion_duration } = parameters;

        if (!tier || !['ad_supported', 'ad_free', 'annual'].includes(tier)) {
          throw new Error('Invalid tier. Must be: ad_supported, ad_free, or annual');
        }

        const tierPrices = {
          ad_supported: 5.99,
          ad_free: 8.99,
          annual: 71.88
        };

        const currentPrice = tierPrices[tier];
        let newPrice;
        let scenarioType;

        if (promotion_discount && promotion_duration) {
          // Promotion scenario
          newPrice = currentPrice * (1 - promotion_discount / 100);
          scenarioType = 'promotion';
        } else if (price_change !== undefined) {
          // Price change scenario
          newPrice = currentPrice + price_change;
          scenarioType = 'price_change';
        } else {
          throw new Error('Must specify either price_change or (promotion_discount and promotion_duration)');
        }

        const newScenario = {
          id: `scenario_custom_${Date.now()}`,
          name: scenarioType === 'promotion'
            ? `${promotion_discount}% Off Promo (${promotion_duration}mo) - ${tier}`
            : `${tier} ${price_change >= 0 ? '+' : ''}$${price_change.toFixed(2)}`,
          description: `Custom scenario created via chatbot`,
          category: scenarioType,
          config: {
            tier: tier,
            current_price: currentPrice,
            new_price: newPrice,
            price_change_pct: ((newPrice - currentPrice) / currentPrice) * 100
          },
          constraints: {
            min_price: currentPrice * 0.5,
            max_price: currentPrice * 1.5
          }
        };

        if (scenarioType === 'promotion') {
          newScenario.config.promotion = {
            discount_pct: promotion_discount,
            duration_months: promotion_duration
          };
        }

        // Add to scenarios list
        allScenarios.push(newScenario);

        return {
          created: true,
          scenario: newScenario,
          message: `Created scenario: ${newScenario.name}. Use interpretScenario('${newScenario.id}') to simulate and analyze results.`
        };
      }
    };

    // Initialize chat module with scenario-focused context
    initializeChat(context);
    console.log('Chat initialized with scenario-focused context');

  } catch (error) {
    console.error('Error initializing chat context:', error);
    throw error;
  }
}

// Load sample data with progress bar
async function loadData() {
  const btn = document.getElementById('load-data-btn');
  const progressContainer = document.getElementById('loading-progress');
  const progressBar = document.getElementById('loading-progress-bar');
  const progressText = document.getElementById('loading-percentage');
  const stageText = document.getElementById('loading-stage');

  // Hide button, show progress
  btn.style.display = 'none';
  progressContainer.style.display = 'block';

  // Define loading stages
  const stages = [
    { progress: 0, text: 'Initializing data loader...' },
    { progress: 15, text: 'Loading CSV files...' },
    { progress: 30, text: 'Parsing weekly aggregated data...' },
    { progress: 45, text: 'Calculating KPIs...' },
    { progress: 60, text: 'Loading pricing scenarios...' },
    { progress: 75, text: 'Analyzing price elasticity...' },
    { progress: 85, text: 'Initializing AI chat context...' },
    { progress: 95, text: 'Finalizing data viewer...' },
    { progress: 100, text: 'Complete!' }
  ];

  // Random total duration between 2-7 seconds
  const totalDuration = 2000 + Math.random() * 5000;
  const stageInterval = totalDuration / stages.length;

  try {
    // Show progress through stages
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      // Update UI
      progressBar.style.width = stage.progress + '%';
      progressBar.setAttribute('aria-valuenow', stage.progress);
      progressText.textContent = stage.progress + '%';
      stageText.textContent = stage.text;

      // Add color transition as we progress
      if (stage.progress >= 75) {
        progressBar.classList.remove('bg-primary');
        progressBar.classList.add('bg-success');
      }

      // Wait for stage interval
      await new Promise(resolve => setTimeout(resolve, stageInterval));

      // Load actual data at specific stages
      if (stage.progress === 45) {
        await loadKPIs();
      } else if (stage.progress === 60) {
        await loadScenarioCards();
      } else if (stage.progress === 75) {
        await loadElasticityAnalytics();
      } else if (stage.progress === 85) {
        await initializeChatContext();
      } else if (stage.progress === 95) {
        initializeDataViewer();
      }
    }

    // Wait a bit before hiding progress
    await new Promise(resolve => setTimeout(resolve, 500));

    // Hide load button section, show all data sections
    document.getElementById('load-data-section').style.display = 'none';
    document.getElementById('kpi-section').style.display = 'block';
    document.getElementById('elasticity-section').style.display = 'block';
    document.getElementById('scenario-section').style.display = 'block';
    document.getElementById('analytics-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('data-viewer-section').style.display = 'block';

    // Re-initialize popovers for newly visible sections
    initializePopovers();

    dataLoaded = true;
    console.log('Data loaded successfully!');

  } catch (error) {
    console.error('Error loading data:', error);

    // Show error state
    progressBar.classList.remove('bg-success');
    progressBar.classList.add('bg-danger');
    stageText.textContent = 'Error loading data: ' + error.message;

    // Reset after 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    progressContainer.style.display = 'none';
    btn.style.display = 'inline-block';
    btn.disabled = false;
  }
}

// Save current scenario
function saveScenario() {
  if (!currentResult) return;

  savedScenarios.push({
    ...currentResult,
    savedAt: new Date().toISOString()
  });

  // Update UI
  document.getElementById('saved-scenarios-count').textContent = `${savedScenarios.length} scenario${savedScenarios.length !== 1 ? 's' : ''} saved`;
  document.getElementById('compare-btn').disabled = savedScenarios.length < 2;

  // Show comparison section
  if (savedScenarios.length >= 1) {
    document.getElementById('comparison-section').style.display = 'block';
  }

  alert(`Scenario "${currentResult.scenario_name}" saved! You can now compare it with other scenarios.`);
}

// Compare saved scenarios
function compareScenarios() {
  if (savedScenarios.length < 2) {
    alert('Please save at least 2 scenarios to compare.');
    return;
  }

  // Prepare data for grouped bar chart
  const barChartData = savedScenarios.map(s => ({
    name: s.scenario_name,
    subscribers_pct: s.delta.subscribers_pct,
    revenue_pct: s.delta.revenue_pct,
    arpu_pct: s.delta.arpu_pct,
    churn_pct: s.delta.churn_rate_pct
  }));

  // Prepare data for radar chart
  const radarChartData = savedScenarios.map(s => ({
    name: s.scenario_name,
    dimensions: {
      revenue: s.delta.revenue_pct,
      growth: s.delta.subscribers_pct,
      arpu: s.delta.arpu_pct,
      churn: s.delta.churn_rate_pct,
      cltv: s.delta.cltv_pct
    }
  }));

  // Render charts
  renderComparisonBarChart('comparison-bar-chart', barChartData, { width: 750, height: 450 });
  renderRadarChart('comparison-radar-chart', radarChartData, { width: 500, height: 500 });

  // Show comparison charts
  document.getElementById('comparison-charts').style.display = 'block';

  // Scroll to comparison
  document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' });
}

// Clear saved scenarios
function clearScenarios() {
  if (savedScenarios.length === 0) return;

  if (confirm('Are you sure you want to clear all saved scenarios?')) {
    savedScenarios = [];
    document.getElementById('saved-scenarios-count').textContent = '0 scenarios saved';
    document.getElementById('compare-btn').disabled = true;
    document.getElementById('comparison-charts').style.display = 'none';
  }
}

// Handle chat message send
async function handleChatSend() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('chat-send-btn').disabled = true;

  try {
    await sendMessage(message);
  } finally {
    input.disabled = false;
    document.getElementById('chat-send-btn').disabled = false;
    input.focus();
  }
}

// Open Scenario Editor
function openScenarioEditor(scenarioId) {
  const scenario = allScenarios.find(s => s.id === scenarioId);
  if (!scenario) return;

  // Populate form
  document.getElementById('edit-scenario-id').value = scenario.id;
  document.getElementById('edit-scenario-name').value = scenario.name;
  document.getElementById('edit-tier').value = scenario.config.tier.replace('_', ' ').toUpperCase();
  document.getElementById('edit-current-price').value = scenario.config.current_price;
  document.getElementById('edit-new-price').value = scenario.config.new_price;

  // Show constraints
  const constraints = scenario.constraints;
  document.getElementById('price-constraints').textContent =
    `Valid range: $${constraints.min_price} - $${constraints.max_price}`;

  // Show promotion settings if applicable
  if (scenario.config.promotion) {
    document.getElementById('promotion-settings').style.display = 'block';
    document.getElementById('edit-discount-pct').value = scenario.config.promotion.discount_pct;
    document.getElementById('edit-duration-months').value = scenario.config.promotion.duration_months;
  } else {
    document.getElementById('promotion-settings').style.display = 'none';
  }

  // Update price change indicator
  updatePriceChangeIndicator();

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('scenarioEditorModal'));
  modal.show();
}

// Update price change indicator
function updatePriceChangeIndicator() {
  const currentPrice = parseFloat(document.getElementById('edit-current-price').value);
  const newPrice = parseFloat(document.getElementById('edit-new-price').value);

  if (currentPrice && newPrice) {
    const change = ((newPrice - currentPrice) / currentPrice) * 100;
    const indicator = document.getElementById('price-change-indicator');
    indicator.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
    indicator.className = 'input-group-text';
    if (change > 0) indicator.classList.add('bg-danger', 'text-white');
    else if (change < 0) indicator.classList.add('bg-success', 'text-white');
  }
}

// Save edited scenario
async function saveEditedScenario() {
  const scenarioId = document.getElementById('edit-scenario-id').value;
  const scenario = allScenarios.find(s => s.id === scenarioId);
  if (!scenario) return;

  // Get new values
  const newPrice = parseFloat(document.getElementById('edit-new-price').value);
  const discountPct = document.getElementById('edit-discount-pct').value ?
    parseFloat(document.getElementById('edit-discount-pct').value) : null;
  const durationMonths = document.getElementById('edit-duration-months').value ?
    parseInt(document.getElementById('edit-duration-months').value) : null;

  // Validate constraints
  if (newPrice < scenario.constraints.min_price || newPrice > scenario.constraints.max_price) {
    alert(`Price must be between $${scenario.constraints.min_price} and $${scenario.constraints.max_price}`);
    return;
  }

  // Update scenario
  scenario.config.new_price = newPrice;
  scenario.config.price_change_pct = ((newPrice - scenario.config.current_price) / scenario.config.current_price) * 100;

  if (scenario.config.promotion && discountPct && durationMonths) {
    scenario.config.promotion.discount_pct = discountPct;
    scenario.config.promotion.duration_months = durationMonths;

    // Recalculate promo price
    scenario.config.new_price = scenario.config.current_price * (1 - discountPct / 100);
  }

  // Update description
  if (scenario.category === 'promotion') {
    scenario.name = `Launch ${discountPct}% Off Promo (${durationMonths} months)`;
    scenario.description = `Offer ${discountPct}% discount for ${durationMonths} months on ${scenario.config.tier.replace('_', '-')} tier`;
  } else {
    const priceDiff = newPrice - scenario.config.current_price;
    scenario.name = `${scenario.config.tier.replace('_', ' ')} ${priceDiff >= 0 ? '+' : ''}$${Math.abs(priceDiff).toFixed(2)}`;
  }

  // Close modal properly to avoid focus issues
  const modalElement = document.getElementById('scenarioEditorModal');
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (modalInstance) {
    modalInstance.hide();
  }

  // Wait for modal to close animation
  await new Promise(resolve => setTimeout(resolve, 300));

  // Reload scenario cards
  await loadScenarioCards();

  // If this was the selected scenario, re-select it
  if (selectedScenario && selectedScenario.id === scenarioId) {
    selectedScenario = scenario;
    const cardElement = document.querySelector(`[data-scenario-id="${scenarioId}"]`);
    if (cardElement) {
      cardElement.classList.add('selected');
    }
  }

  alert('Scenario updated! Click "Simulate" to see the new results.');
}

// Initialize Bootstrap popovers for ML methodology
function initializePopovers() {
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => {
    return new bootstrap.Popover(popoverTriggerEl, {
      html: true,
      sanitize: false,
      trigger: 'focus'
    });
  });
  console.log(`Initialized ${popoverList.length} ML methodology popovers`);
}

// Initialize app
async function init() {
  console.log('Initializing Price Elasticity POC...');

  // Add event listeners
  document.getElementById('load-data-btn').addEventListener('click', loadData);
  document.getElementById('simulate-btn').addEventListener('click', runSimulation);
  document.getElementById('save-scenario-btn').addEventListener('click', saveScenario);
  document.getElementById('compare-btn').addEventListener('click', compareScenarios);
  document.getElementById('clear-scenarios-btn').addEventListener('click', clearScenarios);

  // Chat event listeners
  document.getElementById('configure-llm').addEventListener('click', configureLLM);
  document.getElementById('chat-send-btn').addEventListener('click', handleChatSend);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  // Suggested query buttons
  document.querySelectorAll('.suggested-query').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.textContent.trim();
      document.getElementById('chat-input').value = query;
      handleChatSend();
    });
  });

  // Initialize popovers (will be initialized again after data loads)
  initializePopovers();

  // Scenario editor event listeners
  document.getElementById('edit-new-price').addEventListener('input', updatePriceChangeIndicator);
  document.getElementById('save-edited-scenario-btn').addEventListener('click', saveEditedScenario);

  console.log('POC initialized successfully!');
}

// Start app
init().catch(error => {
  console.error('Failed to initialize app:', error);
  alert('Failed to load application. Please check console for details.');
});
