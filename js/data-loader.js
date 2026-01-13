/**
 * Data Loader Module
 * Loads and preprocesses all data files for the Price Elasticity POC
 *
 * Dependencies: None (Vanilla JavaScript)
 *
 * Usage:
 *   import { loadAllData } from './data-loader.js';
 *   const data = await loadAllData();
 */

// Global data cache to avoid redundant fetches
const dataCache = {
  subscribers: null,
  weeklyAggregated: null,
  pricingHistory: null,
  externalFactors: null,
  marketingSpend: null,
  contentReleases: null,
  elasticityParams: null,
  scenarios: null,
  metadata: null
};

/**
 * Load all data files in parallel
 * @returns {Promise<Object>} Object containing all loaded datasets
 */
export async function loadAllData() {
  try {
    const [
      elasticityParams,
      scenarios,
      metadata,
      weeklyAggregated,
      pricingHistory,
      externalFactors
    ] = await Promise.all([
      loadElasticityParams(),
      loadScenarios(),
      loadMetadata(),
      loadWeeklyAggregated(),
      loadPricingHistory(),
      loadExternalFactors()
    ]);

    return {
      elasticityParams,
      scenarios,
      metadata,
      weeklyAggregated,
      pricingHistory,
      externalFactors
    };
  } catch (error) {
    console.error('Error loading data:', error);
    throw new Error('Failed to load required data files');
  }
}

/**
 * Load elasticity parameters from JSON
 * @returns {Promise<Object>} Elasticity parameters object
 */
export async function loadElasticityParams() {
  if (dataCache.elasticityParams) {
    return dataCache.elasticityParams;
  }

  try {
    const response = await fetch('data/elasticity-params.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    dataCache.elasticityParams = data;
    return data;
  } catch (error) {
    console.error('Error loading elasticity parameters:', error);
    throw error;
  }
}

/**
 * Load scenario definitions from JSON
 * @returns {Promise<Array>} Array of scenario objects
 */
export async function loadScenarios() {
  if (dataCache.scenarios) {
    return dataCache.scenarios;
  }

  try {
    const response = await fetch('data/scenarios.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    dataCache.scenarios = data;
    return data;
  } catch (error) {
    console.error('Error loading scenarios:', error);
    throw error;
  }
}

/**
 * Load metadata from JSON
 * @returns {Promise<Object>} Metadata object
 */
export async function loadMetadata() {
  if (dataCache.metadata) {
    return dataCache.metadata;
  }

  try {
    const response = await fetch('data/metadata.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    dataCache.metadata = data;
    return data;
  } catch (error) {
    console.error('Error loading metadata:', error);
    throw error;
  }
}

/**
 * Load weekly aggregated data from CSV
 * @returns {Promise<Array>} Array of weekly aggregated records
 */
export async function loadWeeklyAggregated() {
  if (dataCache.weeklyAggregated) {
    return dataCache.weeklyAggregated;
  }

  try {
    const response = await fetch('data/weekly_aggregated.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);
    dataCache.weeklyAggregated = data;
    return data;
  } catch (error) {
    console.error('Error loading weekly aggregated data:', error);
    throw error;
  }
}

/**
 * Load pricing history from CSV
 * @returns {Promise<Array>} Array of pricing history records
 */
export async function loadPricingHistory() {
  if (dataCache.pricingHistory) {
    return dataCache.pricingHistory;
  }

  try {
    const response = await fetch('data/pricing_history.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);
    dataCache.pricingHistory = data;
    return data;
  } catch (error) {
    console.error('Error loading pricing history:', error);
    throw error;
  }
}

/**
 * Load external factors from CSV
 * @returns {Promise<Array>} Array of external factor records
 */
export async function loadExternalFactors() {
  if (dataCache.externalFactors) {
    return dataCache.externalFactors;
  }

  try {
    const response = await fetch('data/external_factors.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);
    dataCache.externalFactors = data;
    return data;
  } catch (error) {
    console.error('Error loading external factors:', error);
    throw error;
  }
}

/**
 * Simple CSV parser
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Object>} Array of objects with headers as keys
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  const data = lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};

    headers.forEach((header, index) => {
      let value = values[index];

      // Try to parse as number
      if (!isNaN(value) && value !== '') {
        value = parseFloat(value);
      }
      // Parse booleans
      else if (value === 'True' || value === 'true') {
        value = true;
      } else if (value === 'False' || value === 'false') {
        value = false;
      }
      // Keep as string if empty
      else if (value === '') {
        value = null;
      }

      obj[header] = value;
    });

    return obj;
  });

  return data;
}

/**
 * Get elasticity for a specific tier and segment
 * @param {string} tier - Tier name (ad_supported, ad_free, annual)
 * @param {string} segment - Segment name (optional, e.g., 'new_0_3mo')
 * @returns {Promise<number>} Elasticity coefficient
 */
export async function getElasticity(tier, segment = null) {
  const params = await loadElasticityParams();

  if (!params.tiers[tier]) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  if (segment && params.tiers[tier].segments[segment]) {
    return params.tiers[tier].segments[segment].elasticity;
  }

  return params.tiers[tier].base_elasticity;
}

/**
 * Get scenario by ID
 * @param {string} scenarioId - Scenario ID
 * @returns {Promise<Object>} Scenario object
 */
export async function getScenarioById(scenarioId) {
  const scenarios = await loadScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);

  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  return scenario;
}

/**
 * Get scenarios by category
 * @param {string} category - Category name (e.g., 'price_increase')
 * @returns {Promise<Array>} Array of scenario objects
 */
export async function getScenariosByCategory(category) {
  const scenarios = await loadScenarios();
  return scenarios.filter(s => s.category === category);
}

/**
 * Get baseline scenario
 * @returns {Promise<Object>} Baseline scenario object
 */
export async function getBaselineScenario() {
  return await getScenarioById('scenario_baseline');
}

/**
 * Filter weekly data by tier and date range
 * @param {string} tier - Tier name (optional, 'all' for all tiers)
 * @param {string} startDate - Start date (YYYY-MM-DD, optional)
 * @param {string} endDate - End date (YYYY-MM-DD, optional)
 * @returns {Promise<Array>} Filtered data
 */
export async function getWeeklyData(tier = 'all', startDate = null, endDate = null) {
  const data = await loadWeeklyAggregated();

  let filtered = data;

  // Filter by tier
  if (tier !== 'all') {
    filtered = filtered.filter(d => d.tier === tier);
  }

  // Filter by date range
  if (startDate) {
    filtered = filtered.filter(d => d.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(d => d.date <= endDate);
  }

  return filtered;
}

/**
 * Get current pricing for all tiers
 * @returns {Promise<Object>} Object with current prices by tier
 */
export async function getCurrentPrices() {
  const pricingHistory = await loadPricingHistory();

  // Get latest date
  const latestDate = pricingHistory.reduce((max, record) => {
    return record.date > max ? record.date : max;
  }, '2000-01-01');

  // Get prices for latest date
  const latestPrices = pricingHistory
    .filter(record => record.date === latestDate)
    .reduce((acc, record) => {
      acc[record.tier] = {
        base_price: record.base_price,
        effective_price: record.effective_price,
        is_promo: record.is_promo,
        promo_discount_pct: record.promo_discount_pct
      };
      return acc;
    }, {});

  return latestPrices;
}

/**
 * Get column description from metadata
 * @param {string} dataset - Dataset name (e.g., 'subscribers')
 * @param {string} column - Column name
 * @returns {Promise<string>} Column description
 */
export async function getColumnDescription(dataset, column) {
  const metadata = await loadMetadata();

  if (!metadata.datasets[dataset]) {
    return 'No description available';
  }

  const columnInfo = metadata.datasets[dataset].columns[column];
  return columnInfo ? columnInfo.description : 'No description available';
}

/**
 * Get business term definition
 * @param {string} term - Business term (e.g., 'ARPU')
 * @returns {Promise<string>} Term definition
 */
export async function getBusinessTermDefinition(term) {
  const metadata = await loadMetadata();

  if (!metadata.business_glossary[term]) {
    return 'Term not found in glossary';
  }

  return metadata.business_glossary[term].definition;
}

/**
 * Clear data cache (useful for testing or forcing refresh)
 */
export function clearCache() {
  Object.keys(dataCache).forEach(key => {
    dataCache[key] = null;
  });
  console.log('Data cache cleared');
}

/**
 * Get cache status
 * @returns {Object} Object showing which datasets are cached
 */
export function getCacheStatus() {
  const status = {};
  Object.keys(dataCache).forEach(key => {
    status[key] = dataCache[key] !== null ? 'cached' : 'not cached';
  });
  return status;
}

// Export dataCache for advanced usage
export { dataCache };
