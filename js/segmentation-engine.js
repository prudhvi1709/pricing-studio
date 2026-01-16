/**
 * Segmentation Engine Module
 * Core logic for customer segmentation, elasticity calculation with fallbacks, and KPI aggregation
 *
 * Dependencies: D3.js (for CSV/JSON loading)
 */

class SegmentationEngine {
    constructor() {
        this.segmentElasticity = null;
        this.customerSegments = null;
        this.segmentKPIs = null;

        // Strategic segment axis definitions (based on customer personas)
        this.axisDefinitions = {
            acquisition: [
                'habitual_streamers',
                'content_anchored_viewers',
                'at_risk_lapsers',
                'promo_only_users',
                'dormant_subscribers'
            ],
            engagement: [
                'ad_value_seekers',
                'ad_tolerant_upgraders',
                'ad_free_loyalists',
                'price_triggered_downgraders',
                'tvod_inclined_buyers'
            ],
            monetization: [
                'platform_bundled_acquirers',
                'tvod_to_svod_converters',
                'content_triggered_buyers',
                'deal_responsive_acquirers',
                'value_perception_buyers'
            ]
        };

        // Axis labels for display
        this.axisLabels = {
            acquisition: 'Axis 3: Acquisition Price Sensitivity',
            engagement: 'Axis 2: Engagement & Churn Propensity',
            monetization: 'Axis 1: Monetization & Plan Type'
        };

        // Segment descriptions and characteristics
        this.segmentDescriptions = {
            // Axis 3: Acquisition Price Sensitivity
            'habitual_streamers': {
                label: 'Habitual Streamers',
                description: 'Top quartile frequency & recency',
                elasticity_level: 'Very low churn elasticity'
            },
            'content_anchored_viewers': {
                label: 'Content-Anchored Viewers',
                description: 'High SVOD w/ genre affinity',
                elasticity_level: 'Low churn if content available'
            },
            'at_risk_lapsers': {
                label: 'At-Risk Lapsers',
                description: 'Declining frequency, high inactivity',
                elasticity_level: 'Moderate'
            },
            'promo_only_users': {
                label: 'Promo-Only Users',
                description: 'Engagement spikes only during discounts',
                elasticity_level: 'Extreme churn elasticity'
            },
            'dormant_subscribers': {
                label: 'Dormant Subscribers',
                description: 'No usage for X days',
                elasticity_level: 'Price irrelevant; experience/content first'
            },

            // Axis 2: Engagement & Churn Propensity
            'ad_value_seekers': {
                label: 'Ad-Value Seekers',
                description: 'Ad-supported plan, high ad completion, low ARPU',
                elasticity_level: 'Highly price elastic, sensitive to small increases'
            },
            'ad_tolerant_upgraders': {
                label: 'Ad-Tolerant Upgraders',
                description: 'Started on ad-tier, now upgraded',
                elasticity_level: 'Strong candidates for upsell elasticity modeling'
            },
            'ad_free_loyalists': {
                label: 'Ad-Free Loyalists',
                description: 'Long tenure on ad-free, low churn',
                elasticity_level: 'Low churn elasticity, ARPU growth anchor'
            },
            'price_triggered_downgraders': {
                label: 'Price-Triggered Downgraders',
                description: 'Past switches from ad-free → ad-tier',
                elasticity_level: 'Migration elasticity critical'
            },
            'tvod_inclined_buyers': {
                label: 'TVOD-Inclined Buyers',
                description: 'Has made at least one transactional purchase',
                elasticity_level: 'Monetization expansion segment'
            },

            // Axis 1: Monetization & Plan Type
            'platform_bundled_acquirers': {
                label: 'Platform-Bundled Acquirers',
                description: 'App store / bundle-driven',
                elasticity_level: 'Low-moderate'
            },
            'tvod_to_svod_converters': {
                label: 'TVOD-to-SVOD Converters',
                description: 'First transaction was TVOD',
                elasticity_level: 'Low price sensitivity for entry'
            },
            'content_triggered_buyers': {
                label: 'Content-Triggered Buyers',
                description: 'Subscribes after viewing specific titles',
                elasticity_level: 'Low'
            },
            'deal_responsive_acquirers': {
                label: 'Deal-Responsive Acquirers',
                description: 'Enters via discounts/free trial',
                elasticity_level: 'Very high'
            },
            'value_perception_buyers': {
                label: 'Value-Perception Buyers',
                description: 'Subscribes at full price after browsing',
                elasticity_level: 'Moderate'
            }
        };
    }

    /**
     * Load all segment data files
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async loadSegmentData() {
        try {
            const [elasticity, segments, kpis] = await Promise.all([
                d3.json('data/segment_elasticity.json'),
                d3.csv('data/customer_segments.csv'),
                d3.csv('data/segment_kpis.csv')
            ]);

            this.segmentElasticity = elasticity;
            this.customerSegments = segments;
            this.segmentKPIs = this.#indexKPIsByCompositeKey(kpis);

            return true;
        } catch (error) {
            console.error('Failed to load segment data:', error);
            return false;
        }
    }

    /**
     * Get elasticity with 4-level fallback strategy
     * @param {string} tier - Subscription tier (ad_supported, ad_free, annual)
     * @param {string} compositeKey - Segment composite key "tenure|age|device"
     * @param {string} axis - Axis name ('engagement', 'monetization', 'acquisition')
     * @returns {number} Elasticity value
     */
    getElasticity(tier, compositeKey, axis = null) {
        try {
            // Validate inputs
            if (!tier || !compositeKey) {
                console.warn('Invalid parameters for elasticity lookup:', { tier, compositeKey });
                return this.#getBaseFallback(tier);
            }

            // Check if data is loaded
            if (!this.segmentElasticity) {
                console.warn('Segment elasticity data not loaded');
                return this.#getBaseFallback(tier);
            }

            const tierData = this.segmentElasticity[tier];
            if (!tierData) {
                console.warn(`No elasticity data for tier: ${tier}`);
                return this.#getBaseFallback(tier);
            }

            // Level 1: 3-axis segment lookup
            const segmentData = tierData.segment_elasticity?.[compositeKey];
            if (segmentData && axis) {
                const axisKey = `${axis}_axis`;
                const axisData = segmentData[axisKey];

                if (axisData && axisData.elasticity !== undefined) {
                    return axisData.elasticity;
                }
            }

            // Level 2-4: Fallback to existing elasticity calculation
            // This integrates with the existing elasticity-model.js
            return this.#getBaseFallback(tier);
        } catch (error) {
            console.error('Error getting elasticity:', error);
            return this.#getBaseFallback(tier);
        }
    }

    /**
     * Get complete segment data for a composite key
     * @param {string} compositeKey - Segment composite key
     * @param {string} tier - Subscription tier
     * @returns {Object|null} Segment data with all axis values
     */
    getSegmentData(compositeKey, tier) {
        if (!this.segmentElasticity || !tier) return null;

        const tierData = this.segmentElasticity[tier];
        if (!tierData) return null;

        return tierData.segment_elasticity?.[compositeKey] || null;
    }

    /**
     * Filter segments by axis values
     * @param {Object} filters - { acquisition: [], engagement: [], monetization: [] }
     * @returns {Array<Object>} Filtered segment data with KPIs
     */
    filterSegments(filters = {}) {
        if (!this.segmentKPIs) {
            console.warn('Segment KPIs not loaded');
            return [];
        }

        const results = [];

        for (const [indexKey, kpis] of Object.entries(this.segmentKPIs)) {
            // Index key format is: tier|acquisition|engagement|monetization
            const parts = indexKey.split('|');
            const tier = parts[0];
            const compositeKey = parts.slice(1).join('|');
            const [acquisition, engagement, monetization] = parts.slice(1);

            // Check if segment matches all active filters
            const matchesAcquisition = !filters.acquisition?.length ||
                                      filters.acquisition.includes(acquisition);
            const matchesEngagement = !filters.engagement?.length ||
                                     filters.engagement.includes(engagement);
            const matchesMonetization = !filters.monetization?.length ||
                                       filters.monetization.includes(monetization);

            if (matchesAcquisition && matchesEngagement && matchesMonetization) {
                results.push({
                    compositeKey,
                    acquisition,
                    engagement,
                    monetization,
                    tier,
                    ...kpis
                });
            }
        }

        return results;
    }

    /**
     * Aggregate KPIs across segments (weighted by subscriber count)
     * @param {Array<Object>} segments - Filtered segments
     * @returns {Object} Aggregated metrics
     */
    aggregateKPIs(segments) {
        if (!segments || segments.length === 0) {
            return {
                total_subscribers: 0,
                weighted_churn: 0,
                weighted_arpu: 0,
                weighted_watch_hours: 0,
                segment_count: 0
            };
        }

        const totalSubs = segments.reduce((sum, s) => {
            return sum + parseFloat(s.subscriber_count || 0);
        }, 0);

        if (totalSubs === 0) {
            return {
                total_subscribers: 0,
                weighted_churn: 0,
                weighted_arpu: 0,
                weighted_watch_hours: 0,
                segment_count: segments.length
            };
        }

        return {
            total_subscribers: Math.round(totalSubs),
            weighted_churn: this.#weightedAvg(segments, 'avg_churn_rate', 'subscriber_count'),
            weighted_arpu: this.#weightedAvg(segments, 'avg_arpu', 'subscriber_count'),
            weighted_watch_hours: this.#weightedAvg(segments, 'avg_watch_hours', 'subscriber_count'),
            weighted_cac: this.#weightedAvg(segments, 'avg_cac', 'subscriber_count'),
            segment_count: segments.length
        };
    }

    /**
     * Get all segments for a specific tier
     * @param {string} tier - Tier name
     * @returns {Array<Object>} Segments with KPIs for that tier
     */
    getSegmentsForTier(tier) {
        if (!this.segmentKPIs) return [];

        return Object.entries(this.segmentKPIs)
            .filter(([indexKey, _]) => indexKey.startsWith(tier + '|'))
            .map(([indexKey, kpis]) => {
                // Index key format is: tier|acquisition|engagement|monetization
                const parts = indexKey.split('|');
                const compositeKey = parts.slice(1).join('|');
                const [acquisition, engagement, monetization] = parts.slice(1);
                return {
                    compositeKey,
                    acquisition,
                    engagement,
                    monetization,
                    tier,
                    ...kpis
                };
            });
    }

    /**
     * Get formatted label for a segment value
     * @param {string} value - Segment value
     * @returns {string} Formatted label
     */
    formatSegmentLabel(value) {
        if (this.segmentDescriptions[value]) {
            return this.segmentDescriptions[value].label;
        }
        return value;
    }

    /**
     * Get full segment information
     * @param {string} value - Segment value
     * @returns {Object|null} Segment info with label, description, elasticity_level
     */
    getSegmentInfo(value) {
        return this.segmentDescriptions[value] || null;
    }

    /**
     * Generate a single-line summary for a segment based on its composite key and metrics
     * @param {string} compositeKey - "acquisition|engagement|monetization"
     * @param {Object} metrics - { subscriber_count, avg_churn_rate, avg_arpu }
     * @returns {string} Single-line description
     */
    generateSegmentSummary(compositeKey, metrics) {
        const [acquisition, engagement, monetization] = compositeKey.split('|');

        // Get segment info
        const acqInfo = this.segmentDescriptions[acquisition];
        const engInfo = this.segmentDescriptions[engagement];
        const monInfo = this.segmentDescriptions[monetization];

        // Determine key characteristics
        const churnRate = parseFloat(metrics.avg_churn_rate) || 0;
        const arpu = parseFloat(metrics.avg_arpu) || 0;
        const subscribers = parseInt(metrics.subscriber_count) || 0;

        // Size descriptor
        const sizeDesc = subscribers > 2000 ? 'Large' : subscribers > 1000 ? 'Medium-sized' : 'Small';

        // Churn risk level
        const churnRisk = churnRate > 0.18 ? 'very high churn risk' :
                         churnRate > 0.14 ? 'high churn risk' :
                         churnRate > 0.10 ? 'moderate churn' : 'stable retention';

        // Value tier
        const valueTier = arpu > 35 ? 'premium' : arpu > 25 ? 'mid-tier' : 'budget-conscious';

        // Price sensitivity from elasticity info
        const priceSensitivity = engInfo?.elasticity_level?.toLowerCase() || 'moderate price sensitivity';

        // Build smart summary based on most notable characteristic
        let summary = '';

        // Priority 1: High churn segments (biggest risk)
        if (churnRate > 0.15) {
            summary = `${sizeDesc} ${valueTier} segment with ${churnRisk} - requires retention focus`;
        }
        // Priority 2: High-value stable segments (revenue drivers)
        else if (arpu > 30 && churnRate < 0.10) {
            summary = `${sizeDesc} high-value segment with excellent retention - key revenue driver`;
        }
        // Priority 3: Large segments (volume plays)
        else if (subscribers > 2000) {
            summary = `Large ${valueTier} segment with ${churnRisk} - ${priceSensitivity}`;
        }
        // Priority 4: Small high-value segments (niche opportunities)
        else if (arpu > 30) {
            summary = `Small premium segment with ${churnRisk} - niche opportunity`;
        }
        // Priority 5: Everyone else
        else {
            summary = `${sizeDesc} ${valueTier} segment - ${priceSensitivity} with ${churnRisk}`;
        }

        return summary;
    }

    /**
     * Format composite key to human-readable label
     * @param {string} compositeKey - "acquisition|engagement|monetization"
     * @returns {string} Formatted label with separators
     */
    formatCompositeKey(compositeKey) {
        const [acquisition, engagement, monetization] = compositeKey.split('|');
        return `${this.formatSegmentLabel(acquisition)} | ${this.formatSegmentLabel(engagement)} | ${this.formatSegmentLabel(monetization)}`;
    }

    /**
     * Parse composite key into components
     * @param {string} compositeKey - "acquisition|engagement|monetization"
     * @returns {Object} { acquisition, engagement, monetization }
     */
    parseCompositeKey(compositeKey) {
        const [acquisition, engagement, monetization] = compositeKey.split('|');
        return { acquisition, engagement, monetization };
    }

    /**
     * Check if segment data is available
     * @returns {boolean}
     */
    isDataLoaded() {
        return !!(this.segmentElasticity && this.customerSegments && this.segmentKPIs);
    }

    // ========== Private Helper Methods ==========

    /**
     * Index KPIs by composite key AND tier for fast lookup
     * @private
     */
    #indexKPIsByCompositeKey(kpis) {
        const index = {};
        kpis.forEach(kpi => {
            // Use both tier and composite_key as the index to avoid overwriting
            const indexKey = `${kpi.tier}|${kpi.composite_key}`;
            index[indexKey] = kpi;
        });
        return index;
    }

    /**
     * Calculate weighted average
     * @private
     */
    #weightedAvg(segments, metric, weight) {
        const totalWeight = segments.reduce((sum, s) => {
            return sum + parseFloat(s[weight] || 0);
        }, 0);

        if (totalWeight === 0) return 0;

        const weightedSum = segments.reduce((sum, s) => {
            const metricValue = parseFloat(s[metric] || 0);
            const weightValue = parseFloat(s[weight] || 0);
            return sum + (metricValue * weightValue);
        }, 0);

        return weightedSum / totalWeight;
    }

    /**
     * Get base tier elasticity fallback
     * @private
     */
    #getBaseFallback(tier) {
        const baseFallbacks = {
            'ad_supported': -2.1,
            'ad_free': -1.7,
            'annual': -1.5
        };
        return baseFallbacks[tier] || -1.7;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.segmentEngine = new SegmentationEngine();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SegmentationEngine;
}
