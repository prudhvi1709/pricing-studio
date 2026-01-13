/**
 * Charts Module - D3.js Visualizations
 * All charts are data-driven and dynamically rendered
 *
 * Dependencies: D3.js v7
 */

/**
 * Render Demand Curve by Tier
 * Shows price vs quantity demanded for each tier
 *
 * @param {string} containerId - DOM element ID
 * @param {Object} data - { tiers: [{ name, elasticity, currentPrice, currentSubs }] }
 * @param {Object} options - Chart configuration
 */
export function renderDemandCurve(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html(''); // Clear previous

  const margin = { top: 40, right: 150, bottom: 60, left: 80 };
  const width = (options.width || 800) - margin.left - margin.right;
  const height = (options.height || 400) - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Generate demand curves for each tier
  const demandData = data.tiers.map(tier => {
    const pricePoints = [];
    const minPrice = tier.currentPrice * 0.5;
    const maxPrice = tier.currentPrice * 1.5;
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (maxPrice - minPrice) * (i / steps);
      const priceRatio = price / tier.currentPrice;
      // Q = Q0 * (P1/P0)^elasticity
      const quantity = tier.currentSubs * Math.pow(priceRatio, tier.elasticity);
      pricePoints.push({ price, quantity });
    }

    return {
      name: tier.name,
      points: pricePoints,
      currentPrice: tier.currentPrice,
      currentSubs: tier.currentSubs,
      color: tier.color || '#0d6efd'
    };
  });

  // Scales
  const xScale = d3.scaleLinear()
    .domain([
      d3.min(demandData, d => d3.min(d.points, p => p.price)),
      d3.max(demandData, d => d3.max(d.points, p => p.price))
    ])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([
      0,
      d3.max(demandData, d => d3.max(d.points, p => p.quantity)) * 1.1
    ])
    .range([height, 0]);

  // Line generator
  const line = d3.line()
    .x(d => xScale(d.price))
    .y(d => yScale(d.quantity))
    .curve(d3.curveMonotoneX);

  // Draw lines for each tier
  demandData.forEach((tier, i) => {
    // Line
    svg.append('path')
      .datum(tier.points)
      .attr('fill', 'none')
      .attr('stroke', tier.color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Current price marker
    svg.append('circle')
      .attr('cx', xScale(tier.currentPrice))
      .attr('cy', yScale(tier.currentSubs))
      .attr('r', 5)
      .attr('fill', tier.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
  });

  // Aligned Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 20)`);

  demandData.forEach((tier, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    // Line sample
    legendRow.append('line')
      .attr('x1', 0)
      .attr('x2', 30)
      .attr('y1', 10)
      .attr('y2', 10)
      .attr('stroke', tier.color)
      .attr('stroke-width', 2);

    // Marker sample
    legendRow.append('circle')
      .attr('cx', 15)
      .attr('cy', 10)
      .attr('r', 4)
      .attr('fill', tier.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1);

    // Label
    legendRow.append('text')
      .attr('x', 36)
      .attr('y', 10)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .text(tier.name);
  });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(d => `$${d.toFixed(2)}`))
    .append('text')
    .attr('x', width / 2)
    .attr('y', 40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('Price ($)');

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => (d / 1000).toFixed(0) + 'K'))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('Subscribers');

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Demand Curve by Tier');
}

/**
 * Render Elasticity Heatmap by Segment
 * Shows elasticity values across segments and tiers
 *
 * @param {string} containerId - DOM element ID
 * @param {Object} data - { segments: ['0-3mo', '3-12mo', '12+mo'], tiers: ['ad_supported', 'ad_free', 'annual'], values: [[...]] }
 */
export function renderElasticityHeatmap(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html('');

  const margin = { top: 60, right: 20, bottom: 120, left: 120 };
  const cellSize = options.cellSize || 80;
  const width = data.tiers.length * cellSize;
  const height = data.segments.length * cellSize;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Color scale
  const colorScale = d3.scaleSequential()
    .domain([-3.0, -1.0])
    .interpolator(d3.interpolateRdYlGn);

  // Scales
  const xScale = d3.scaleBand()
    .domain(data.tiers)
    .range([0, width])
    .padding(0.05);

  const yScale = d3.scaleBand()
    .domain(data.segments)
    .range([0, height])
    .padding(0.05);

  // Draw cells
  data.segments.forEach((segment, i) => {
    data.tiers.forEach((tier, j) => {
      const value = data.values[i][j];

      const cell = svg.append('g')
        .attr('transform', `translate(${xScale(tier)},${yScale(segment)})`);

      // Rectangle
      cell.append('rect')
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', colorScale(value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('rx', 4);

      // Text value
      cell.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', value < -2.0 ? 'white' : 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(value.toFixed(2));

      // Tooltip on hover
      cell.on('mouseenter', function() {
        d3.select(this).select('rect')
          .attr('stroke', '#000')
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      })
      .append('title')
        .text(`${segment} - ${tier}\nElasticity: ${value.toFixed(2)}`);
    });
  });

  // X-axis labels
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .selectAll('text')
    .data(data.tiers)
    .join('text')
    .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(d => d.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));

  // Y-axis labels
  svg.append('g')
    .selectAll('text')
    .data(data.segments)
    .join('text')
    .attr('x', -10)
    .attr('y', d => yScale(d) + yScale.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('font-size', '12px')
    .text(d => d);

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Price Elasticity Heatmap');

  // Color legend
  const legendWidth = 200;
  const legendHeight = 20;
  const legendX = width / 2 - legendWidth / 2;
  const legendY = height + 50;

  const legendScale = d3.scaleLinear()
    .domain([-3.0, -1.0])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5);

  // Gradient
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'elasticity-gradient');

  gradient.selectAll('stop')
    .data(d3.range(0, 1.1, 0.1))
    .join('stop')
    .attr('offset', d => `${d * 100}%`)
    .attr('stop-color', d => colorScale(-3.0 + d * 2.0));

  svg.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#elasticity-gradient)');

  svg.append('g')
    .attr('transform', `translate(${legendX},${legendY + legendHeight})`)
    .call(legendAxis);

  svg.append('text')
    .attr('x', legendX - 10)
    .attr('y', legendY + legendHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('font-size', '11px')
    .text('More Elastic');

  svg.append('text')
    .attr('x', legendX + legendWidth + 10)
    .attr('y', legendY + legendHeight / 2)
    .attr('dy', '0.35em')
    .attr('font-size', '11px')
    .text('Less Elastic');
}

/**
 * Render Tier Mix Shift Chart
 * Shows before/after tier distribution
 *
 * @param {string} containerId - DOM element ID
 * @param {Object} data - { baseline: {ad_supported, ad_free, annual}, forecasted: {...} }
 */
export function renderTierMixShift(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html('');

  const margin = { top: 40, right: 120, bottom: 60, left: 80 };
  const width = (options.width || 600) - margin.left - margin.right;
  const height = (options.height || 400) - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Prepare data
  const tiers = ['ad_supported', 'ad_free', 'annual'];
  const tierLabels = ['Ad-Supported', 'Ad-Free', 'Annual'];
  const colors = ['#dc3545', '#ffc107', '#28a745'];

  const chartData = [
    { category: 'Baseline', values: tiers.map(t => data.baseline[t] || 0) },
    { category: 'Forecasted', values: tiers.map(t => data.forecasted[t] || 0) }
  ];

  // Scales
  const xScale = d3.scaleBand()
    .domain(['Baseline', 'Forecasted'])
    .range([0, width])
    .padding(0.3);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d3.sum(d.values))])
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(tiers)
    .range(colors);

  // Stack data
  const stack = d3.stack()
    .keys(d3.range(tiers.length));

  const stackedData = stack(chartData.map(d => d.values));

  // Draw stacked bars
  svg.selectAll('.tier-group')
    .data(stackedData)
    .join('g')
    .attr('class', 'tier-group')
    .attr('fill', (d, i) => colors[i])
    .selectAll('rect')
    .data(d => d)
    .join('rect')
    .attr('x', (d, i) => xScale(chartData[i].category))
    .attr('y', d => yScale(d[1]))
    .attr('height', d => yScale(d[0]) - yScale(d[1]))
    .attr('width', xScale.bandwidth())
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('opacity', 0.8);
    })
    .on('mouseleave', function() {
      d3.select(this).attr('opacity', 1);
    })
    .append('title')
    .text(function(d, i) {
      const tierIndex = stackedData.indexOf(d3.select(this.parentNode).datum());
      return `${tierLabels[tierIndex]}: ${(d[1] - d[0]).toLocaleString()} subscribers`;
    });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => (d / 1000).toFixed(0) + 'K'))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('Subscribers');

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  tierLabels.forEach((label, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    legendRow.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', colors[i]);

    legendRow.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .text(label);
  });

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Tier Mix: Baseline vs Forecasted');
}

/**
 * Render Trade-offs Scatter Plot
 * Shows Revenue vs Subscriber Growth with scenario points
 *
 * @param {string} containerId - DOM element ID
 * @param {Array} data - [{ name, revenueChange, subsChange, churnChange }]
 */
export function renderTradeoffsScatter(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html('');

  const margin = { top: 40, right: 20, bottom: 60, left: 80 };
  const width = (options.width || 600) - margin.left - margin.right;
  const height = (options.height || 400) - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const xExtent = d3.extent(data, d => d.revenueChange);
  const yExtent = d3.extent(data, d => d.subsChange);

  const xScale = d3.scaleLinear()
    .domain([Math.min(xExtent[0], 0) * 1.1, Math.max(xExtent[1], 0) * 1.1])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([Math.min(yExtent[0], 0) * 1.1, Math.max(yExtent[1], 0) * 1.1])
    .range([height, 0]);

  const colorScale = d3.scaleSequential()
    .domain([d3.max(data, d => Math.abs(d.churnChange)), 0])
    .interpolator(d3.interpolateRdYlGn);

  // Quadrant lines
  svg.append('line')
    .attr('x1', xScale(0))
    .attr('x2', xScale(0))
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#999')
    .attr('stroke-dasharray', '5,5');

  svg.append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', yScale(0))
    .attr('y2', yScale(0))
    .attr('stroke', '#999')
    .attr('stroke-dasharray', '5,5');

  // Quadrant labels
  const quadrants = [
    { x: width * 0.75, y: height * 0.25, text: 'High Rev, High Growth', anchor: 'middle' },
    { x: width * 0.25, y: height * 0.25, text: 'Low Rev, High Growth', anchor: 'middle' },
    { x: width * 0.25, y: height * 0.75, text: 'Low Rev, Low Growth', anchor: 'middle' },
    { x: width * 0.75, y: height * 0.75, text: 'High Rev, Low Growth', anchor: 'middle' }
  ];

  svg.selectAll('.quadrant-label')
    .data(quadrants)
    .join('text')
    .attr('class', 'quadrant-label')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', d => d.anchor)
    .attr('fill', '#999')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text(d => d.text);

  // Draw points
  svg.selectAll('.scenario-point')
    .data(data)
    .join('circle')
    .attr('class', 'scenario-point')
    .attr('cx', d => xScale(d.revenueChange))
    .attr('cy', d => yScale(d.subsChange))
    .attr('r', 6)
    .attr('fill', d => colorScale(Math.abs(d.churnChange)))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .attr('r', 10)
        .attr('stroke-width', 3);

      // Show tooltip
      const tooltip = svg.append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${xScale(d.revenueChange)}, ${yScale(d.subsChange) - 20})`);

      tooltip.append('rect')
        .attr('x', -80)
        .attr('y', -40)
        .attr('width', 160)
        .attr('height', 35)
        .attr('fill', 'rgba(0,0,0,0.8)')
        .attr('rx', 4);

      tooltip.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .selectAll('tspan')
        .data([
          d.name,
          `Revenue: ${d.revenueChange > 0 ? '+' : ''}${d.revenueChange.toFixed(1)}%`,
          `Subs: ${d.subsChange > 0 ? '+' : ''}${d.subsChange.toFixed(1)}%`
        ])
        .join('tspan')
        .attr('x', 0)
        .attr('dy', (_, i) => i === 0 ? -15 : 12)
        .text(d => d);
    })
    .on('mouseleave', function() {
      d3.select(this)
        .attr('r', 6)
        .attr('stroke-width', 2);
      svg.selectAll('.tooltip').remove();
    });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(10).tickFormat(d => d.toFixed(0) + '%'))
    .append('text')
    .attr('x', width / 2)
    .attr('y', 40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('Revenue Change (%)');

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => d.toFixed(0) + '%'))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('Subscriber Growth (%)');

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Revenue vs Growth Trade-offs');
}

/**
 * Render Grouped Bar Chart for Scenario Comparison
 * Shows KPI comparison across multiple scenarios
 *
 * @param {string} containerId - DOM element ID
 * @param {Array} data - [{ name, subscribers_pct, revenue_pct, churn_pct, arpu_pct }]
 */
export function renderComparisonBarChart(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html('');

  const margin = { top: 40, right: 120, bottom: 80, left: 80 };
  const width = (options.width || 800) - margin.left - margin.right;
  const height = (options.height || 400) - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // KPIs to compare
  const kpis = ['Subscribers', 'Revenue', 'ARPU', 'Churn'];
  const kpiKeys = ['subscribers_pct', 'revenue_pct', 'arpu_pct', 'churn_pct'];

  // Scales
  const x0 = d3.scaleBand()
    .domain(kpis)
    .range([0, width])
    .padding(0.2);

  const x1 = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const maxValue = d3.max(data, d => d3.max(kpiKeys, key => Math.abs(d[key])));
  const yScale = d3.scaleLinear()
    .domain([-maxValue * 1.1, maxValue * 1.1])
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(d3.schemeCategory10);

  // Zero line
  svg.append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', yScale(0))
    .attr('y2', yScale(0))
    .attr('stroke', '#999')
    .attr('stroke-width', 2);

  // Draw bars for each KPI
  kpis.forEach((kpi, i) => {
    const kpiKey = kpiKeys[i];

    svg.selectAll(`.bar-${i}`)
      .data(data)
      .join('rect')
      .attr('class', `bar-${i}`)
      .attr('x', d => x0(kpi) + x1(d.name))
      .attr('y', d => d[kpiKey] >= 0 ? yScale(d[kpiKey]) : yScale(0))
      .attr('width', x1.bandwidth())
      .attr('height', d => Math.abs(yScale(d[kpiKey]) - yScale(0)))
      .attr('fill', d => colorScale(d.name))
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.7);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
      })
      .append('title')
      .text(d => `${d.name}\n${kpi}: ${d[kpiKey] > 0 ? '+' : ''}${d[kpiKey].toFixed(1)}%`);
  });

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x0));

  svg.append('g')
    .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => d.toFixed(0) + '%'))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -60)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text('% Change from Baseline');

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${width + 20}, 0)`);

  data.forEach((scenario, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    legendRow.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', colorScale(scenario.name));

    legendRow.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .text(scenario.name);
  });

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Scenario Comparison: KPI % Change');
}

/**
 * Render Radar Chart for Multi-Dimensional Trade-offs
 * Shows multiple dimensions of scenario performance
 *
 * @param {string} containerId - DOM element ID
 * @param {Array} data - [{ name, dimensions: {revenue, growth, arpu, churn, cltv} }]
 */
export function renderRadarChart(containerId, data, options = {}) {
  const container = d3.select(`#${containerId}`);
  container.html('');

  const margin = { top: 60, right: 120, bottom: 60, left: 120 };
  const width = (options.width || 500) - margin.left - margin.right;
  const height = (options.height || 500) - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2;

  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${(width + margin.left + margin.right) / 2},${(height + margin.top + margin.bottom) / 2})`);

  // Dimensions
  const dimensions = ['Revenue\nGrowth', 'Subscriber\nGrowth', 'ARPU', 'Low\nChurn', 'CLTV'];
  const angleSlice = (Math.PI * 2) / dimensions.length;

  // Normalize data to 0-100 scale
  const normalize = (value, isChurn = false) => {
    // Normalize to 0-100 where 50 is baseline
    const normalized = 50 + value * 5; // Assuming values are -10 to +10 range
    return isChurn ? 100 - normalized : normalized; // Invert for churn (lower is better)
  };

  // Scales
  const radialScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, radius]);

  // Draw circular grid lines
  [20, 40, 60, 80, 100].forEach(level => {
    svg.append('circle')
      .attr('r', radialScale(level))
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1);

    svg.append('text')
      .attr('x', 5)
      .attr('y', -radialScale(level))
      .attr('font-size', '10px')
      .attr('fill', '#999')
      .text(level);
  });

  // Draw axes
  dimensions.forEach((dim, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = radialScale(110) * Math.cos(angle);
    const y = radialScale(110) * Math.sin(angle);

    // Axis line
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', radialScale(100) * Math.cos(angle))
      .attr('y2', radialScale(100) * Math.sin(angle))
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1);

    // Axis label
    svg.append('text')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .selectAll('tspan')
      .data(dim.split('\n'))
      .join('tspan')
      .attr('x', x)
      .attr('dy', (d, i) => i === 0 ? 0 : 12)
      .text(d => d);
  });

  // Draw scenario polygons
  const colorScale = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(d3.schemeCategory10);

  const lineGenerator = d3.lineRadial()
    .angle((d, i) => angleSlice * i)
    .radius(d => radialScale(d))
    .curve(d3.curveLinearClosed);

  data.forEach((scenario, idx) => {
    const values = [
      normalize(scenario.dimensions.revenue),
      normalize(scenario.dimensions.growth),
      normalize(scenario.dimensions.arpu),
      normalize(scenario.dimensions.churn, true),
      normalize(scenario.dimensions.cltv)
    ];

    // Area
    svg.append('path')
      .datum(values)
      .attr('d', lineGenerator)
      .attr('fill', colorScale(scenario.name))
      .attr('fill-opacity', 0.2)
      .attr('stroke', colorScale(scenario.name))
      .attr('stroke-width', 2);

    // Points
    values.forEach((value, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = radialScale(value) * Math.cos(angle);
      const y = radialScale(value) * Math.sin(angle);

      svg.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4)
        .attr('fill', colorScale(scenario.name))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .append('title')
        .text(`${scenario.name}\n${dimensions[i]}: ${value.toFixed(0)}`);
    });
  });

  // Legend
  const legend = svg.append('g')
    .attr('transform', `translate(${radius + 30}, -${radius})`);

  data.forEach((scenario, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 25})`);

    legendRow.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('fill', colorScale(scenario.name))
      .attr('fill-opacity', 0.6);

    legendRow.append('text')
      .attr('x', 24)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .text(scenario.name);
  });

  // Title
  svg.append('text')
    .attr('x', 0)
    .attr('y', -radius - 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text('Multi-Dimensional Performance');
}
