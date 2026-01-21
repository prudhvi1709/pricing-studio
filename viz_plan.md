# Visualization Enhancement Plan for Price Elasticity POC

**Date:** January 21, 2026
**Project:** Discovery+ Price Elasticity & Revenue Optimization POC
**Purpose:** Strategic plan for adding high-value visualizations based on gap analysis

---

## Executive Summary

This plan identifies **12 high-priority visualization enhancements** across 4 categories (Acquisition, Churn, Migration, Cross-Model) that will significantly improve the POC's analytical depth and decision-making capabilities. Each recommendation is backed by analysis of reference visualizations and current POC gaps.

**Key Findings:**

- Current POC has **15 visualization types** across 10 sections
- Reference library contains **32 advanced visualizations** with proven analytical value
- **Identified gaps:** Confidence intervals, survival curves, revenue waterfalls, feature importance, intervention matrices
- **Priority:** Focus on actionable insights, statistical rigor, and executive-friendly formats

---

## Methodology

### Analysis Framework

1. **Reference Analysis:** Examined 32 visualization files from `/home/prudhvi/Downloads/vizualizations_on_synthetic_data`
   - Acquisition: 8 visualizations
   - Churn: 8 visualizations
   - Tier Migration: 8 visualizations
   - TVOD: 8 visualizations

2. **Current State Audit:** Analyzed existing POC (`/home/prudhvi/Desktop/wbd`)
   - 15 distinct visualization types
   - 30+ individual charts and interactive components
   - Strong coverage: Demand curves, elasticity heatmaps, scatter plots, radar charts

3. **Gap Identification:** Mapped reference visualizations to POC, identified missing high-value elements

4. **Prioritization Criteria:**
   - **Business Value:** Does it inform pricing decisions?
   - **Analytical Rigor:** Does it add statistical confidence or validation?
   - **User Experience:** Is it intuitive for both technical and non-technical users?
   - **Implementation Feasibility:** Can it be built with existing data and tech stack?
   - **Complementarity:** Does it fill a gap in the current POC?

---

## Current POC Strengths (What We Have)

### ✅ Well-Covered Areas

1. **Demand Modeling**
   - Interactive demand curves with baseline vs. scenario toggle
   - Multi-tier demand visualization with elasticity coefficients

2. **Segment Analysis**
   - 3-axis radial visualization (375 segments)
   - Segment elasticity heatmaps
   - Scatter plots with bubble encoding (ARPU, churn)

3. **Scenario Comparison**
   - Trade-offs scatter plot (revenue vs. growth)
   - Multi-dimensional radar charts
   - Grouped bar charts for KPI comparison

4. **Time-Based Analysis**
   - Event calendar timeline with interactive markers
   - Validation windows for clean/confounded periods
   - Promo campaign performance cards

5. **KPI Dashboards**
   - Summary cards with trend indicators
   - Segment KPI dashboards with weighted metrics
   - Tier mix shift visualizations

---

## Gap Analysis: What's Missing

### 🔴 Critical Gaps

| **Reference Visualization**                 | **Business Value**                          | **Currently in POC?** | **Priority** |
| ------------------------------------------- | ------------------------------------------- | --------------------- | ------------ |
| Confidence Intervals (Acquisition)          | Statistical rigor, forecast reliability     | ❌ No                 | **HIGH**     |
| Revenue Waterfall (Acquisition)             | Executive summary, clear ROI story          | ❌ No                 | **HIGH**     |
| Feature Importance (Churn)                  | Model explainability, driver identification | ❌ No                 | **HIGH**     |
| Survival Curves (Churn)                     | Retention forecasting, churn timing         | ❌ No                 | **HIGH**     |
| Revenue at Risk (Churn)                     | Dollar-based risk quantification            | ❌ No                 | **HIGH**     |
| Intervention Matrix (Churn)                 | Actionable segment prioritization           | ❌ No                 | **HIGH**     |
| Transition Probability Matrix (Migration)   | Precise tier flow probabilities             | ⚠️ Partial            | **MEDIUM**   |
| Migration Flow Diagram (Sankey) (Migration) | Visual tier movement storytelling           | ❌ No                 | **MEDIUM**   |
| Cross-Elasticity Heatmap (TVOD)             | TVOD/SVOD cannibalization insights          | ❌ No                 | **LOW**      |
| Total Revenue Optimization (TVOD)           | Dual-model strategy                         | ❌ No                 | **LOW**      |

### 🟡 Enhancement Opportunities

| **Current Visualization**      | **Enhancement Opportunity**                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| Cohort-Level Acquisition Table | Add lift calculations at multiple price points (P-10%, P-5%, P+5%, P+10%) |
| Churn Uplift Heatmap           | Add color-coded intensity and trend arrows                                |
| Tier Mix Shift Chart           | Add Sankey flow diagram for visual storytelling                           |
| Scenario Comparison Table      | Add revenue waterfall view                                                |
| Demand Curve                   | Add confidence bands (95% CI)                                             |
| Trade-offs Scatter Plot        | Add Pareto frontier line to identify efficient scenarios                  |

---

## Recommended Visualizations (Prioritized)

### **PRIORITY 1: MUST-HAVE (Implement First)**

---

#### **1.1 Confidence Intervals for Acquisition Forecasts**

**Location:** Section 3 - Acquisition Elasticity tab
**Visualization Type:** Line chart with shaded confidence bands
**Technology:** D3.js (extend existing demand curve)

**What It Shows:**

- Forecasted subscriber adds (central estimate)
- 95% confidence interval (shaded band)
- Upper/lower bounds at different price points

**Business Value:**

- Provides statistical rigor to forecasts
- Helps stakeholders understand forecast uncertainty
- Critical for board-level presentations ("What's the range of outcomes?")

**Data Requirements:**

- Use standard errors from elasticity parameters
- Bootstrap or analytical CI calculation
- Elasticity variance from `elasticity-params.json` (add `std_error` field)

**Implementation:**

```javascript
// Add to charts.js
function renderAcquisitionConfidenceIntervals(scenario) {
  // Calculate point estimate
  const pointEstimate = calculateAdds(scenario.price);

  // Calculate CI bounds using elasticity std_error
  const stdError = 0.15; // 15% error band (industry standard)
  const upperBound = pointEstimate * (1 + 1.96 * stdError);
  const lowerBound = pointEstimate * (1 - 1.96 * stdError);

  // Render shaded area between upper/lower bounds
  svg
    .append("path")
    .attr(
      "d",
      area()
        .x((d) => xScale(d.price))
        .y0((d) => yScale(d.lowerBound))
        .y1((d) => yScale(d.upperBound)),
    )
    .attr("fill", "rgba(75, 192, 192, 0.2)");
}
```

**UI Placement:**

- Add toggle button: "Show Confidence Intervals" (default: on)
- Display in existing demand curve chart
- Add tooltip: "95% CI: [lower, upper] adds"

**Visual Design:**

- Shaded band: Semi-transparent blue (opacity: 0.2)
- Central line: Bold primary color
- Tooltip format: "95% confidence: 450-650 new subs"

---

#### **1.2 Revenue Waterfall Chart (Scenario ROI Story)**

**Location:** Section 3-5 - All elasticity model tabs
**Visualization Type:** Waterfall chart
**Technology:** Chart.js with custom waterfall plugin

**What It Shows:**

- Starting point: Baseline revenue
- Positive bars: Revenue gains from volume lift, ARPU increase
- Negative bars: Revenue losses from churn, downgrade
- Ending point: Net forecasted revenue
- Bridge from baseline to scenario outcome

**Business Value:**

- Executive-friendly format (CFO will love this)
- Clear ROI storytelling: "Here's where the $X comes from"
- Identifies which levers drive revenue impact
- Answers: "Why is this scenario +$500K?"

**Data Requirements:**

- Baseline revenue: Current state
- Components:
  - `+Volume Effect`: New adds × ARPU
  - `+ARPU Effect`: Price increase × existing subs
  - `-Churn Effect`: Churned subs × ARPU
  - `-Downgrade Effect`: Downgraders × ARPU difference
  - `=Net Revenue`: Sum of all components

**Implementation:**

```javascript
// Add to charts.js
function renderRevenueWaterfall(scenarioResult) {
  const components = [
    { label: "Baseline", value: scenarioResult.baseline_revenue },
    {
      label: "Volume Lift",
      value: scenarioResult.volume_effect,
      isIncrement: true,
    },
    {
      label: "ARPU Increase",
      value: scenarioResult.arpu_effect,
      isIncrement: true,
    },
    {
      label: "Churn Loss",
      value: -scenarioResult.churn_effect,
      isIncrement: true,
    },
    {
      label: "Downgrade Loss",
      value: -scenarioResult.downgrade_effect,
      isIncrement: true,
    },
    { label: "Net Revenue", value: scenarioResult.net_revenue, isTotal: true },
  ];

  // Calculate cumulative positions
  let cumulative = components[0].value;
  const data = components.map((c, i) => {
    if (i === 0) return { ...c, start: 0, end: c.value };
    if (c.isTotal) return { ...c, start: 0, end: c.value };

    const start = cumulative;
    cumulative += c.value;
    return { ...c, start, end: cumulative };
  });

  // Render with Chart.js floating bars
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => [d.start, d.end]),
          backgroundColor: data.map((d) =>
            d.isTotal ? "#007bff" : d.value > 0 ? "#28a745" : "#dc3545",
          ),
        },
      ],
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: "Revenue ($)" },
        },
      },
    },
  });
}
```

**UI Placement:**

- Add as new tab in scenario results: "Revenue Breakdown"
- Or add as expandable section below scenario KPI cards
- Button: "Show Revenue Waterfall" (icon: 📊)

**Visual Design:**

- Green bars: Positive contributions
- Red bars: Negative contributions
- Blue bars: Baseline and Net (total bars)
- Connector lines between bars (subtle gray)
- Data labels on each bar: "$X" (formatted currency)

---

#### **1.3 Feature Importance for Churn Prediction**

**Location:** Section 4 - Churn Elasticity tab
**Visualization Type:** Horizontal bar chart (sorted by importance)
**Technology:** Chart.js

**What It Shows:**

- Top 10 features driving churn predictions
- Importance score (0-100 scale, relative contribution)
- Direction indicator: ↑ increases churn risk, ↓ decreases churn risk

**Business Value:**

- Model explainability: "Why did the model predict high churn?"
- Identifies actionable levers (price change, tenure, engagement)
- Builds stakeholder trust in predictions
- Informs intervention strategy

**Data Requirements:**

- Feature importance coefficients from churn model
- Key features:
  - Price change % (expected: high importance)
  - Tenure months (expected: high importance, negative direction)
  - Engagement score (expected: medium importance, negative direction)
  - Promo eligibility (expected: medium importance)
  - Time since last watch (expected: high importance)
  - Tier (expected: medium importance)

**Implementation:**

```javascript
// Add to charts.js
function renderFeatureImportance() {
  const features = [
    { name: "Price Change %", importance: 85, direction: "increase" },
    { name: "Tenure (months)", importance: 72, direction: "decrease" },
    { name: "Days Since Last Watch", importance: 68, direction: "increase" },
    { name: "Engagement Score", importance: 55, direction: "decrease" },
    { name: "Promo Expiration", importance: 48, direction: "increase" },
    { name: "Tier (Ad-Supported)", importance: 35, direction: "increase" },
    { name: "Device Count", importance: 28, direction: "decrease" },
    { name: "Content Affinity", importance: 22, direction: "decrease" },
    { name: "Payment Failures", importance: 18, direction: "increase" },
    {
      name: "Customer Service Contacts",
      importance: 12,
      direction: "increase",
    },
  ];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: features.map((f) => f.name),
      datasets: [
        {
          label: "Importance Score",
          data: features.map((f) => f.importance),
          backgroundColor: features.map((f) =>
            f.direction === "increase" ? "#dc3545" : "#28a745",
          ),
        },
      ],
    },
    options: {
      indexAxis: "y", // Horizontal bars
      scales: {
        x: {
          title: { display: true, text: "Relative Importance (0-100)" },
          max: 100,
        },
      },
    },
  });
}
```

**UI Placement:**

- Add as new card in Churn Elasticity tab
- Title: "Churn Risk Drivers (Feature Importance)"
- Position: Below scenario cards, above cohort heatmap

**Visual Design:**

- Red bars: Features that increase churn risk
- Green bars: Features that decrease churn risk
- Sorted by importance (highest to lowest)
- Data labels: Importance score (no decimals)
- Legend: ↑ Increases Risk, ↓ Decreases Risk

---

#### **1.4 Customer Survival Curves (Retention Forecasting)**

**Location:** Section 4 - Churn Elasticity tab
**Visualization Type:** Multi-line chart (Kaplan-Meier style)
**Technology:** D3.js

**What It Shows:**

- X-axis: Time (weeks after price change)
- Y-axis: Retention rate (0-100%)
- Multiple curves: Baseline vs. Scenario(s)
- Shaded area: Difference between baseline and scenario
- Markers: Key milestones (30-day, 60-day, 90-day retention)

**Business Value:**

- Forecasts retention over time horizons
- Answers: "What % of customers stay after 12 weeks?"
- Visualizes churn lag effect (peak at 8-12 weeks)
- Critical for LTV calculations

**Data Requirements:**

- Baseline retention curve (current state)
- Scenario retention curve (with price change)
- Time points: 0, 4, 8, 12, 16, 20, 24 weeks
- Retention formula: `retention_t = retention_t-1 × (1 - churn_rate_t)`

**Implementation:**

```javascript
// Add to charts.js
function renderSurvivalCurves(scenarioResult) {
  // Calculate baseline survival curve
  const baselineChurnByWeek = [0.01, 0.01, 0.015, 0.02, 0.015, 0.01]; // Per 4-week period
  let baselineRetention = 1.0;
  const baselineCurve = [{ week: 0, retention: 1.0 }];

  for (let i = 0; i < 6; i++) {
    baselineRetention *= 1 - baselineChurnByWeek[i];
    baselineCurve.push({ week: (i + 1) * 4, retention: baselineRetention });
  }

  // Calculate scenario survival curve (with churn uplift)
  const scenarioChurnByWeek = [
    0.01,
    0.012,
    0.025,
    0.035,
    0.02,
    0.012, // Higher in weeks 8-12
  ];
  let scenarioRetention = 1.0;
  const scenarioCurve = [{ week: 0, retention: 1.0 }];

  for (let i = 0; i < 6; i++) {
    scenarioRetention *= 1 - scenarioChurnByWeek[i];
    scenarioCurve.push({ week: (i + 1) * 4, retention: scenarioRetention });
  }

  // Render with D3.js
  const line = d3
    .line()
    .x((d) => xScale(d.week))
    .y((d) => yScale(d.retention));

  svg
    .append("path")
    .datum(baselineCurve)
    .attr("d", line)
    .attr("stroke", "#007bff")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  svg
    .append("path")
    .datum(scenarioCurve)
    .attr("d", line)
    .attr("stroke", "#dc3545")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  // Add shaded area for difference
  const area = d3
    .area()
    .x((d) => xScale(d.week))
    .y0((d, i) => yScale(scenarioCurve[i].retention))
    .y1((d, i) => yScale(baselineCurve[i].retention));

  svg
    .append("path")
    .datum(baselineCurve)
    .attr("d", area)
    .attr("fill", "rgba(220, 53, 69, 0.1)");
}
```

**UI Placement:**

- Add as new card in Churn Elasticity tab
- Title: "Retention Forecast (Survival Curves)"
- Position: Below churn heatmap, above deep dive button

**Visual Design:**

- Blue line: Baseline retention
- Red line: Scenario retention
- Shaded area: Retention loss (light red)
- Milestone markers: Vertical dashed lines at 4, 8, 12, 16 weeks
- Y-axis: 0-100% (retention percentage)
- X-axis: 0-24 weeks
- Legend: "Baseline | Scenario | Δ Loss"

---

#### **1.5 Revenue at Risk (Dollar-Based Churn Quantification)**

**Location:** Section 4 - Churn Elasticity tab
**Visualization Type:** Stacked bar chart + KPI cards
**Technology:** Chart.js

**What It Shows:**

- Total revenue at risk by segment (stacked bars)
- Priority segmentation:
  - 🔴 Critical: >$50K at risk, >30% churn
  - 🟡 High: $20-50K at risk, 20-30% churn
  - 🟢 Low: <$20K at risk, <20% churn
- Top 5 at-risk segments with mitigation recommendations

**Business Value:**

- Translates churn % into dollar impact (CFO language)
- Prioritizes retention efforts by revenue impact
- Answers: "Which segments should we focus on first?"
- Informs intervention budget allocation

**Data Requirements:**

- Segment-level data:
  - Active subscribers
  - ARPU
  - Forecasted churn rate (baseline vs. scenario)
- Calculation: `revenue_at_risk = active_subs × ARPU × (scenario_churn - baseline_churn) × 12 months`

**Implementation:**

```javascript
// Add to scenario-engine.js
function calculateRevenueAtRisk(scenarioResult) {
  const segments = scenarioResult.segment_breakdown;

  return segments.map(seg => {
    const baselineChurn = seg.baseline_churn_rate;
    const scenarioChurn = seg.forecasted_churn_rate;
    const churnDelta = scenarioChurn - baselineChurn;
    const annualRevAtRisk = seg.active_subs × seg.arpu × churnDelta × 12;

    // Priority classification
    let priority = 'low';
    if (annualRevAtRisk > 50000 && scenarioChurn > 0.30) priority = 'critical';
    else if (annualRevAtRisk > 20000 && scenarioChurn > 0.20) priority = 'high';

    return {
      segment_name: seg.name,
      active_subs: seg.active_subs,
      arpu: seg.arpu,
      churn_delta_pct: (churnDelta * 100).toFixed(1),
      revenue_at_risk: annualRevAtRisk,
      priority: priority
    };
  }).sort((a, b) => b.revenue_at_risk - a.revenue_at_risk);
}

// Add to charts.js
function renderRevenueAtRisk(revenueAtRiskData) {
  const topSegments = revenueAtRiskData.slice(0, 5);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topSegments.map(s => s.segment_name),
      datasets: [{
        label: 'Annual Revenue at Risk',
        data: topSegments.map(s => s.revenue_at_risk),
        backgroundColor: topSegments.map(s =>
          s.priority === 'critical' ? '#dc3545' :
          s.priority === 'high' ? '#ffc107' : '#28a745'
        )
      }]
    },
    options: {
      scales: {
        y: {
          title: { display: true, text: 'Annual Revenue at Risk ($)' },
          ticks: { callback: value => '$' + (value / 1000).toFixed(0) + 'K' }
        }
      }
    }
  });
}
```

**UI Placement:**

- Add as new card in Churn Elasticity tab
- Title: "Revenue at Risk by Segment"
- Position: Between feature importance and survival curves

**Visual Design:**

- Red bars: Critical priority (>$50K, >30% churn)
- Yellow bars: High priority ($20-50K, 20-30% churn)
- Green bars: Low priority (<$20K, <20% churn)
- Data labels: "$XK" on each bar
- Subtitle: "Top 5 At-Risk Segments (Annual)"
- KPI cards above chart:
  - Total Revenue at Risk: Sum across all segments
  - Critical Segments: Count of red priority
  - Avg Churn Uplift: Average churn delta across segments

---

#### **1.6 Churn Intervention Matrix (Actionable Prioritization)**

**Location:** Section 4 - Churn Elasticity tab
**Visualization Type:** 2x2 matrix (Eisenhower-style)
**Technology:** D3.js scatter plot with quadrants

**What It Shows:**

- X-axis: Revenue at Risk ($ impact)
- Y-axis: Intervention Effectiveness (estimated churn reduction %)
- Quadrant labels:
  - **Q1 (Top Right):** High Impact + High Effectiveness → **ACT NOW**
  - **Q2 (Top Left):** Low Impact + High Effectiveness → **Quick Wins**
  - **Q3 (Bottom Left):** Low Impact + Low Effectiveness → **Ignore**
  - **Q4 (Bottom Right):** High Impact + Low Effectiveness → **Strategic Effort**
- Bubble size: Segment size (subscriber count)
- Bubble color: Churn rate (green = low, red = high)

**Business Value:**

- Prioritizes retention interventions by ROI potential
- Guides resource allocation ("Where should we spend retention budget?")
- Identifies "Act Now" segments for immediate action
- Balances impact vs. effort

**Data Requirements:**

- Segment-level:
  - Revenue at risk (from 1.5 above)
  - Intervention effectiveness estimate
  - Segment size
  - Churn rate
- Intervention effectiveness heuristic:
  - High tenure + low price sensitivity = high effectiveness (easy to retain)
  - Low tenure + high price sensitivity = low effectiveness (hard to retain)

**Implementation:**

```javascript
// Add to charts.js
function renderInterventionMatrix(segments) {
  // Calculate intervention effectiveness score (0-100)
  const segmentsWithScores = segments.map((seg) => {
    // Heuristic: High tenure + low elasticity = easier to retain
    const tenureFactor = Math.min(seg.avg_tenure_months / 24, 1); // Cap at 24mo
    const elasticityFactor = Math.min(Math.abs(seg.elasticity) / 3, 1); // Cap at -3.0
    const effectiveness =
      (tenureFactor * 0.6 + (1 - elasticityFactor) * 0.4) * 100;

    return { ...seg, intervention_effectiveness: effectiveness };
  });

  // Render as scatter plot with quadrants
  const svg = d3
    .select("#intervention-matrix-chart")
    .append("svg")
    .attr("width", 700)
    .attr("height", 500);

  // Add quadrant lines
  svg
    .append("line")
    .attr("x1", 350)
    .attr("x2", 350)
    .attr("y1", 0)
    .attr("y2", 500)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  svg
    .append("line")
    .attr("x1", 0)
    .attr("x2", 700)
    .attr("y1", 250)
    .attr("y2", 250)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Add quadrant labels
  const quadrantLabels = [
    { x: 525, y: 100, text: "ACT NOW", color: "#dc3545" },
    { x: 175, y: 100, text: "Quick Wins", color: "#28a745" },
    { x: 175, y: 400, text: "Ignore", color: "#6c757d" },
    { x: 525, y: 400, text: "Strategic Effort", color: "#ffc107" },
  ];

  quadrantLabels.forEach((label) => {
    svg
      .append("text")
      .attr("x", label.x)
      .attr("y", label.y)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", label.color)
      .text(label.text);
  });

  // Add bubbles
  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(segmentsWithScores, (d) => d.revenue_at_risk)])
    .range([50, 650]);

  const yScale = d3.scaleLinear().domain([0, 100]).range([450, 50]);

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(segmentsWithScores, (d) => d.active_subs)])
    .range([5, 30]);

  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.5, 0]); // Reverse: high churn = red

  svg
    .selectAll("circle")
    .data(segmentsWithScores)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.revenue_at_risk))
    .attr("cy", (d) => yScale(d.intervention_effectiveness))
    .attr("r", (d) => radiusScale(d.active_subs))
    .attr("fill", (d) => colorScale(d.forecasted_churn_rate))
    .attr("opacity", 0.7)
    .attr("stroke", "#333")
    .attr("stroke-width", 1);
}
```

**UI Placement:**

- Add as new card in Churn Elasticity tab
- Title: "Retention Intervention Matrix"
- Position: Bottom of Churn tab, before deep dive button

**Visual Design:**

- Quadrants: Light gray dividing lines (dashed)
- Q1 label: Red, bold
- Q2 label: Green, bold
- Q3 label: Gray, bold
- Q4 label: Yellow, bold
- Bubbles: Color by churn rate (red-yellow-green sequential)
- Bubble size: Subscriber count (sqrt scale)
- Axis labels: "Revenue at Risk (Annual $)" (X), "Intervention Effectiveness (%)" (Y)
- Legend: Color scale (churn rate), size scale (subs)

---

### **PRIORITY 2: HIGH-VALUE ENHANCEMENTS (Implement Next)**

---

#### **2.1 Enhanced Transition Probability Matrix (Sankey Flow Diagram)**

**Location:** Section 5 - Tier Migration tab
**Visualization Type:** Sankey diagram + detailed probability table
**Technology:** D3.js (d3-sankey plugin)

**What It Shows:**

- Left side: Current tier distribution (baseline)
- Right side: Forecasted tier distribution (after scenario)
- Flows: Customer migration paths between tiers
  - Stay in same tier (largest flow)
  - Upgrade flows (green)
  - Downgrade flows (red)
  - Churn flows (gray)
- Flow width: Proportional to subscriber volume
- Hover: Show exact migration numbers and percentages

**Business Value:**

- Visual storytelling for tier migration (executive-friendly)
- Quantifies all migration paths simultaneously
- Identifies unintended consequences (e.g., cannibalization)
- Complements existing tier mix shift chart

**Data Requirements:**

- Baseline tier distribution: { ad_supported: 30K, ad_free: 40K, annual: 25K }
- Transition probabilities from migration model:
  - Stay rates: 65%, 70%, 88%
  - Upgrade rates: 5%, 2%, 0%
  - Downgrade rates: 5%, 13%, 4%
  - Churn rates: 25%, 15%, 8%
- Scenario forecast: Apply transition matrix to baseline

**Implementation:**

```javascript
// Add to charts.js
async function renderTierMigrationSankey(scenarioResult) {
  // Define nodes
  const nodes = [
    // Left side (Baseline)
    { name: "Ad-Supported (Baseline)", id: "as_base" },
    { name: "Ad-Free (Baseline)", id: "af_base" },
    { name: "Annual (Baseline)", id: "annual_base" },
    // Right side (Scenario)
    { name: "Ad-Supported (Scenario)", id: "as_scenario" },
    { name: "Ad-Free (Scenario)", id: "af_scenario" },
    { name: "Annual (Scenario)", id: "annual_scenario" },
    { name: "Churned", id: "churned" },
  ];

  // Define flows (links)
  const links = [
    // From Ad-Supported
    { source: "as_base", target: "as_scenario", value: 19500, type: "stay" }, // 65% stay
    { source: "as_base", target: "af_scenario", value: 1500, type: "upgrade" }, // 5% upgrade
    { source: "as_base", target: "churned", value: 7500, type: "churn" }, // 25% churn
    {
      source: "as_base",
      target: "annual_scenario",
      value: 1500,
      type: "upgrade",
    }, // 5% upgrade

    // From Ad-Free
    { source: "af_base", target: "af_scenario", value: 28000, type: "stay" }, // 70% stay
    {
      source: "af_base",
      target: "annual_scenario",
      value: 800,
      type: "upgrade",
    }, // 2% upgrade
    {
      source: "af_base",
      target: "as_scenario",
      value: 5200,
      type: "downgrade",
    }, // 13% downgrade
    { source: "af_base", target: "churned", value: 6000, type: "churn" }, // 15% churn

    // From Annual
    {
      source: "annual_base",
      target: "annual_scenario",
      value: 22000,
      type: "stay",
    }, // 88% stay
    {
      source: "annual_base",
      target: "af_scenario",
      value: 1000,
      type: "downgrade",
    }, // 4% downgrade
    { source: "annual_base", target: "churned", value: 2000, type: "churn" }, // 8% churn
  ];

  // Render Sankey diagram
  const sankey = d3
    .sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([
      [50, 50],
      [650, 400],
    ]);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d })),
  });

  const svg = d3
    .select("#tier-migration-sankey")
    .append("svg")
    .attr("width", 700)
    .attr("height", 500);

  // Draw links (flows)
  svg
    .append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => {
      if (d.type === "stay") return "#007bff"; // Blue
      if (d.type === "upgrade") return "#28a745"; // Green
      if (d.type === "downgrade") return "#dc3545"; // Red
      return "#6c757d"; // Gray (churn)
    })
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .attr("fill", "none")
    .attr("opacity", 0.5);

  // Draw nodes
  svg
    .append("g")
    .selectAll("rect")
    .data(sankeyNodes)
    .enter()
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", "#333");

  // Add tooltips
  svg.selectAll("path").on("mouseover", function (event, d) {
    const pct = ((d.value / d.source.value) * 100).toFixed(1);
    showTooltip(
      `${d.source.name} → ${d.target.name}<br>${d.value.toLocaleString()} subs (${pct}%)`,
    );
  });
}
```

**UI Placement:**

- Replace or augment existing "Tier Transition Matrix" table
- Add toggle: "View as Table | View as Flow Diagram"
- Position: Center of Tier Migration tab

**Visual Design:**

- Blue flows: Stay in same tier
- Green flows: Upgrades
- Red flows: Downgrades
- Gray flows: Churn
- Flow width: Proportional to subscriber volume
- Node labels: Tier name + total subs
- Tooltip: "X → Y: Z subs (W%)"

---

#### **2.2 Cohort-Level Price Sensitivity Curves**

**Location:** Section 3 - Acquisition Elasticity tab
**Visualization Type:** Multi-line chart with facets
**Technology:** D3.js

**What It Shows:**

- X-axis: Price points ($3.99 to $9.99)
- Y-axis: Conversion rate or acquisition elasticity
- Multiple curves: One per cohort (7 cohorts)
- Highlight: Current price point and scenario price point
- Faceted view option: Small multiples for each cohort

**Business Value:**

- Shows non-linear price sensitivity (not just linear elasticity)
- Identifies "sweet spots" for each cohort
- Answers: "At what price does conversion fall off a cliff?"
- Supports tiered pricing strategy (different prices for different cohorts)

**Data Requirements:**

- Simulate acquisition at 10 price points: $3.99, $4.49, $4.99, $5.49, $5.99, $6.49, $6.99, $7.49, $7.99, $8.99, $9.99
- Use Poisson GLM with cohort-specific elasticities
- Normalize to 0-100 scale (conversion rate %)

**Implementation:**

```javascript
// Add to charts.js
function renderCohortPriceSensitivityCurves() {
  const cohorts = [
    { name: "Deal-Responsive", elasticity: -2.8, color: "#dc3545" },
    { name: "Promo-Churners", elasticity: -2.4, color: "#fd7e14" },
    { name: "Ad-Tier-Value", elasticity: -1.8, color: "#ffc107" },
    { name: "TVOD-First", elasticity: -1.2, color: "#20c997" },
    { name: "Content-Triggered", elasticity: -0.5, color: "#0dcaf0" },
    { name: "Habitual", elasticity: -0.3, color: "#0d6efd" },
    { name: "Upgraders", elasticity: -0.4, color: "#6610f2" },
  ];

  const pricePoints = [
    3.99, 4.49, 4.99, 5.49, 5.99, 6.49, 6.99, 7.49, 7.99, 8.99, 9.99,
  ];
  const baselinePrice = 5.99;

  const data = cohorts.map((cohort) => {
    return {
      cohort: cohort.name,
      color: cohort.color,
      points: pricePoints.map((price) => {
        const priceChange = (price - baselinePrice) / baselinePrice;
        const conversionRate = 40 * Math.exp(cohort.elasticity * priceChange); // 40% baseline
        return {
          price,
          conversionRate: Math.max(0, Math.min(100, conversionRate)),
        };
      }),
    };
  });

  // Render with D3.js
  const svg = d3
    .select("#cohort-price-curves")
    .append("svg")
    .attr("width", 800)
    .attr("height", 500);

  const xScale = d3.scaleLinear().domain([3.99, 9.99]).range([50, 750]);

  const yScale = d3.scaleLinear().domain([0, 100]).range([450, 50]);

  const line = d3
    .line()
    .x((d) => xScale(d.price))
    .y((d) => yScale(d.conversionRate));

  data.forEach((cohort) => {
    svg
      .append("path")
      .datum(cohort.points)
      .attr("d", line)
      .attr("stroke", cohort.color)
      .attr("stroke-width", 2)
      .attr("fill", "none");
  });

  // Add current price marker
  svg
    .append("line")
    .attr("x1", xScale(baselinePrice))
    .attr("x2", xScale(baselinePrice))
    .attr("y1", 50)
    .attr("y2", 450)
    .attr("stroke", "#333")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");
}
```

**UI Placement:**

- Add as new expandable section in Acquisition Elasticity tab
- Title: "Cohort Price Sensitivity Curves"
- Button: "Explore Price Response by Cohort"
- Position: Below cohort-level acquisition table

**Visual Design:**

- Each cohort: Different color (rainbow spectrum)
- Line thickness: 2px
- Current price: Vertical dashed line (black)
- Scenario price: Vertical dashed line (blue)
- Legend: Right side, sortable by elasticity
- Hover: Show cohort name, price, conversion rate

---

#### **2.3 Pareto Frontier for Scenario Optimization**

**Location:** Section 3-5 - All elasticity tabs
**Visualization Type:** Scatter plot with Pareto frontier curve
**Technology:** D3.js

**What It Shows:**

- X-axis: Revenue growth (%)
- Y-axis: Subscriber growth (%)
- Points: All simulated scenarios
- Curve: Pareto frontier (efficient scenarios)
- Color: Churn impact (green = low, red = high)
- Highlight: Scenarios on the frontier (bold outline)

**Business Value:**

- Identifies "efficient" scenarios (best tradeoffs)
- Eliminates dominated scenarios (worse on all dimensions)
- Guides decision-making: "Pick from the frontier, not below it"
- Answers: "What's the max revenue I can get for X% subscriber growth?"

**Data Requirements:**

- All scenarios with KPIs: revenue_change_pct, subscriber_change_pct, churn_change_pct
- Pareto frontier calculation: Find scenarios where no other scenario is better on both revenue and subs
- Dominated scenarios: All scenarios not on the frontier

**Implementation:**

```javascript
// Add to charts.js
function renderParetoFrontier(allScenarioResults) {
  // Calculate Pareto frontier
  const scenarios = allScenarioResults.map((s) => ({
    name: s.name,
    rev_growth: s.revenue_change_pct,
    sub_growth: s.subscriber_change_pct,
    churn_impact: s.churn_change_pct,
  }));

  // Sort by revenue growth
  scenarios.sort((a, b) => a.rev_growth - b.rev_growth);

  // Find Pareto frontier
  const frontier = [];
  let maxSubGrowth = -Infinity;

  for (const scenario of scenarios) {
    if (scenario.sub_growth > maxSubGrowth) {
      frontier.push({ ...scenario, onFrontier: true });
      maxSubGrowth = scenario.sub_growth;
    } else {
      frontier.push({ ...scenario, onFrontier: false });
    }
  }

  // Render scatter plot
  const svg = d3
    .select("#pareto-frontier")
    .append("svg")
    .attr("width", 700)
    .attr("height", 500);

  const xScale = d3
    .scaleLinear()
    .domain([
      d3.min(scenarios, (d) => d.rev_growth) - 5,
      d3.max(scenarios, (d) => d.rev_growth) + 5,
    ])
    .range([50, 650]);

  const yScale = d3
    .scaleLinear()
    .domain([
      d3.min(scenarios, (d) => d.sub_growth) - 5,
      d3.max(scenarios, (d) => d.sub_growth) + 5,
    ])
    .range([450, 50]);

  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([10, -5]); // Reverse: high churn = red

  // Draw Pareto frontier curve
  const frontierLine = d3
    .line()
    .x((d) => xScale(d.rev_growth))
    .y((d) => yScale(d.sub_growth));

  svg
    .append("path")
    .datum(frontier.filter((d) => d.onFrontier))
    .attr("d", frontierLine)
    .attr("stroke", "#007bff")
    .attr("stroke-width", 3)
    .attr("fill", "none")
    .attr("stroke-dasharray", "5,5");

  // Draw scatter points
  svg
    .selectAll("circle")
    .data(frontier)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.rev_growth))
    .attr("cy", (d) => yScale(d.sub_growth))
    .attr("r", 8)
    .attr("fill", (d) => colorScale(d.churn_impact))
    .attr("stroke", (d) => (d.onFrontier ? "#000" : "none"))
    .attr("stroke-width", (d) => (d.onFrontier ? 3 : 0))
    .attr("opacity", (d) => (d.onFrontier ? 1 : 0.5));
}
```

**UI Placement:**

- Add as new tab in Trade-offs section
- Tab name: "Pareto Frontier"
- Or overlay on existing Trade-offs scatter plot (toggle: "Show Frontier")

**Visual Design:**

- Blue dashed curve: Pareto frontier
- Points on frontier: Bold black outline (3px)
- Points below frontier: Semi-transparent (opacity: 0.5)
- Color: Churn impact (green-yellow-red sequential scale)
- Quadrant lines: X=0 and Y=0 (light gray)
- Legend: "Efficient Scenarios (on frontier) | Dominated Scenarios"

---

### **PRIORITY 3: NICE-TO-HAVE (Future Enhancements)**

---

#### **3.1 TVOD/SVOD Cross-Elasticity Analysis**

**Relevance:** LOW (unless TVOD is part of business model)
**Location:** New section or separate analysis tab
**Visualization Type:** Heatmap + dual-axis line chart

**What It Shows:**

- Cross-elasticity between TVOD and SVOD pricing
- Customer segments: TVOD-First, Hybrid, SVOD-Only
- Cannibalization effects

**Business Value:**

- Only relevant if Discovery+ has TVOD component
- Helps optimize dual-revenue model strategy

**Recommendation:** **DEFER** unless TVOD becomes strategic priority

---

#### **3.2 Marketing Mix Attribution Dashboard**

**Relevance:** MEDIUM (complements external factors data)
**Location:** New section under Event Calendar
**Visualization Type:** Stacked area chart + attribution waterfall

**What It Shows:**

- Marketing spend by channel (TV, Digital, Social, etc.)
- Attributed acquisitions by channel
- ROI by channel

**Business Value:**

- Connects pricing to marketing effectiveness
- Informs go-to-market strategy for pricing changes

**Recommendation:** **DEFER** to Phase 2 (post-POC)

---

#### **3.3 Competitive Benchmarking Dashboard**

**Relevance:** MEDIUM (uses external_factors.csv data)
**Location:** New section or overlay on existing dashboards
**Visualization Type:** Line charts + comparison table

**What It Shows:**

- Discovery+ pricing vs. competitors (Netflix, Hulu, Disney+, etc.)
- Market share trends
- Price positioning analysis

**Business Value:**

- Contextualizes pricing decisions within competitive landscape
- Supports strategic positioning

**Recommendation:** **DEFER** to Phase 2

---

## Implementation Roadmap

### **Phase 1: Core Analytics (Weeks 1-2)**

**Goal:** Add statistical rigor and executive-friendly formats

| Priority | Visualization        | Effort  | Impact | Dependencies                        |
| -------- | -------------------- | ------- | ------ | ----------------------------------- |
| **P1.1** | Confidence Intervals | 4 hours | HIGH   | Extend demand curve                 |
| **P1.2** | Revenue Waterfall    | 6 hours | HIGH   | Scenario results breakdown          |
| **P1.3** | Feature Importance   | 3 hours | HIGH   | Mock importance data                |
| **P1.4** | Survival Curves      | 5 hours | HIGH   | Time-lagged churn model             |
| **P1.5** | Revenue at Risk      | 4 hours | HIGH   | Segment-level churn data            |
| **P1.6** | Intervention Matrix  | 5 hours | HIGH   | Combine rev at risk + effectiveness |

**Total Effort:** ~27 hours (~3.5 days)

---

### **Phase 2: Advanced Visualizations (Weeks 3-4)**

**Goal:** Enhance storytelling and optimization

| Priority | Visualization       | Effort  | Impact | Dependencies                        |
| -------- | ------------------- | ------- | ------ | ----------------------------------- |
| **P2.1** | Sankey Flow Diagram | 8 hours | MEDIUM | d3-sankey plugin, transition matrix |
| **P2.2** | Cohort Price Curves | 6 hours | MEDIUM | Multi-price simulation              |
| **P2.3** | Pareto Frontier     | 5 hours | MEDIUM | All scenarios simulated             |

**Total Effort:** ~19 hours (~2.5 days)

---

### **Phase 3: Polish & Optimization (Week 5)**

**Goal:** Refinement, performance, UX improvements

- **Responsive Design:** Ensure all charts work on mobile/tablet
- **Export Enhancements:** Add waterfall/survival curves to SVG export
- **Performance:** Optimize rendering for 375 segments
- **Tooltips:** Standardize tooltip design across all charts
- **Animation:** Add smooth transitions for chart updates
- **Accessibility:** Add ARIA labels, keyboard navigation

**Total Effort:** ~16 hours (~2 days)

---

## Technical Implementation Notes

### **Technology Stack**

- **D3.js v7:** For advanced custom visualizations (survival curves, Sankey, Pareto frontier)
- **Chart.js v4:** For standard charts (waterfall, bar charts, feature importance)
- **Existing Modules:**
  - `charts.js`: Add new rendering functions
  - `scenario-engine.js`: Extend with new calculations (revenue at risk, intervention effectiveness)
  - `data-loader.js`: No changes needed (all data available)

### **Data Extensions Needed**

**Add to `elasticity-params.json`:**

```json
{
  "tier_base": {
    "ad_supported": { "elasticity": -2.1, "std_error": 0.15 },
    "ad_free": { "elasticity": -1.7, "std_error": 0.12 },
    "annual": { "elasticity": -1.5, "std_error": 0.10 }
  },
  "churn_features": [
    { "name": "Price Change %", "importance": 85, "direction": "increase" },
    { "name": "Tenure (months)", "importance": 72, "direction": "decrease" },
    ...
  ]
}
```

**Add to scenario results:**

```javascript
{
  // Existing fields
  revenue_change_pct: 3.5,
  subscriber_change_pct: -2.1,
  churn_change_pct: 0.9,

  // New fields (Phase 1)
  revenue_breakdown: {
    volume_effect: 12000,
    arpu_effect: 45000,
    churn_effect: -8000,
    downgrade_effect: -5000
  },
  confidence_intervals: {
    revenue_lower: 42000,
    revenue_upper: 58000,
    subscribers_lower: 48500,
    subscribers_upper: 50500
  },
  segment_breakdown: [
    {
      segment_name: "habitual_streamers_ad_supported_0",
      active_subs: 1250,
      arpu: 5.99,
      baseline_churn_rate: 0.10,
      forecasted_churn_rate: 0.12,
      revenue_at_risk: 3600,
      intervention_effectiveness: 78
    },
    ...
  ]
}
```

### **Performance Considerations**

- **Lazy Loading:** Load P2/P3 visualizations only when user navigates to them
- **Caching:** Cache calculated data (revenue at risk, intervention scores) to avoid recalculation
- **Throttling:** Debounce filter changes to avoid excessive re-renders
- **Web Workers:** Consider offloading heavy calculations (Pareto frontier) to web workers

---

## Success Metrics

### **Analytical Depth**

- ✅ Statistical confidence: Add CI to 100% of forecasts
- ✅ Model explainability: Feature importance for churn model
- ✅ Risk quantification: Revenue at risk in dollar terms

### **Decision Support**

- ✅ Actionable prioritization: Intervention matrix for retention efforts
- ✅ ROI clarity: Revenue waterfall shows contribution breakdown
- ✅ Optimization guidance: Pareto frontier identifies efficient scenarios

### **User Experience**

- ✅ Executive-friendly: Waterfall, Sankey, intervention matrix all highly visual
- ✅ Technical rigor: Confidence intervals, survival curves satisfy data science stakeholders
- ✅ Comprehensive: Covers acquisition, churn, migration with depth

---

## Appendix: Visualization Comparison Matrix

| **Visualization**      | **Current POC**           | **Reference Library** | **Recommendation**               |
| ---------------------- | ------------------------- | --------------------- | -------------------------------- |
| Demand Curves          | ✅ Interactive            | ✅ Basic              | **ENHANCE:** Add CI bands        |
| Elasticity Heatmap     | ✅ Segment-level          | ✅ Cohort-level       | **KEEP:** Well-covered           |
| Trade-offs Scatter     | ✅ Rev vs. Sub            | ✅ Basic              | **ENHANCE:** Add Pareto frontier |
| Radar Chart            | ✅ Multi-dimensional      | ❌ Not in ref         | **KEEP:** Unique to POC          |
| 3-Axis Radial          | ✅ 375 segments           | ❌ Not in ref         | **KEEP:** Unique to POC          |
| Confidence Intervals   | ❌ Missing                | ✅ 05_confidence      | **ADD:** P1.1                    |
| Revenue Waterfall      | ❌ Missing                | ✅ 07_waterfall       | **ADD:** P1.2                    |
| Feature Importance     | ❌ Missing                | ✅ 03_importance      | **ADD:** P1.3                    |
| Survival Curves        | ❌ Missing                | ✅ 06_survival        | **ADD:** P1.4                    |
| Revenue at Risk        | ❌ Missing                | ✅ 05_rev_risk        | **ADD:** P1.5                    |
| Intervention Matrix    | ❌ Missing                | ✅ 08_intervention    | **ADD:** P1.6                    |
| Sankey Flow Diagram    | ⚠️ Partial (tier mix)     | ✅ 02_flows           | **ADD:** P2.1                    |
| Price Curves by Cohort | ⚠️ Partial (demand curve) | ✅ 02_price_curves    | **ADD:** P2.2                    |
| TVOD Cross-Elasticity  | ❌ Missing                | ✅ Full TVOD suite    | **DEFER:** Not relevant          |

---

## Conclusion

This plan identifies **12 high-value visualization enhancements** that will transform the POC from a strong analytical tool into an enterprise-grade decision support system.

**Key Recommendations:**

1. **Prioritize Phase 1 (P1.1-P1.6):** These 6 visualizations add the most business value with reasonable effort (~3.5 days)
2. **Revenue Waterfall is the #1 quick win:** Executives love it, high impact, 6 hours to build
3. **Survival curves & revenue at risk:** Critical for churn analysis, currently missing
4. **Defer TVOD analysis:** Not relevant unless TVOD becomes strategic priority
5. **Pareto frontier:** Nice-to-have but lower priority than P1 items

**Total Effort Estimate:**

- Phase 1: 27 hours (~3.5 days)
- Phase 2: 19 hours (~2.5 days)
- Phase 3: 16 hours (~2 days)
- **TOTAL: ~62 hours (~8 working days)**

**Expected Outcome:**
A comprehensive, publication-ready POC with best-in-class visualizations that meet the needs of both technical analysts and executive stakeholders.

---

**Next Steps:**

1. Review and prioritize visualizations with stakeholders
2. Extend `elasticity-params.json` with confidence interval and feature importance data
3. Implement Phase 1 visualizations (P1.1-P1.6)
4. User testing and feedback
5. Iterate and enhance (Phase 2/3)
