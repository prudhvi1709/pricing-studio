# GenAI Conversational Search Implementation Plan

## Overview

Add natural language conversational search capabilities to the Discovery+ Price Elasticity POC, allowing users to query data, run scenarios, and get insights using plain English instead of manual UI interactions.

**Current State**: Users manually click scenarios, adjust sliders, and interpret visualizations.

**Target State**: Users can ask questions like:
- "What happens if we increase ad-free price by 10%?"
- "Compare the aggressive pricing vs conservative pricing scenarios"
- "Show me churn trends for annual tier in Q4 2024"
- "Which pricing strategy gives the best revenue without losing too many subscribers?"

---

## Use Cases & Example Queries

### 1. Data Exploration Queries
```
User: "What was the average churn rate for ad-supported tier in 2024?"
AI: Analyzes weekly_aggregated.csv, filters ad_supported tier, date range 2024, calculates avg churn
Response: "The average churn rate for the ad-supported tier in 2024 was 1.2%, with a peak of 2.6% in late December."
```

```
User: "Show me subscriber trends by tier over the last 6 months"
AI: Generates time series chart with 3 lines (one per tier) for June-Dec 2024
```

### 2. Scenario Simulation Queries
```
User: "What if we drop ad-free price to $7.99?"
AI: Identifies closest scenario or runs custom simulation
Response: "Based on elasticity models, dropping ad-free to $7.99 would:
- Increase subscribers by 8.2% (+24,500 subs)
- Increase revenue by 3.1% (+$89K/month)
- Reduce churn from 1.7% to 1.3%
Showing forecast below..."
```

```
User: "Run aggressive pricing scenario"
AI: Triggers scenario_id="aggressive_pricing" simulation, displays results
```

### 3. Comparison Queries
```
User: "Compare all pricing scenarios and tell me which one maximizes revenue"
AI: Runs all scenarios, compares revenue deltas, ranks them
Response: "Based on simulation results:
1. Premium Push: +$2.3M revenue (12.1% increase)
2. Aggressive Pricing: +$1.8M revenue (9.4% increase)
3. Ad-Free Upsell: +$1.1M revenue (5.7% increase)
..."
```

### 4. Insight & Recommendation Queries
```
User: "What's the optimal price for ad-free to maximize CLTV?"
AI: Analyzes elasticity curves, CLTV calculations, suggests price range
Response: "Based on elasticity analysis, the optimal ad-free price is between $8.49-$8.99:
- $8.49: Maximizes volume (28K subs) with good CLTV ($287)
- $8.99: Premium positioning, lower volume (24K subs), higher CLTV ($312)
Current price $8.99 is optimal for CLTV maximization."
```

### 5. Chart Generation Queries
```
User: "Create a heatmap showing elasticity by segment and tier"
AI: Calls renderElasticityHeatmap() with appropriate data
```

---

## Architecture

### High-Level Flow
```
┌─────────────────┐
│  User Query     │
│  (Natural Lang) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Query Parser & Intent Detector │
│  (LLM: Claude/GPT)              │
└────────┬────────────────────────┘
         │
         ├─────► Data Query (read CSV, aggregate)
         │
         ├─────► Scenario Simulation (run scenario engine)
         │
         ├─────► Comparison (multi-scenario analysis)
         │
         └─────► Chart Generation (call chart functions)
                 │
                 ▼
         ┌──────────────────┐
         │  Response Gen    │
         │  + Visualizations│
         └──────────────────┘
```

### Components Required

#### 1. Chat Interface (UI)
- **Location**: New section in `index.html` or floating widget
- **Elements**:
  - Chat input box
  - Message history (user messages + AI responses)
  - Quick action buttons (suggested queries)
  - Chart insertion area within chat

#### 2. Query Processing Backend
- **Option A - Frontend Only** (Anthropic Claude API directly from browser)
  - Use `@anthropic-ai/sdk` in browser
  - Send user query + context (data schema, available scenarios) to Claude API
  - Parse structured response

- **Option B - Backend API** (Python Flask/FastAPI)
  - POST `/api/chat` endpoint
  - Processes query server-side
  - Returns structured JSON response

#### 3. Tool/Function Calling
Allow LLM to invoke specific functions:

**Available Tools**:
1. `query_data(filters, metrics, aggregation)` - Query CSV data
2. `run_scenario(scenario_id, custom_params)` - Run price simulation
3. `compare_scenarios(scenario_ids[])` - Multi-scenario comparison
4. `calculate_elasticity(tier, price_point)` - Elasticity calculation
5. `generate_chart(chart_type, data_params)` - Render visualizations
6. `get_recommendations(objective)` - Get pricing recommendations

#### 4. Context Management
- **System Prompt**: Provide LLM with:
  - Data schema (columns in weekly_aggregated.csv)
  - Available scenarios (from scenarios.json)
  - Current dashboard state (loaded data, active filters)
  - Elasticity parameters

- **Conversation History**: Maintain chat context for follow-up questions

---

## Technical Implementation

### Phase 1: Basic Q&A (Day 1-2)

#### Step 1: Add Chat UI
**File**: `index.html`

```html
<!-- Chat Section -->
<div id="chat-section" style="display: none;">
  <div class="container my-4">
    <div class="card">
      <div class="card-header">
        <h2 class="h5 mb-0">
          <i class="bi bi-chat-dots me-2"></i>
          Ask Questions About Your Data
        </h2>
      </div>
      <div class="card-body">
        <!-- Chat Messages -->
        <div id="chat-messages" class="mb-3" style="height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 15px;">
          <!-- Messages will be appended here -->
        </div>

        <!-- Input -->
        <div class="input-group">
          <input type="text" id="chat-input" class="form-control" placeholder="Ask a question about pricing, scenarios, or data..." />
          <button id="chat-send-btn" class="btn btn-primary">
            <i class="bi bi-send"></i> Send
          </button>
        </div>

        <!-- Suggested Questions -->
        <div class="mt-3">
          <small class="text-muted">Try asking:</small>
          <div class="mt-2">
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2 suggested-query">What was churn rate in Q4 2024?</button>
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2 suggested-query">Run aggressive pricing scenario</button>
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2 suggested-query">Compare all scenarios</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### Step 2: Create Chat Module
**File**: `js/chat.js`

```javascript
/**
 * Chat Module - GenAI Conversational Search
 * Handles natural language queries for data exploration and scenario analysis
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client (requires API key)
let anthropic;

export function initializeChat(apiKey) {
  anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // For client-side usage
  });
}

// Conversation history
let conversationHistory = [];

/**
 * Send message to AI
 */
export async function sendMessage(userMessage, context) {
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Call Claude API with function calling
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: conversationHistory,
    tools: getToolDefinitions()
  });

  // Process response
  return await processResponse(response, context);
}

/**
 * Build system prompt with data context
 */
function buildSystemPrompt(context) {
  return `You are an AI assistant for the Discovery+ Price Elasticity Dashboard.

**Available Data**:
- Date range: 2022-01-02 to 2024-12-29 (3 years, weekly)
- Tiers: ad_supported, ad_free, annual
- Metrics: subscribers, churn_rate, revenue, ARPU, engagement, etc.

**Current Dashboard State**:
- Total Subscribers: ${context.currentSubscribers?.toLocaleString() || 'N/A'}
- Monthly Revenue: ${context.currentRevenue ? '$' + (context.currentRevenue/1000).toFixed(0) + 'K' : 'N/A'}
- Average Churn: ${context.currentChurn ? (context.currentChurn * 100).toFixed(2) + '%' : 'N/A'}

**Available Scenarios**:
${context.scenarios?.map(s => `- ${s.id}: ${s.name}`).join('\n') || 'None loaded'}

**Your Role**:
- Answer questions about pricing data and trends
- Run scenario simulations when asked
- Compare scenarios and provide recommendations
- Generate charts and visualizations
- Explain elasticity concepts in simple terms

Use the provided tools to query data, run simulations, and generate visualizations.`;
}

/**
 * Define tools (functions) for Claude to use
 */
function getToolDefinitions() {
  return [
    {
      name: 'query_data',
      description: 'Query the weekly aggregated CSV data with filters and aggregations',
      input_schema: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filter conditions (e.g., {tier: "ad_supported", date_start: "2024-01-01"})'
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Metrics to retrieve (e.g., ["active_subscribers", "churn_rate", "revenue"])'
          },
          aggregation: {
            type: 'string',
            enum: ['avg', 'sum', 'min', 'max', 'latest'],
            description: 'How to aggregate the data'
          }
        },
        required: ['metrics']
      }
    },
    {
      name: 'run_scenario',
      description: 'Run a pricing scenario simulation',
      input_schema: {
        type: 'object',
        properties: {
          scenario_id: {
            type: 'string',
            description: 'ID of the scenario to run (from scenarios.json)'
          }
        },
        required: ['scenario_id']
      }
    },
    {
      name: 'compare_scenarios',
      description: 'Compare multiple scenarios side-by-side',
      input_schema: {
        type: 'object',
        properties: {
          scenario_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of scenario IDs to compare'
          }
        },
        required: ['scenario_ids']
      }
    },
    {
      name: 'generate_chart',
      description: 'Generate a visualization',
      input_schema: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            enum: ['line', 'bar', 'heatmap', 'scatter', 'demand_curve'],
            description: 'Type of chart to generate'
          },
          params: {
            type: 'object',
            description: 'Chart-specific parameters'
          }
        },
        required: ['chart_type']
      }
    }
  ];
}

/**
 * Process Claude's response and execute tool calls
 */
async function processResponse(response, context) {
  const result = {
    text: '',
    toolCalls: [],
    charts: []
  };

  for (const block of response.content) {
    if (block.type === 'text') {
      result.text += block.text;
    } else if (block.type === 'tool_use') {
      // Execute tool call
      const toolResult = await executeToolCall(block.name, block.input, context);
      result.toolCalls.push({
        name: block.name,
        input: block.input,
        result: toolResult
      });
    }
  }

  // Add assistant response to history
  conversationHistory.push({
    role: 'assistant',
    content: response.content
  });

  return result;
}

/**
 * Execute a tool call
 */
async function executeToolCall(toolName, input, context) {
  switch (toolName) {
    case 'query_data':
      return await context.queryData(input);

    case 'run_scenario':
      return await context.runScenario(input.scenario_id);

    case 'compare_scenarios':
      return await context.compareScenarios(input.scenario_ids);

    case 'generate_chart':
      return await context.generateChart(input.chart_type, input.params);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Clear conversation history
 */
export function clearHistory() {
  conversationHistory = [];
}
```

#### Step 3: Integrate with Main App
**File**: `js/app.js`

Add chat integration:

```javascript
import { initializeChat, sendMessage, clearHistory } from './chat.js';

// Initialize chat when data is loaded
async function enableChat() {
  const apiKey = prompt('Enter your Anthropic API key:'); // TODO: Better key management
  initializeChat(apiKey);

  document.getElementById('chat-section').style.display = 'block';

  // Attach event listeners
  document.getElementById('chat-send-btn').addEventListener('click', handleChatMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatMessage();
  });

  // Suggested queries
  document.querySelectorAll('.suggested-query').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('chat-input').value = btn.textContent;
      handleChatMessage();
    });
  });
}

async function handleChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  // Add user message to UI
  appendChatMessage('user', message);
  input.value = '';

  // Show loading indicator
  appendChatMessage('assistant', 'Thinking...', 'loading');

  // Build context
  const context = {
    currentSubscribers: getCurrentSubscribers(),
    currentRevenue: getCurrentRevenue(),
    currentChurn: getCurrentChurn(),
    scenarios: await loadScenarios(),

    // Tool implementations
    queryData: async (params) => await queryWeeklyData(params),
    runScenario: async (scenarioId) => await simulateScenario(scenarioId),
    compareScenarios: async (ids) => await compareMultipleScenarios(ids),
    generateChart: async (type, params) => await renderChartInChat(type, params)
  };

  try {
    const response = await sendMessage(message, context);

    // Remove loading message
    removeLoadingMessage();

    // Add AI response
    appendChatMessage('assistant', response.text);

    // Render any charts
    if (response.charts && response.charts.length > 0) {
      response.charts.forEach(chart => renderChartInChat(chart));
    }

  } catch (error) {
    removeLoadingMessage();
    appendChatMessage('assistant', `Error: ${error.message}`, 'error');
  }
}

function appendChatMessage(role, text, className = '') {
  const messagesDiv = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role} ${className} mb-3`;

  const icon = role === 'user' ? '👤' : '🤖';
  messageDiv.innerHTML = `
    <div class="d-flex align-items-start">
      <div class="me-2">${icon}</div>
      <div class="flex-grow-1">
        <div class="text-muted small mb-1">${role === 'user' ? 'You' : 'AI Assistant'}</div>
        <div class="message-content">${text}</div>
      </div>
    </div>
  `;

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

---

### Phase 2: Advanced Features (Day 3-4)

#### 1. Custom Scenario Creation
```
User: "Create a scenario where ad-free is $9.99 and ad-supported is $4.99"
AI: Dynamically creates custom scenario, runs simulation
```

#### 2. Multi-Turn Conversations
```
User: "What was revenue in Q3 2024?"
AI: "$8.2M across all tiers"
User: "How does that compare to Q3 2023?"
AI: "Q3 2023 revenue was $7.1M, so 2024 shows 15.5% growth year-over-year"
```

#### 3. Trend Analysis
```
User: "Are we seeing churn increase or decrease over time?"
AI: Analyzes trend, generates line chart showing 3-year churn trend
```

#### 4. Recommendations Engine
```
User: "What should we do to maximize revenue?"
AI: Runs multiple scenarios, ranks them, provides top 3 recommendations with trade-offs
```

---

## Data Requirements

### Context Data to Pass to LLM

1. **Schema Information**:
```json
{
  "data_schema": {
    "table": "weekly_aggregated",
    "columns": [
      {"name": "date", "type": "date", "description": "Week start date"},
      {"name": "tier", "type": "string", "values": ["ad_supported", "ad_free", "annual"]},
      {"name": "active_subscribers", "type": "integer"},
      {"name": "churn_rate", "type": "float", "description": "Weekly churn rate"},
      {"name": "revenue", "type": "float", "description": "Weekly revenue in USD"},
      {"name": "arpu", "type": "float", "description": "Average Revenue Per User"},
      {"name": "price", "type": "float"},
      ...
    ]
  }
}
```

2. **Available Scenarios** (from scenarios.json)

3. **Elasticity Parameters** (from elasticity-params.json)

4. **Current Dashboard State**

---

## Security & API Key Management

### Option 1: Client-Side with User API Key
- User provides their own Anthropic API key
- Store in sessionStorage (cleared on browser close)
- Pros: No backend required
- Cons: User needs API key, usage costs on user

### Option 2: Backend Proxy
- Backend server holds API key
- Frontend calls `/api/chat` endpoint
- Backend proxies to Anthropic API
- Pros: Secure, can add rate limiting
- Cons: Requires backend infrastructure

### Recommended: Backend Proxy with Auth
```python
# Python Flask example
from flask import Flask, request, jsonify
from anthropic import Anthropic
import os

app = Flask(__name__)
anthropic = Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json

    # TODO: Add authentication
    # TODO: Add rate limiting

    response = anthropic.messages.create(
        model='claude-3-5-sonnet-20241022',
        max_tokens=4096,
        system=data['system_prompt'],
        messages=data['messages'],
        tools=data['tools']
    )

    return jsonify(response.to_dict())
```

---

## Implementation Checklist

### Day 1: Setup & Basic Chat
- [ ] Create `GENAI_CONVERSATIONAL_SEARCH.md` (this file)
- [ ] Add chat UI section to `index.html`
- [ ] Create `js/chat.js` module
- [ ] Integrate Anthropic SDK
- [ ] Implement basic text Q&A (no tool calling yet)
- [ ] Test with simple queries: "What is price elasticity?"

### Day 2: Tool Calling
- [ ] Implement `query_data` tool
- [ ] Implement `run_scenario` tool
- [ ] Integrate with existing scenario engine
- [ ] Test: "Run aggressive pricing scenario"
- [ ] Display scenario results in chat

### Day 3: Visualizations & Comparison
- [ ] Implement `generate_chart` tool
- [ ] Render charts within chat messages
- [ ] Implement `compare_scenarios` tool
- [ ] Test multi-scenario comparisons
- [ ] Add suggested queries

### Day 4: Polish & Advanced Features
- [ ] Add conversation history UI
- [ ] Implement multi-turn context
- [ ] Add loading states and error handling
- [ ] Optimize prompts for better accuracy
- [ ] Add recommendation engine
- [ ] Performance testing

### Optional Enhancements
- [ ] Voice input (Web Speech API)
- [ ] Export chat history
- [ ] Save/share conversations
- [ ] Chart annotations in chat
- [ ] Natural language filters for existing charts

---

## Cost Estimation

**Anthropic Claude Pricing** (as of 2025):
- Input: $3 per million tokens
- Output: $15 per million tokens

**Estimated Costs per Query**:
- Simple query (1K input, 200 output): ~$0.006
- Complex query with tool calls (3K input, 1K output): ~$0.024

**Monthly Estimate** (100 users, 10 queries/day each):
- 100 users × 10 queries × 30 days = 30,000 queries/month
- Average cost: ~$0.015/query
- **Total: ~$450/month**

---

## Testing Queries

### Basic Queries
1. "What was the average churn rate in 2024?"
2. "Show me revenue trends for the last 6 months"
3. "How many subscribers do we have for each tier?"

### Scenario Queries
4. "Run the aggressive pricing scenario"
5. "What happens if we increase ad-free price by $2?"
6. "Compare conservative vs aggressive pricing"

### Analysis Queries
7. "Which tier has the highest ARPU?"
8. "When did we see the biggest drop in subscribers?"
9. "What's the optimal price for ad-free tier?"

### Chart Queries
10. "Show me a demand curve for all tiers"
11. "Create a heatmap of elasticity by segment"
12. "Generate a forecast chart with confidence intervals"

---

## Future Enhancements

### Phase 3: Advanced Analytics
- Predictive modeling: "Forecast next quarter's revenue"
- What-if analysis: "What if Netflix raises prices to $20?"
- Cohort analysis: "Compare churn for users acquired in Q1 vs Q2"

### Phase 4: Automation
- Scheduled reports: "Send me a weekly summary every Monday"
- Alerts: "Notify me if churn exceeds 2%"
- Anomaly detection: "Flag unusual pricing trends"

### Phase 5: Multi-Modal
- Upload new data files via chat
- Export analysis as PDF reports
- Interactive chart editing through conversation

---

## Resources & References

**Anthropic Documentation**:
- Tool/Function Calling: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Message API: https://docs.anthropic.com/en/api/messages

**Similar Implementations**:
- Tableau Ask Data
- Power BI Q&A
- ThoughtSpot Natural Language Search

**Libraries**:
- `@anthropic-ai/sdk` (JavaScript/TypeScript)
- `anthropic` (Python)

---

## Notes for Tomorrow

1. **Start Simple**: Begin with read-only queries before scenario simulations
2. **Test System Prompt**: Iterate on system prompt to improve accuracy
3. **Error Handling**: LLM may hallucinate - validate all tool inputs
4. **Rate Limiting**: Consider adding rate limits if using shared API key
5. **User Feedback**: Add thumbs up/down to improve responses over time

**First Task Tomorrow**:
1. Read this document
2. Decide on API key management approach (client-side vs backend)
3. Add chat UI to index.html
4. Get first query working end-to-end
