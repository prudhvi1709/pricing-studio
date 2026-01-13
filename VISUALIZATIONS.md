# Discovery+ Price Elasticity POC - Required Visualizations

**Date:** January 13, 2026
**Status:** Implementation Planning

---

## Current Implementation (Phase 1 - COMPLETED)

### ✅ Overview Dashboard (index.html)
1. **KPI Summary Cards** - Current state metrics
   - Total Subscribers, Monthly Revenue, ARPU, Churn Rate
   - Status: ✅ Implemented

2. **Elasticity Overview by Tier** - Badge display
   - Ad-Supported (-2.1), Ad-Free (-1.7), Annual (-1.5)
   - Status: ✅ Implemented

3. **12-Month Time Series Forecast with Confidence Intervals** - Chart.js line chart
   - Baseline vs Forecasted subscribers over 12 months
   - ±10% confidence intervals (upper/lower bounds)
   - Status: ✅ Implemented

4. **Simulation Results Cards** - Forecasted KPIs
   - Subscribers, Revenue, ARPU, Churn with deltas
   - Status: ✅ Implemented

5. **Warnings Panel** - Constraint violations
   - Alert box with risk warnings
   - Status: ✅ Implemented

### ✅ Elasticity Analysis (charts.js)
6. **Demand Curve by Tier** - D3.js multi-line chart
   - 3 lines for each tier with current price markers
   - Aligned legend at top-right
   - Status: ✅ Implemented

7. **Elasticity Heatmap by Segment** - D3.js heatmap
   - Segment × Tier matrix with color gradient
   - Interactive tooltips
   - Status: ✅ Implemented

### ✅ Scenario Results (charts.js)
8. **Tier Mix Shift Chart** - D3.js stacked bar chart
   - Before/After comparison
   - Side-by-side with Trade-offs chart
   - Status: ✅ Implemented

9. **Trade-offs Scatter Plot** - D3.js scatter with quadrants
   - Revenue vs Subscriber Growth
   - Color by churn risk
   - Status: ✅ Implemented

### ✅ Scenario Comparison (charts.js)
10. **Grouped Bar Chart** - Multi-scenario KPI comparison
    - Compare 2+ scenarios
    - % change from baseline
    - Status: ✅ Implemented

11. **Radar Chart** - Multi-dimensional trade-offs
    - 5 dimensions (Revenue, Growth, ARPU, Churn, CLTV)
    - Overlaid polygons for each scenario
    - Status: ✅ Implemented

### ✅ Data Timeline Badge
12. **Data Timeline Info** - Alert badge on main page
    - 3 years (Jan 2022 - Dec 2024), 156 weeks
    - Status: ✅ Implemented

---

## Summary Statistics

**Total Visualizations Implemented:** 12 ✅
- Core Dashboard: 5
- Elasticity Analysis: 2
- Scenario Results: 2
- Scenario Comparison: 2
- Data Timeline: 1

**Phase 1 POC:** ✅ COMPLETE

---

## Required Visualizations (Phase 2 - TO IMPLEMENT)

### 📊 Elasticity Analysis Visualizations

6. **Demand Curve by Tier** (D3.js)
   - Type: Multi-line chart
   - X-axis: Price ($)
   - Y-axis: Quantity Demanded (subscribers)
   - Features:
     - 3 lines for each tier (Ad-supported, Ad-free, Annual)
     - Interactive hover showing elasticity at each price point
     - Current price marker
   - Data Source: elasticity-params.json + demand calculation
   - Status: ❌ Not Implemented

7. **Elasticity Heatmap by Segment** (D3.js)
   - Type: Heatmap
   - Rows: Customer segments (Tenure: 0-3mo, 3-12mo, 12+mo)
   - Columns: Tiers (Ad-supported, Ad-free, Annual)
   - Color: Elasticity magnitude (gradient from -3.0 to -1.0)
   - Features: Tooltips with exact values + confidence intervals
   - Data Source: elasticity-params.json (segments data)
   - Status: ❌ Not Implemented

8. **Price Sensitivity Distribution / WTP** (D3.js)
   - Type: Histogram / Density plot
   - X-axis: Price points ($)
   - Y-axis: Number of subscribers / Probability density
   - Features:
     - Distribution curves for each tier
     - Current price markers
     - Overlay of actual vs willingness-to-pay
   - Data Source: elasticity-params.json (willingness_to_pay)
   - Status: ❌ Not Implemented

9. **Elasticity Summary Table**
   - Type: Data table with sorting/filtering
   - Columns: Tier, Current Price, Elasticity (±CI), Segments, Interpretation
   - Features:
     - Color coding (highly elastic = red, less elastic = green)
     - Expandable rows for segment details
   - Data Source: elasticity-params.json
   - Status: ❌ Not Implemented

---

### 📈 Enhanced Scenario Simulation Visualizations

10. **Time Series Forecast with Confidence Intervals** (D3.js)
    - Type: Line chart with shaded bands
    - Enhancement to existing Chart.js chart
    - Features:
      - Baseline line (dashed)
      - Forecasted line (solid)
      - Upper/lower confidence interval bands (shaded area)
      - Toggleable metrics: Subscribers, Revenue, Churn Rate
    - Data Source: scenario-engine.js (add confidence calculation)
    - Status: ⚠️ Partially implemented (no confidence bands)

11. **Tier Mix Shift Chart** (D3.js)
    - Type: Grouped/Stacked bar chart
    - Bars: Before (Baseline) vs After (Scenario)
    - Segments: Ad-supported, Ad-free, Annual
    - Features:
      - Show absolute numbers and percentages
      - Arrows showing migration direction
    - Data Source: scenario-engine.js (add tier migration)
    - Status: ❌ Not Implemented

12. **Trade-offs Scatter Plot** (D3.js)
    - Type: Scatter plot with quadrants
    - X-axis: Revenue Change (%)
    - Y-axis: Subscriber Growth (%)
    - Points: Each saved scenario + current scenario
    - Features:
      - Quadrant labels (High Rev/Low Growth, etc.)
      - Point size = ARPU impact
      - Color = Churn risk level
      - Hover for scenario details
    - Data Source: Multiple simulation results
    - Status: ❌ Not Implemented

---

### 🔄 Scenario Comparison Visualizations

13. **Comparison Table** (Multi-scenario)
    - Type: Data table
    - Rows: KPIs (Subscribers, Net Adds, Churn, Revenue, ARPU, CLTV)
    - Columns: Baseline + Selected scenarios (2-4)
    - Features:
      - Color coding (green ▲, red ▼, gray ─)
      - Sort by any KPI
      - Export to CSV
    - Data Source: Multiple scenario simulations
    - Status: ❌ Not Implemented

14. **Grouped Bar Chart - KPI Comparison** (D3.js)
    - Type: Grouped bar chart
    - X-axis: KPIs
    - Y-axis: % Change from Baseline
    - Groups: Different scenarios
    - Features:
      - Legend for scenarios
      - Hover for exact values
      - Zero baseline line
    - Data Source: Multiple scenario simulations
    - Status: ❌ Not Implemented

15. **Radar Chart - Multi-dimensional Trade-offs** (D3.js)
    - Type: Radar/Spider chart
    - Dimensions: Revenue Growth, Subscriber Growth, Low Churn, High ARPU, CLTV
    - Polygons: One for each scenario (overlaid)
    - Features:
      - Normalized scales (0-100)
      - Interactive legend
      - Area shading for each scenario
    - Data Source: Multiple scenario simulations
    - Status: ❌ Not Implemented

16. **Time Series Overlay - Multi-scenario** (D3.js)
    - Type: Multi-line chart
    - X-axis: Time (months)
    - Y-axis: Metric (toggleable: Revenue, Subscribers, Churn)
    - Lines: Baseline + each selected scenario
    - Features:
      - Interactive legend to show/hide scenarios
      - Different line styles/colors
      - Hover crosshair
    - Data Source: Time series from multiple scenarios
    - Status: ❌ Not Implemented

---

### 👥 Segment Insights Visualizations

17. **Elasticity by Segment** (D3.js)
    - Type: Horizontal bar chart
    - Bars: Different segments (tenure × tier combinations)
    - X-axis: Elasticity (-3.0 to 0)
    - Features:
      - Color gradient by elasticity magnitude
      - Sort by elasticity
      - Filter by tier/tenure
    - Data Source: elasticity-params.json (segments)
    - Status: ❌ Not Implemented

18. **Churn Risk by Segment** (D3.js)
    - Type: Bubble chart
    - X-axis: Price Sensitivity (Elasticity)
    - Y-axis: Churn Risk (%)
    - Bubble size: Segment size (subscriber count)
    - Bubble color: Segment type (tenure/tier)
    - Features:
      - Hover for segment details
      - Quadrant lines (high/low risk)
    - Data Source: weekly_aggregated.csv + elasticity-params.json
    - Status: ❌ Not Implemented

19. **LTV by Segment** (D3.js)
    - Type: Treemap or Grouped bar chart
    - Rectangles/Bars: Segments
    - Size/Height: Average LTV
    - Color: Tier
    - Features:
      - Hover for LTV breakdown
      - Zoom/drill-down by dimension
    - Data Source: Calculated from ARPU × avg lifetime
    - Status: ❌ Not Implemented

20. **Tier Mix by Segment Over Time** (D3.js)
    - Type: Stacked area chart
    - X-axis: Time (weeks/months)
    - Y-axis: Subscriber count
    - Areas: Different tiers (stacked)
    - Features:
      - Filter by segment (tenure, platform)
      - Toggle between absolute/percentage view
    - Data Source: weekly_aggregated.csv
    - Status: ❌ Not Implemented

---

## Implementation Priority

### Phase 2A - Core Analytics (Next)
1. ✅ Demand Curve by Tier (Critical for elasticity understanding)
2. ✅ Elasticity Heatmap (Critical for segment analysis)
3. ✅ Tier Mix Shift Chart (Critical for scenario impact)
4. ✅ Trade-offs Scatter Plot (Critical for decision-making)

### Phase 2B - Comparison Features
5. ✅ Comparison Table (Multi-scenario)
6. ✅ Grouped Bar Chart for KPI Comparison
7. ✅ Time Series Overlay (Multi-scenario)
8. ✅ Confidence Intervals on Forecast

### Phase 2C - Advanced Analytics
9. ✅ Radar Chart (Multi-dimensional)
10. ✅ Price Sensitivity Distribution
11. ✅ Elasticity Summary Table

### Phase 2D - Segment Insights
12. ✅ Elasticity by Segment
13. ✅ Churn Risk by Segment
14. ✅ LTV by Segment
15. ✅ Tier Mix Over Time

---

## Technical Approach

### Library Choice: D3.js v7
- **Why D3.js?** Full control, customization, interactivity
- **Alternative:** Chart.js (simpler but less flexible)
- **Decision:** Use D3.js for new charts, keep Chart.js for simple time series

### Chart Module Architecture
```javascript
// js/charts.js
export function renderDemandCurve(container, data, options)
export function renderElasticityHeatmap(container, data, options)
export function renderTierMixShift(container, data, options)
export function renderTradeoffsScatter(container, data, options)
export function renderRadarChart(container, data, options)
export function renderComparisonTable(container, data, options)
// ... more chart functions
```

### Data-Driven Rendering Principles
1. **All charts accept data as parameter** - No hardcoded values
2. **Configuration objects for customization** - Colors, dimensions, scales
3. **Responsive design** - Charts adapt to container size
4. **Reusable components** - Modular axis, legends, tooltips
5. **Update patterns** - Support data updates without full re-render

---

## Summary

**Total Visualizations Required:** 20
- **Implemented (Phase 1):** 5 ✅
- **To Implement (Phase 2):** 15 ❌

**Next Steps:**
1. Create `js/charts.js` module with D3.js components
2. Implement Phase 2A visualizations (4 critical charts)
3. Update `index.html` to integrate new visualizations
4. Add scenario comparison functionality
5. Implement segment insights page
