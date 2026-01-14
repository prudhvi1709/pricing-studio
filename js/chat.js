/**
 * Chat Module - GenAI Conversational Search
 * Handles natural language queries for data exploration and scenario analysis
 *
 * Dependencies: asyncllm, marked, highlight.js, lit-html, bootstrap-llm-provider
 */

import { asyncLLM } from "asyncllm";
import { bootstrapAlert } from "bootstrap-alert";
import { openaiConfig } from "bootstrap-llm-provider";
import hljs from "highlight.js";
import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { Marked } from "marked";
import { parse } from "partial-json";
import saveform from "saveform";

// Initialize Markdown renderer with code highlighting
const marked = new Marked();
marked.use({
  renderer: {
    code(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return /* html */ `<pre class="hljs language-${language}"><code>${
        hljs.highlight(code, { language }).value.trim()
      }</code></pre>`;
    },
  },
});

// Default LLM provider endpoints
const DEFAULT_BASE_URLS = [
  // OpenAI endpoints
  "https://api.openai.com/v1",
  "https://aipipe.org/openai/v1",
  // OpenRouter endpoints
  "https://openrouter.ai/api/v1",
  "https://aipipe.org/openrouter/v1",
];

// Settings form persistence
const settingsForm = saveform("#settings-form");

// Conversation history
let conversationHistory = [];
let dataContext = null;

/**
 * Initialize chat module with data context
 * @param {Object} context - Application data context
 */
export function initializeChat(context) {
  dataContext = context;

  // Set up settings form reset handler
  const resetButton = document.querySelector("#settings-form [type=reset]");
  if (resetButton) {
    resetButton.addEventListener("click", () => settingsForm.clear());
  }
}

/**
 * Get the model name from settings form
 * @returns {string} The model name
 */
function getModelName() {
  const modelInput = document.getElementById("model");
  return modelInput?.value || "gpt-4.1-mini";
}

/**
 * Configure LLM settings - Shows the configuration modal
 */
export async function configureLLM() {
  try {
    await openaiConfig({
      show: true,
      defaultBaseUrls: DEFAULT_BASE_URLS
    });

    // Enable chat UI after configuration
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-send-btn').disabled = false;
    document.querySelectorAll('.suggested-query').forEach(btn => {
      btn.disabled = false;
    });

    bootstrapAlert({
      color: "success",
      title: "LLM Configured",
      body: "You can now start asking questions!"
    });
  } catch (error) {
    console.error('Error configuring LLM:', error);
    bootstrapAlert({
      color: "danger",
      title: "Configuration Error",
      body: error.message
    });
  }
}

/**
 * Build system prompt with current data context
 */
function buildSystemPrompt() {
  const scenarios = dataContext.scenarios || [];
  const currentSubs = dataContext.currentSubscribers || 'N/A';
  const currentRevenue = dataContext.currentRevenue || 'N/A';
  const currentChurn = dataContext.currentChurn || 'N/A';

  return `You are an AI assistant for the Discovery+ Price Elasticity Dashboard.

**Your Role:**
- Answer questions about pricing data, trends, and elasticity
- Run scenario simulations when requested
- Compare scenarios and provide recommendations
- Generate visualizations and charts
- Explain elasticity concepts in simple, business-friendly terms

**Available Data:**
- Date range: January 2, 2022 to December 29, 2024 (3 years, 156 weeks per tier = 468 total records)
- Subscription Tiers:
  - Ad-Supported: $5.99/month (price-sensitive, elasticity ~-2.1)
  - Ad-Free: $8.99/month (moderately elastic, elasticity ~-1.7)
  - Annual: $71.88/year ($5.99/month equiv, less elastic, elasticity ~-1.5)
  - Bundle: Discovery+ & Max at $14.99 (estimated baseline)

**Data Schema (weekly_aggregated.csv):**
Columns available: date, tier, new_subscribers, active_subscribers, churned_subscribers, churn_rate,
net_adds, revenue, arpu, price, base_price, is_promo, promo_discount_pct, avg_engagement_score,
avg_watch_time_30d, total_marketing_spend, paid_social, paid_search, major_content_releases,
net_content_score, unemployment_rate, cpi, consumer_sentiment, competitor_avg_price, netflix_price,
netflix_major_release, price_lag1, price_lag4, new_subs_lag1, time_index, month, quarter, is_holiday_season

**Current Dashboard State:**
- Total Subscribers: ${typeof currentSubs === 'number' ? currentSubs.toLocaleString() : currentSubs}
- Monthly Revenue: ${typeof currentRevenue === 'number' ? '$' + currentRevenue.toLocaleString() : currentRevenue}
- Average Churn Rate: ${typeof currentChurn === 'number' ? (currentChurn * 100).toFixed(2) + '%' : currentChurn}

**Available Scenarios:**
${scenarios.slice(0, 10).map(s => `- ${s.id}: ${s.name} (${s.category})`).join('\n') || 'None loaded'}

**IMPORTANT - Tool Usage:**
When users ask data questions, you MUST use the query_data tool to retrieve actual data from the CSV.
DO NOT make up numbers or estimates - always query the data first, then answer based on the results.

Example:
User: "What was churn in Q4 2024?"
You: Call query_data with filters: {tier: "all", date_start: "2024-10-01", date_end: "2024-12-31"}, metrics: ["churn_rate"], aggregation: "avg"
Tool returns: {results: {churn_rate: 0.0142}, data_points: 39}
You: "The average churn rate in Q4 2024 across all tiers was 1.42% (based on 39 weekly data points)."

**Response Guidelines:**
- Always use tools to query data before answering
- Cite the tool results in your answer (e.g., "Based on 39 data points...")
- Use business-friendly language
- Explain implications of pricing changes
- Highlight trade-offs between revenue, growth, and churn
- Format numbers clearly (use commas, currency symbols, percentages)
- When you receive tool results, analyze them and provide insights, not just raw numbers`;
}

/**
 * Define tools for the LLM to call
 */
function getToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: "query_data",
        description: "Query the weekly aggregated CSV data with filters and aggregations. Use this to answer questions about historical metrics, trends, and tier-specific data.",
        parameters: {
          type: "object",
          properties: {
            filters: {
              type: "object",
              description: "Filter conditions (e.g., {tier: 'ad_supported', date_start: '2024-01-01', date_end: '2024-12-31'})",
              properties: {
                tier: {
                  type: "string",
                  enum: ["ad_supported", "ad_free", "annual", "all"],
                  description: "Subscription tier to filter by"
                },
                date_start: {
                  type: "string",
                  description: "Start date in YYYY-MM-DD format"
                },
                date_end: {
                  type: "string",
                  description: "End date in YYYY-MM-DD format"
                }
              }
            },
            metrics: {
              type: "array",
              items: { type: "string" },
              description: "Metrics to retrieve (e.g., ['active_subscribers', 'churn_rate', 'revenue', 'arpu'])"
            },
            aggregation: {
              type: "string",
              enum: ["avg", "sum", "min", "max", "latest", "trend"],
              description: "How to aggregate the data"
            }
          },
          required: ["metrics"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "run_scenario",
        description: "Run a pricing scenario simulation to forecast the impact of price changes. Returns forecasted subscribers, revenue, churn, ARPU, and other KPIs.",
        parameters: {
          type: "object",
          properties: {
            scenario_id: {
              type: "string",
              description: "ID of the scenario to run (e.g., 'scenario_001', 'scenario_002'). Use query_data first to see available scenarios if needed."
            }
          },
          required: ["scenario_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "compare_scenarios",
        description: "Compare multiple scenarios side-by-side to see which performs best on various metrics.",
        parameters: {
          type: "object",
          properties: {
            scenario_ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of scenario IDs to compare (e.g., ['scenario_001', 'scenario_002', 'scenario_003'])"
            },
            sort_by: {
              type: "string",
              enum: ["revenue", "subscribers", "churn", "arpu"],
              description: "Metric to rank scenarios by"
            }
          },
          required: ["scenario_ids"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_scenario_list",
        description: "Get a list of all available pricing scenarios with their descriptions.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    }
  ];
}

/**
 * Send a message to the LLM
 * @param {string} userMessage - User's question
 * @returns {Promise<void>}
 */
export async function sendMessage(userMessage) {
  if (!dataContext) {
    bootstrapAlert({
      color: "warning",
      title: "Data Not Loaded",
      body: "Please load data first before asking questions."
    });
    return;
  }

  // Add user message to UI and history
  appendMessage('user', userMessage);
  conversationHistory.push({
    role: "user",
    content: userMessage
  });

  // Show loading indicator
  const loadingId = appendMessage('assistant', '...', true);

  try {
    // Get LLM config from localStorage (or show config modal if not set)
    const { baseUrl, apiKey } = await openaiConfig({
      defaultBaseUrls: DEFAULT_BASE_URLS
    });

    // Prepare API request (NON-STREAMING first to get tool calls immediately)
    const requestBody = {
      model: getModelName(),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...conversationHistory
      ],
      tools: getToolDefinitions(),
      tool_choice: "auto",
      stream: false,  // ✨ Non-streaming to avoid partial "thinking" text
      temperature: 0.7,
      max_tokens: 2000
    };

    // Make non-streaming request to get tool calls immediately
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    // Handle response based on whether tools were called
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Remove loading indicator (no partial text to show)
      removeMessage(loadingId);

      // Add assistant message with tool calls to history
      conversationHistory.push({
        role: "assistant",
        content: message.content || null,
        tool_calls: message.tool_calls
      });

      // Execute tool calls and get STREAMING final response
      await executeToolCalls(message.tool_calls);
    } else {
      // No tool calls - got direct answer
      if (message.content) {
        // Update with final message
        updateMessage(loadingId, message.content, false);

        // Add to history
        conversationHistory.push({
          role: "assistant",
          content: message.content
        });
      } else {
        removeMessage(loadingId);
      }
    }

  } catch (error) {
    console.error('Error sending message:', error);
    removeMessage(loadingId);
    appendMessage('assistant', `❌ Error: ${error.message}`, false, 'error');
    bootstrapAlert({
      color: "danger",
      title: "LLM Error",
      body: error.message
    });
  }
}

/**
 * Execute tool calls and send results back to LLM
 */
async function executeToolCalls(toolCalls) {
  const toolResults = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    let args = {};

    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Error parsing tool arguments:', e);
      args = {};
    }

    appendMessage('system', `🔧 Executing: ${toolName}`, false, 'tool');

    try {
      const result = await executeTool(toolName, args);

      toolResults.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolName,
        content: JSON.stringify(result)
      });

      appendMessage('system', `✅ ${toolName} completed`, false, 'tool');
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      toolResults.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolName,
        content: JSON.stringify({ error: error.message })
      });

      appendMessage('system', `❌ ${toolName} failed: ${error.message}`, false, 'tool-error');
    }
  }

  // Add tool results to history
  conversationHistory.push(...toolResults);

  // Get LLM's final response after tool execution
  await getContinuationResponse();
}

/**
 * Get continuation response from LLM after tool execution
 */
async function getContinuationResponse() {
  const loadingId = appendMessage('assistant', '...', true);

  try {
    // Get LLM config from localStorage
    const { baseUrl, apiKey } = await openaiConfig({
      defaultBaseUrls: DEFAULT_BASE_URLS
    });

    const requestBody = {
      model: getModelName(),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...conversationHistory
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    };

    let assistantMessage = '';
    let lastUpdateTime = 0;
    const updateInterval = 50; // Update UI every 50ms max (20 FPS)

    for await (const chunk of asyncLLM(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    })) {

      if (chunk.error) {
        throw new Error(chunk.error);
      }

      // asyncLLM returns chunks with {content, message} format
      // IMPORTANT: chunk.content contains FULL accumulated text, not delta!
      // Handle both formats: asyncLLM's simplified format and OpenAI's standard format
      let content = null;
      let finishReason = null;

      if (chunk.choices && chunk.choices.length > 0) {
        // Standard OpenAI format (delta - incremental content)
        const delta = chunk.choices[0].delta;
        if (delta?.content) {
          assistantMessage += delta.content;  // Accumulate deltas
          content = assistantMessage;
        }
        finishReason = chunk.choices[0].finish_reason;
      } else if (chunk.content !== undefined) {
        // asyncLLM simplified format (full accumulated content)
        content = chunk.content;  // Use directly, don't accumulate!
        assistantMessage = content;  // Store for history
        finishReason = chunk.message?.finish_reason;
      }

      if (content) {
        // Throttle UI updates for better performance
        const now = Date.now();
        if (now - lastUpdateTime > updateInterval || finishReason) {
          updateMessage(loadingId, content, false);
          lastUpdateTime = now;
        }
      }

      if (finishReason && finishReason === 'stop') {
        break;
      }
    }

    // Final update to ensure all content is rendered
    if (assistantMessage) {
      updateMessage(loadingId, assistantMessage, false);
    }

    if (assistantMessage) {
      // Add final response to history
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage
      });
    } else {
      removeMessage(loadingId);
      appendMessage('assistant', 'No response received from the model.', false, 'error');
    }

  } catch (error) {
    console.error('Error getting continuation:', error);
    removeMessage(loadingId);
    appendMessage('assistant', `❌ Error: ${error.message}`, false, 'error');
  }
}

/**
 * Execute a specific tool
 */
async function executeTool(toolName, args) {
  switch (toolName) {
    case 'query_data':
      return await dataContext.queryData(args);

    case 'run_scenario':
      return await dataContext.runScenario(args.scenario_id);

    case 'compare_scenarios':
      return await dataContext.compareScenarios(args.scenario_ids, args.sort_by);

    case 'get_scenario_list':
      return await dataContext.getScenarioList();

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Append a message to the chat UI
 */
function appendMessage(role, content, isLoading = false, customClass = '') {
  const messagesDiv = document.getElementById('chat-messages');
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `chat-message mb-3 ${role} ${customClass}`;

  const icon = role === 'user' ? '👤' : role === 'system' ? '⚙️' : '🤖';
  const label = role === 'user' ? 'You' : role === 'system' ? 'System' : 'AI Assistant';

  if (isLoading) {
    messageDiv.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-2">${icon}</div>
        <div class="flex-grow-1">
          <div class="text-muted small mb-1">${label}</div>
          <div class="message-content">
            <span class="spinner-border spinner-border-sm me-2"></span>
            <span class="text-muted">Thinking...</span>
          </div>
        </div>
      </div>
    `;
  } else {
    const formattedContent = role === 'assistant' ? marked.parse(content) : content;
    messageDiv.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="me-2">${icon}</div>
        <div class="flex-grow-1">
          <div class="text-muted small mb-1">${label}</div>
          <div class="message-content">${formattedContent}</div>
        </div>
      </div>
    `;
  }

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  return messageId;
}

/**
 * Update an existing message
 */
function updateMessage(messageId, content, isLoading = false) {
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) return;

  const contentDiv = messageDiv.querySelector('.message-content');
  if (!contentDiv) return;

  if (isLoading) {
    contentDiv.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      <span class="text-muted">Thinking...</span>
    `;
  } else {
    contentDiv.innerHTML = marked.parse(content);
  }

  const messagesDiv = document.getElementById('chat-messages');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Remove a message from the UI
 */
function removeMessage(messageId) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    messageDiv.remove();
  }
}

/**
 * Clear conversation history
 */
export function clearHistory() {
  conversationHistory = [];
  const messagesDiv = document.getElementById('chat-messages');
  messagesDiv.innerHTML = `
    <div class="text-center text-muted mt-5">
      <i class="bi bi-chat-square-text display-4 mb-3"></i>
      <p>Start a conversation by asking a question about your pricing data, scenarios, or elasticity analysis.</p>
    </div>
  `;
}
