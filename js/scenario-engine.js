/**
 * Scenario Engine Module
 * Simulate pricing scenarios and forecast KPIs
 *
 * Dependencies: elasticity-model.js, data-loader.js
 */

import {
  forecastDemand,
  forecastChurn,
  forecastAcquisition,
  calculateElasticity
} from './elasticity-model.js';

import { getWeeklyData, getCurrentPrices } from './data-loader.js';

/**
 * Simulate a pricing scenario
 * @param {Object} scenario - Scenario configuration
 * @param {Object} options - Additional options {timeHorizon, startDate}
 * @returns {Promise<Object>} Simulation results
 */
export async function simulateScenario(scenario, options = {}) {
  const timeHorizon = options.timeHorizon || 'medium_term_3_12mo';

  try {
    console.log('Simulating scenario:', scenario.id, 'for tier:', scenario.config.tier);

    // Get baseline data (pass scenario for bundle handling)
    const baseline = await getBaselineMetrics(scenario.config.tier, scenario);
    console.log('Baseline metrics retrieved:', baseline);

    // Calculate elasticity for this scenario
    const elasticityInfo = await calculateElasticity(
      scenario.config.tier,
      null,
      { timeHorizon }
    );

    // Calculate price change percentage
    const priceChangePct = (scenario.config.new_price - scenario.config.current_price) / scenario.config.current_price;

    // Forecast demand
    const demandForecast = forecastDemand(
      scenario.config.current_price,
      scenario.config.new_price,
      baseline.activeSubscribers,
      elasticityInfo.elasticity
    );

    // Forecast churn
    const churnForecast = await forecastChurn(
      scenario.config.tier,
      priceChangePct,
      baseline.churnRate
    );

    // Forecast acquisition
    const acquisitionForecast = await forecastAcquisition(
      scenario.config.tier,
      priceChangePct,
      baseline.newSubscribers
    );

    // Calculate revenue impact
    const revenueImpact = calculateRevenueImpact(
      demandForecast.forecastedSubscribers,
      scenario.config.new_price,
      baseline.activeSubscribers,
      scenario.config.current_price
    );

    // Calculate ARPU
    const forecastedARPU = scenario.config.new_price;
    const arpuChange = forecastedARPU - baseline.arpu;

    // Estimate CLTV (simplified: ARPU × average lifetime months)
    const avgLifetimeMonths = 24; // Assumption
    const forecastedCLTV = forecastedARPU * avgLifetimeMonths;
    const baselineCLTV = baseline.arpu * avgLifetimeMonths;

    // Calculate net adds (new acquisitions - churn)
    const forecastedChurnCount = Math.round(demandForecast.forecastedSubscribers * churnForecast.forecastedChurn);
    const forecastedNetAdds = acquisitionForecast.forecastedAcquisition - forecastedChurnCount;
    const baselineNetAdds = baseline.newSubscribers - Math.round(baseline.activeSubscribers * baseline.churnRate);

    // Generate time series forecast (12 months)
    const timeSeries = generateTimeSeries(
      demandForecast,
      churnForecast,
      acquisitionForecast,
      scenario.config.new_price,
      12
    );

    // Compile results
    const result = {
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      elasticity: elasticityInfo.elasticity,
      confidence_interval: elasticityInfo.confidenceInterval,

      baseline: {
        subscribers: baseline.activeSubscribers,
        churn_rate: baseline.churnRate,
        new_subscribers: baseline.newSubscribers,
        revenue: baseline.revenue,
        arpu: baseline.arpu,
        cltv: baselineCLTV,
        net_adds: baselineNetAdds
      },

      forecasted: {
        subscribers: demandForecast.forecastedSubscribers,
        churn_rate: churnForecast.forecastedChurn,
        new_subscribers: acquisitionForecast.forecastedAcquisition,
        revenue: revenueImpact.forecastedRevenue,
        arpu: forecastedARPU,
        cltv: forecastedCLTV,
        net_adds: forecastedNetAdds
      },

      delta: {
        subscribers: demandForecast.change,
        subscribers_pct: demandForecast.percentChange,
        churn_rate: churnForecast.change,
        churn_rate_pct: churnForecast.changePercent,
        new_subscribers: acquisitionForecast.change,
        new_subscribers_pct: acquisitionForecast.changePercent,
        revenue: revenueImpact.change,
        revenue_pct: revenueImpact.percentChange,
        arpu: arpuChange,
        arpu_pct: (arpuChange / baseline.arpu) * 100,
        cltv: forecastedCLTV - baselineCLTV,
        cltv_pct: ((forecastedCLTV - baselineCLTV) / baselineCLTV) * 100,
        net_adds: forecastedNetAdds - baselineNetAdds
      },

      time_series: timeSeries,

      warnings: generateWarnings(scenario, churnForecast, demandForecast),

      constraints_met: checkConstraints(scenario)
    };

    return result;

  } catch (error) {
    console.error('Error simulating scenario:', error);
    throw error;
  }
}

/**
 * Get baseline metrics for a tier
 * @param {string} tier - Tier name
 * @param {Object} scenario - Scenario object (for special handling)
 * @returns {Promise<Object>} Baseline metrics
 */
async function getBaselineMetrics(tier, scenario = null) {
  // Special handling for bundle scenarios
  if (tier === 'bundle') {
    console.log('Bundle scenario detected - using ad_free tier as baseline');

    // Use ad_free tier as baseline since bundle includes Discovery+ ad-free
    const weeklyData = await getWeeklyData('ad_free');

    if (!weeklyData || weeklyData.length === 0) {
      throw new Error('No data available for ad_free tier (needed for bundle baseline)');
    }

    const latestWeek = weeklyData[weeklyData.length - 1];

    // For bundle scenarios, estimate potential bundle subscribers as a percentage of ad_free
    // Assumption: ~30% of ad_free users might be interested in bundle
    const bundlePotentialPct = 0.30;
    const estimatedBundleSubs = Math.round((latestWeek.active_subscribers || 0) * bundlePotentialPct);

    // Bundle ARPU is the bundle price
    const bundleARPU = scenario?.config?.new_price || 14.99;

    return {
      activeSubscribers: estimatedBundleSubs,
      churnRate: (latestWeek.churn_rate || 0) * 0.7, // Bundles typically have lower churn
      newSubscribers: Math.round((latestWeek.new_subscribers || 0) * bundlePotentialPct),
      revenue: estimatedBundleSubs * bundleARPU,
      arpu: bundleARPU,
      isBundle: true,
      baseTier: 'ad_free'
    };
  }

  // Regular tier handling
  const weeklyData = await getWeeklyData(tier);

  if (!weeklyData || weeklyData.length === 0) {
    throw new Error(`No data available for tier: ${tier}. Please ensure data is loaded correctly.`);
  }

  const latestWeek = weeklyData[weeklyData.length - 1];

  if (!latestWeek) {
    throw new Error(`Unable to retrieve latest week data for tier: ${tier}`);
  }

  return {
    activeSubscribers: latestWeek.active_subscribers || 0,
    churnRate: latestWeek.churn_rate || 0,
    newSubscribers: latestWeek.new_subscribers || 0,
    revenue: latestWeek.revenue || 0,
    arpu: latestWeek.arpu || 0,
    isBundle: false
  };
}

/**
 * Calculate revenue impact
 * @param {number} forecastedSubs - Forecasted subscriber count
 * @param {number} newPrice - New price
 * @param {number} baselineSubs - Baseline subscriber count
 * @param {number} currentPrice - Current price
 * @returns {Object} Revenue impact
 */
function calculateRevenueImpact(forecastedSubs, newPrice, baselineSubs, currentPrice) {
  // Monthly revenue = subscribers × price
  const forecastedRevenue = forecastedSubs * newPrice;
  const baselineRevenue = baselineSubs * currentPrice;
  const change = forecastedRevenue - baselineRevenue;
  const percentChange = (change / baselineRevenue) * 100;

  return {
    baselineRevenue,
    forecastedRevenue,
    change,
    percentChange
  };
}

/**
 * Generate time series forecast
 * @param {Object} demandForecast - Demand forecast object
 * @param {Object} churnForecast - Churn forecast object
 * @param {Object} acquisitionForecast - Acquisition forecast object
 * @param {number} newPrice - New price
 * @param {number} months - Number of months to forecast
 * @returns {Array} Time series data
 */
function generateTimeSeries(demandForecast, churnForecast, acquisitionForecast, newPrice, months) {
  const series = [];
  let currentSubs = demandForecast.baseSubscribers;

  for (let month = 0; month <= months; month++) {
    // Month 0 is baseline
    if (month === 0) {
      series.push({
        month: 0,
        subscribers: currentSubs,
        revenue: currentSubs * (newPrice / (1 + (demandForecast.priceChangePct / 100))),
        churn_rate: churnForecast.baselineChurn
      });
      continue;
    }

    // Apply changes gradually over time
    const progressFactor = Math.min(month / 3, 1); // Full effect after 3 months

    // Calculate subscriber change
    const totalChange = demandForecast.forecastedSubscribers - demandForecast.baseSubscribers;
    currentSubs = demandForecast.baseSubscribers + (totalChange * progressFactor);

    // Calculate churn for this month
    const churnChange = churnForecast.forecastedChurn - churnForecast.baselineChurn;
    const monthChurnRate = churnForecast.baselineChurn + (churnChange * progressFactor);

    // Revenue
    const revenue = currentSubs * newPrice;

    series.push({
      month,
      subscribers: Math.round(currentSubs),
      revenue: Math.round(revenue),
      churn_rate: monthChurnRate
    });
  }

  return series;
}

/**
 * Generate warnings based on scenario results
 * @param {Object} scenario - Scenario configuration
 * @param {Object} churnForecast - Churn forecast
 * @param {Object} demandForecast - Demand forecast
 * @returns {Array} Array of warning messages
 */
function generateWarnings(scenario, churnForecast, demandForecast) {
  const warnings = [];

  // Warn if churn increases significantly
  if (churnForecast.changePercent > 10) {
    warnings.push(`Churn rate increases by ${churnForecast.changePercent.toFixed(1)}% (exceeds 10% threshold)`);
  }

  // Warn if subscriber loss is significant
  if (demandForecast.percentChange < -5) {
    warnings.push(`Subscriber base decreases by ${Math.abs(demandForecast.percentChange).toFixed(1)}% (exceeds 5% threshold)`);
  }

  // Warn about large price increases
  const priceChangePct = ((scenario.config.new_price - scenario.config.current_price) / scenario.config.current_price) * 100;
  if (priceChangePct > 20) {
    warnings.push(`Price increase of ${priceChangePct.toFixed(1)}% may be too aggressive`);
  }

  return warnings;
}

/**
 * Check if scenario meets platform and policy constraints
 * @param {Object} scenario - Scenario object
 * @returns {boolean} True if constraints are met
 */
function checkConstraints(scenario) {
  if (!scenario.constraints) return true;

  // Check all constraint flags
  const constraintChecks = [
    scenario.constraints.platform_compliant,
    scenario.constraints.price_change_12mo_limit !== false, // May be missing
    scenario.constraints.notice_period_30d !== false
  ];

  return constraintChecks.every(check => check === true);
}

/**
 * Compare multiple scenarios
 * @param {Array} scenarios - Array of scenario objects
 * @returns {Promise<Array>} Array of simulation results
 */
export async function compareScenarios(scenarios) {
  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await simulateScenario(scenario);
      results.push(result);
    } catch (error) {
      console.error(`Error simulating scenario ${scenario.id}:`, error);
      results.push({
        scenario_id: scenario.id,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Rank scenarios by objective function
 * @param {Array} results - Array of simulation results
 * @param {string} objective - Objective ('revenue', 'growth', 'balanced')
 * @returns {Array} Ranked results
 */
export function rankScenarios(results, objective = 'balanced') {
  const validResults = results.filter(r => !r.error);

  const scored = validResults.map(result => {
    let score = 0;

    switch (objective) {
      case 'revenue':
        // Maximize revenue growth
        score = result.delta.revenue_pct;
        break;

      case 'growth':
        // Maximize subscriber growth
        score = result.delta.subscribers_pct;
        break;

      case 'balanced':
        // Balance revenue and subscriber growth
        score = (result.delta.revenue_pct * 0.6) + (result.delta.subscribers_pct * 0.4);
        // Penalize high churn
        if (result.delta.churn_rate_pct > 10) {
          score -= 10;
        }
        break;

      default:
        score = result.delta.revenue_pct;
    }

    return { ...result, score };
  });

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Export scenario result to CSV-compatible format
 * @param {Object} result - Simulation result
 * @returns {Object} Flattened result for CSV export
 */
export function exportScenarioResult(result) {
  return {
    scenario_id: result.scenario_id,
    scenario_name: result.scenario_name,
    elasticity: result.elasticity,

    baseline_subscribers: result.baseline.subscribers,
    baseline_revenue: result.baseline.revenue,
    baseline_churn_rate: result.baseline.churn_rate,
    baseline_arpu: result.baseline.arpu,

    forecasted_subscribers: result.forecasted.subscribers,
    forecasted_revenue: result.forecasted.revenue,
    forecasted_churn_rate: result.forecasted.churn_rate,
    forecasted_arpu: result.forecasted.arpu,

    delta_subscribers: result.delta.subscribers,
    delta_subscribers_pct: result.delta.subscribers_pct,
    delta_revenue: result.delta.revenue,
    delta_revenue_pct: result.delta.revenue_pct,
    delta_churn_rate: result.delta.churn_rate,

    warnings: result.warnings.join('; '),
    constraints_met: result.constraints_met
  };
}
