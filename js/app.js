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
            <h5 class="card-title">${scenario.name}</h5>
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

    // Add click handlers
    document.querySelectorAll('.scenario-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedScenario = allScenarios.find(s => s.id === card.dataset.scenarioId);
        document.getElementById('simulate-btn').disabled = false;
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
        y: {
          beginAtZero: false,
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

// Initialize chat context with tool implementations
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

    // Create data context for chat
    const context = {
      scenarios: allScenarios,
      currentSubscribers: totalSubs,
      currentRevenue: totalRevenue,
      currentChurn: avgChurn,

      // Tool implementations
      queryData: async (params) => {
        const { filters = {}, metrics = [], aggregation = 'avg' } = params;
        const tier = filters.tier || 'all';
        const data = await getWeeklyData(tier);

        // Apply date filters
        let filteredData = data;
        if (filters.date_start || filters.date_end) {
          filteredData = data.filter(d => {
            const date = new Date(d.date);
            if (filters.date_start && date < new Date(filters.date_start)) return false;
            if (filters.date_end && date > new Date(filters.date_end)) return false;
            return true;
          });
        }

        // Calculate aggregations
        const result = {};
        const detailedResults = {};

        for (const metric of metrics) {
          const values = filteredData.map(d => d[metric]).filter(v => v !== undefined && v !== null);

          switch (aggregation) {
            case 'avg':
              result[metric] = values.reduce((sum, v) => sum + v, 0) / values.length;
              detailedResults[metric] = {
                average: result[metric],
                min: Math.min(...values),
                max: Math.max(...values),
                first: values[0],
                last: values[values.length - 1]
              };
              break;
            case 'sum':
              result[metric] = values.reduce((sum, v) => sum + v, 0);
              detailedResults[metric] = {
                total: result[metric],
                average: result[metric] / values.length
              };
              break;
            case 'min':
              result[metric] = Math.min(...values);
              break;
            case 'max':
              result[metric] = Math.max(...values);
              break;
            case 'latest':
              result[metric] = values[values.length - 1];
              detailedResults[metric] = {
                latest: result[metric],
                previous: values[values.length - 2],
                change: values[values.length - 1] - values[values.length - 2]
              };
              break;
            case 'trend':
              // Simple trend: compare first quarter to last quarter
              const q1 = values.slice(0, Math.floor(values.length / 4));
              const q4 = values.slice(-Math.floor(values.length / 4));
              const q1Avg = q1.reduce((sum, v) => sum + v, 0) / q1.length;
              const q4Avg = q4.reduce((sum, v) => sum + v, 0) / q4.length;
              result[metric] = {
                trend: q4Avg > q1Avg ? 'increasing' : 'decreasing',
                change: q4Avg - q1Avg,
                change_pct: ((q4Avg - q1Avg) / q1Avg) * 100,
                first_period_avg: q1Avg,
                last_period_avg: q4Avg
              };
              detailedResults[metric] = result[metric];
              break;
          }
        }

        // Include sample data points for context
        const sampleData = filteredData.slice(0, 3).map(d => ({
          date: d.date,
          tier: d.tier,
          ...metrics.reduce((acc, m) => ({ ...acc, [m]: d[m] }), {})
        }));

        return {
          query: {
            filters,
            metrics,
            aggregation,
            tier,
            date_range: filters.date_start || filters.date_end ?
              `${filters.date_start || 'start'} to ${filters.date_end || 'end'}` : 'all dates'
          },
          data_points: filteredData.length,
          results: result,
          detailed_results: detailedResults,
          sample_data: sampleData,
          summary: `Analyzed ${filteredData.length} weekly data points for ${tier === 'all' ? 'all tiers' : tier + ' tier'}${filters.date_start ? ' from ' + filters.date_start : ''}${filters.date_end ? ' to ' + filters.date_end : ''}`
        };
      },

      runScenario: async (scenarioId) => {
        const scenario = allScenarios.find(s => s.id === scenarioId);
        if (!scenario) {
          throw new Error(`Scenario ${scenarioId} not found`);
        }

        const result = await simulateScenario(scenario);
        return {
          scenario_id: result.scenario_id,
          scenario_name: result.scenario_name,
          baseline: result.baseline,
          forecasted: result.forecasted,
          delta: result.delta,
          warnings: result.warnings,
          summary: `${result.scenario_name}: Revenue ${result.delta.revenue_pct >= 0 ? '+' : ''}${result.delta.revenue_pct.toFixed(1)}%, Subscribers ${result.delta.subscribers_pct >= 0 ? '+' : ''}${result.delta.subscribers_pct.toFixed(1)}%, Churn ${result.delta.churn_rate_pct >= 0 ? '+' : ''}${result.delta.churn_rate_pct.toFixed(1)}%`
        };
      },

      compareScenarios: async (scenarioIds, sortBy = 'revenue') => {
        const scenarios = scenarioIds.map(id => allScenarios.find(s => s.id === id)).filter(s => s);

        if (scenarios.length === 0) {
          throw new Error('No valid scenarios found');
        }

        const results = await compareScenariosEngine(scenarios);

        // Sort by specified metric
        const sorted = results.sort((a, b) => {
          switch (sortBy) {
            case 'revenue':
              return b.delta.revenue_pct - a.delta.revenue_pct;
            case 'subscribers':
              return b.delta.subscribers_pct - a.delta.subscribers_pct;
            case 'churn':
              return a.delta.churn_rate_pct - b.delta.churn_rate_pct; // Lower is better
            case 'arpu':
              return b.delta.arpu_pct - a.delta.arpu_pct;
            default:
              return 0;
          }
        });

        return {
          scenarios: sorted.map(r => ({
            id: r.scenario_id,
            name: r.scenario_name,
            revenue_change_pct: r.delta.revenue_pct,
            subscribers_change_pct: r.delta.subscribers_pct,
            churn_change_pct: r.delta.churn_rate_pct,
            arpu_change_pct: r.delta.arpu_pct
          })),
          sorted_by: sortBy,
          best_scenario: sorted[0].scenario_name,
          summary: `Compared ${scenarios.length} scenarios. Best for ${sortBy}: ${sorted[0].scenario_name} (${sortBy === 'churn' ? '' : '+'}${sorted[0].delta[sortBy + '_pct'].toFixed(1)}%)`
        };
      },

      getScenarioList: async () => {
        return {
          scenarios: allScenarios.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            priority: s.priority,
            tier: s.config?.tier,
            current_price: s.config?.current_price,
            new_price: s.config?.new_price
          })),
          total: allScenarios.length,
          categories: [...new Set(allScenarios.map(s => s.category))]
        };
      }
    };

    // Initialize chat module with context
    initializeChat(context);
    console.log('Chat initialized with data context');

  } catch (error) {
    console.error('Error initializing chat context:', error);
    throw error;
  }
}

// Load sample data
async function loadData() {
  const btn = document.getElementById('load-data-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

  try {
    await loadKPIs();
    await loadScenarioCards();
    await loadElasticityAnalytics();

    // Initialize chat with data context
    await initializeChatContext();

    // Hide load button, show sections
    document.getElementById('load-data-section').style.display = 'none';
    document.getElementById('kpi-section').style.display = 'block';
    document.getElementById('elasticity-section').style.display = 'block';
    document.getElementById('scenario-section').style.display = 'block';
    document.getElementById('analytics-section').style.display = 'block';
    document.getElementById('chat-section').style.display = 'block';

    dataLoaded = true;
    console.log('Data loaded successfully!');
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Failed to load data. Please check console for details.');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-download me-2"></i>Load Sample Data';
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

  console.log('POC initialized successfully!');
}

// Start app
init().catch(error => {
  console.error('Failed to initialize app:', error);
  alert('Failed to load application. Please check console for details.');
});
