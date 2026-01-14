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

// Conversation history
let conversationHistory = [];
let llmConfig = null;
let dataContext = null;

/**
 * Initialize chat module with data context
 * @param {Object} context - Application data context
 */
export function initializeChat(context) {
  dataContext = context;
  console.log('Chat module initialized with data context');
}

/**
 * Configure LLM settings
 */
export async function configureLLM() {
  try {
    llmConfig = await openaiConfig({
      show: true,
      defaultBaseUrls: [
        // OpenAI endpoints
        "https://api.openai.com/v1",
        "https://aipipe.org/openai/v1",
        "https://llmfoundry.straive.com/openai/v1",
        // OpenRouter endpoints
        "https://openrouter.ai/api/v1",
        "https://aipipe.org/openrouter/v1",
        "https://llmfoundry.straive.com/openrouter/v1",
      ]
    });

    if (llmConfig) {
      // Enable chat UI
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
    }

    return llmConfig;
  } catch (error) {
    console.error('Error configuring LLM:', error);
    bootstrapAlert({
      color: "danger",
      title: "Configuration Error",
      body: error.message
    });
    return null;
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
- Date range: January 2, 2022 to December 29, 2024 (3 years, weekly data)
- Subscription Tiers:
  - Ad-Supported: $5.99/month (price-sensitive, elasticity ~-2.1)
  - Ad-Free: $8.99/month (moderately elastic, elasticity ~-1.7)
  - Annual: $71.88/year ($5.99/month equiv, less elastic, elasticity ~-1.5)
- Metrics available: subscribers, churn_rate, revenue, ARPU, engagement, new_subscribers, etc.

**Current Dashboard State:**
- Total Subscribers: ${typeof currentSubs === 'number' ? currentSubs.toLocaleString() : currentSubs}
- Monthly Revenue: ${typeof currentRevenue === 'number' ? '$' + currentRevenue.toLocaleString() : currentRevenue}
- Average Churn Rate: ${typeof currentChurn === 'number' ? (currentChurn * 100).toFixed(2) + '%' : currentChurn}

**Available Scenarios:**
${scenarios.map(s => `- ${s.id}: ${s.name} (${s.category})`).join('\n') || 'None loaded'}

**Available Tools:**
Use the provided tools to:
1. Query historical data with filters and aggregations
2. Run pricing scenario simulations
3. Compare multiple scenarios side-by-side
4. Generate visualizations (charts, graphs)

**Response Guidelines:**
- Be concise but informative
- Use business-friendly language
- Always explain the implications of pricing changes
- Highlight trade-offs between revenue, growth, and churn
- When showing numbers, format them clearly (use commas, currency symbols, percentages)
- If you use a tool, explain what the results mean in business terms`;
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
  if (!llmConfig) {
    bootstrapAlert({
      color: "warning",
      title: "LLM Not Configured",
      body: "Please configure the LLM provider first."
    });
    return;
  }

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
    // Prepare API request
    const { baseUrl, apiKey } = llmConfig;
    const requestBody = {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...conversationHistory
      ],
      tools: getToolDefinitions(),
      tool_choice: "auto",
      stream: true
    };

    let assistantMessage = '';
    let toolCalls = [];
    let currentToolCall = null;

    // Stream response
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

      if (!chunk.choices || chunk.choices.length === 0) continue;

      const choice = chunk.choices[0];
      const delta = choice.delta;

      // Handle text content
      if (delta.content) {
        assistantMessage += delta.content;
        updateMessage(loadingId, assistantMessage, false);
      }

      // Handle tool calls
      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.index !== undefined) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id || '',
                type: 'function',
                function: { name: toolCall.function?.name || '', arguments: '' }
              };
            }

            if (toolCall.function?.arguments) {
              toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      // Check if streaming is done
      if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
        break;
      }
    }

    // Remove loading indicator
    if (assistantMessage) {
      updateMessage(loadingId, assistantMessage, false);
    } else {
      removeMessage(loadingId);
    }

    // Add assistant message to history
    if (assistantMessage || toolCalls.length > 0) {
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      });
    }

    // Execute tool calls if any
    if (toolCalls.length > 0) {
      await executeToolCalls(toolCalls);
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

    appendMessage('system', `🔧 Executing: ${toolName}(${JSON.stringify(args)})`, false, 'tool');

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
    const { baseUrl, apiKey } = llmConfig;
    const requestBody = {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...conversationHistory
      ],
      stream: true
    };

    let assistantMessage = '';

    for await (const chunk of asyncLLM(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    })) {
      if (chunk.error) throw new Error(chunk.error);
      if (!chunk.choices || chunk.choices.length === 0) continue;

      const delta = chunk.choices[0].delta;
      if (delta.content) {
        assistantMessage += delta.content;
        updateMessage(loadingId, assistantMessage, false);
      }

      if (chunk.choices[0].finish_reason === 'stop') break;
    }

    // Add final response to history
    conversationHistory.push({
      role: "assistant",
      content: assistantMessage
    });

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
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
