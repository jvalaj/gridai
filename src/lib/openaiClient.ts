/**
 * OpenAI API Client
 * 
 * Handles communication with OpenAI's Chat Completions API.
 * 
 * Setup:
 * 1. Create a .env file in the project root
 * 2. Add: VITE_OPENAI_API_KEY=your_api_key_here
 * 3. The client will read from import.meta.env.VITE_OPENAI_API_KEY
 * 
 * Stub mode:
 * If no API key is provided, the client will use stub mode with fake responses.
 */

import type { Role } from '../types';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
// Force stub mode via env flag (never call API when true)
// Set VITE_STUB_MODE=true in .env to enable; default is false
const STUB_MODE = String(import.meta.env.VITE_STUB_MODE || '').toLowerCase() === 'true';
const MODEL = 'gpt-4o-mini'; // Lightweight model for MVP

const DIAGRAM_SYSTEM_PROMPT = `You are a diagram generator for developers.
When a user asks a technical question, respond with ONLY valid JSON describing a diagram.

Use this exact schema:
{
  "type": "directed-graph" | "sequence" | "tree" | "flowchart",
  "title": "Brief description of the diagram",
  "nodes": [
    { "id": "unique-id", "label": "Node label", "kind": "actor|service|db|queue|component|process|other" }
  ],
  "edges": [
    { "from": "node-id", "to": "node-id", "label": "optional edge label" }
  ]
}

Guidelines:
- Use "actor" for users, clients, or external entities
- Use "service" for servers, APIs, microservices
- Use "db" for databases
- Use "queue" for message queues, event buses
- Use "component" for system components, modules
- Use "process" for business processes, workflows
- Keep node labels short (2-4 words)
- Add edge labels to describe relationships/actions
- Respond ONLY with the JSON, no extra text`;

/**
 * Sends a chat request to OpenAI and returns a diagram specification.
 * Falls back to stub mode if no API key is provided.
 */
export async function sendChat(
  messages: { role: Role; content: string }[]
): Promise<string> {
  // Stub mode: return fake response if forced or no API key
  if (STUB_MODE || !API_KEY || API_KEY === '') {
    console.warn('⚠️ Using stub mode (no real API calls will be made).');
    return generateStubDiagram(messages);
  }

  try {
    // Add system prompt for diagram generation
    const messagesWithSystem = [
      { role: 'system' as Role, content: DIAGRAM_SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messagesWithSystem.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        response_format: { type: 'json_object' }, // Force JSON output
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '{"type":"directed-graph","title":"Error","nodes":[],"edges":[]}';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fallback to stub on error
    return generateStubDiagram(messages);
  }
}

/**
 * Generates a stub diagram for development/testing when API key is not available.
 */
function generateStubDiagram(
  messages: { role: Role; content: string }[]
): string {
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'user')?.content.toLowerCase() || '';

  // Detect what kind of diagram to generate based on keywords
  if (lastUserMessage.includes('login') || lastUserMessage.includes('auth')) {
    return JSON.stringify({
      type: 'directed-graph',
      title: 'User Authentication Flow',
      nodes: [
        { id: 'user', label: 'User', kind: 'actor' },
        { id: 'browser', label: 'Web Browser', kind: 'component' },
        { id: 'frontend', label: 'React Frontend', kind: 'component' },
        { id: 'loadbalancer', label: 'Load Balancer', kind: 'service' },
        { id: 'authservice', label: 'Auth Service', kind: 'service' },
        { id: 'userdb', label: 'User Database', kind: 'db' },
        { id: 'sessionstore', label: 'Session Store\n(Redis)', kind: 'db' },
      ],
      edges: [
        { from: 'user', to: 'browser', label: 'enters credentials' },
        { from: 'browser', to: 'frontend', label: 'POST /login' },
        { from: 'frontend', to: 'loadbalancer', label: 'HTTPS request' },
        { from: 'loadbalancer', to: 'authservice', label: 'routes to' },
        { from: 'authservice', to: 'userdb', label: 'verify credentials' },
        { from: 'authservice', to: 'sessionstore', label: 'create session' },
        { from: 'sessionstore', to: 'authservice', label: 'return token' },
        { from: 'authservice', to: 'frontend', label: 'JWT token' },
      ],
    });
  }

  if (lastUserMessage.includes('oauth') || lastUserMessage.includes('oauth2')) {
    return JSON.stringify({
      type: 'sequence',
      title: 'OAuth 2.0 Authorization Code Flow',
      nodes: [
        { id: 'user', label: 'User', kind: 'actor' },
        { id: 'client', label: 'Client Application', kind: 'component' },
        { id: 'authserver', label: 'Authorization Server', kind: 'service' },
        { id: 'resourceserver', label: 'Resource Server', kind: 'service' },
      ],
      edges: [
        { from: 'user', to: 'client', label: '1. Request access' },
        { from: 'client', to: 'authserver', label: '2. Authorization request' },
        { from: 'authserver', to: 'user', label: '3. Login prompt' },
        { from: 'user', to: 'authserver', label: '4. Credentials' },
        { from: 'authserver', to: 'client', label: '5. Authorization code' },
        { from: 'client', to: 'authserver', label: '6. Exchange code for token' },
        { from: 'authserver', to: 'client', label: '7. Access token' },
        { from: 'client', to: 'resourceserver', label: '8. API call with token' },
        { from: 'resourceserver', to: 'client', label: '9. Protected data' },
      ],
    });
  }

  if (lastUserMessage.includes('microservice') || lastUserMessage.includes('micro service')) {
    return JSON.stringify({
      type: 'directed-graph',
      title: 'Microservices Architecture',
      nodes: [
        { id: 'client', label: 'Client Apps', kind: 'actor' },
        { id: 'gateway', label: 'API Gateway', kind: 'service' },
        { id: 'userservice', label: 'User Service', kind: 'service' },
        { id: 'orderservice', label: 'Order Service', kind: 'service' },
        { id: 'paymentservice', label: 'Payment Service', kind: 'service' },
        { id: 'notificationservice', label: 'Notification Service', kind: 'service' },
        { id: 'messagequeue', label: 'Message Queue\n(RabbitMQ)', kind: 'queue' },
        { id: 'userdb', label: 'Users DB', kind: 'db' },
        { id: 'orderdb', label: 'Orders DB', kind: 'db' },
        { id: 'paymentdb', label: 'Payments DB', kind: 'db' },
      ],
      edges: [
        { from: 'client', to: 'gateway', label: 'REST/GraphQL' },
        { from: 'gateway', to: 'userservice', label: 'route' },
        { from: 'gateway', to: 'orderservice', label: 'route' },
        { from: 'gateway', to: 'paymentservice', label: 'route' },
        { from: 'userservice', to: 'userdb', label: 'query' },
        { from: 'orderservice', to: 'orderdb', label: 'query' },
        { from: 'paymentservice', to: 'paymentdb', label: 'query' },
        { from: 'orderservice', to: 'messagequeue', label: 'publish event' },
        { from: 'paymentservice', to: 'messagequeue', label: 'publish event' },
        { from: 'messagequeue', to: 'notificationservice', label: 'consume' },
      ],
    });
  }

  if (lastUserMessage.includes('ci/cd') || lastUserMessage.includes('cicd') || lastUserMessage.includes('pipeline')) {
    return JSON.stringify({
      type: 'flowchart',
      title: 'CI/CD Pipeline',
      nodes: [
        { id: 'dev', label: 'Developer', kind: 'actor' },
        { id: 'git', label: 'Git Repository', kind: 'component' },
        { id: 'ci', label: 'CI Server\n(GitHub Actions)', kind: 'service' },
        { id: 'build', label: 'Build & Test', kind: 'process' },
        { id: 'scan', label: 'Security Scan', kind: 'process' },
        { id: 'artifact', label: 'Artifact Registry', kind: 'db' },
        { id: 'staging', label: 'Staging Environment', kind: 'service' },
        { id: 'prod', label: 'Production', kind: 'service' },
      ],
      edges: [
        { from: 'dev', to: 'git', label: 'git push' },
        { from: 'git', to: 'ci', label: 'webhook trigger' },
        { from: 'ci', to: 'build', label: 'run tests' },
        { from: 'build', to: 'scan', label: 'if tests pass' },
        { from: 'scan', to: 'artifact', label: 'store image' },
        { from: 'artifact', to: 'staging', label: 'deploy' },
        { from: 'staging', to: 'prod', label: 'manual approval' },
      ],
    });
  }

  if (lastUserMessage.includes('http') || lastUserMessage.includes('request')) {
    return JSON.stringify({
      type: 'sequence',
      title: 'HTTP Request Lifecycle',
      nodes: [
        { id: 'browser', label: 'Browser', kind: 'actor' },
        { id: 'dns', label: 'DNS Server', kind: 'service' },
        { id: 'cdn', label: 'CDN', kind: 'service' },
        { id: 'loadbalancer', label: 'Load Balancer', kind: 'service' },
        { id: 'webserver', label: 'Web Server', kind: 'service' },
        { id: 'appserver', label: 'Application Server', kind: 'service' },
        { id: 'cache', label: 'Cache\n(Redis)', kind: 'db' },
        { id: 'database', label: 'Database', kind: 'db' },
      ],
      edges: [
        { from: 'browser', to: 'dns', label: 'resolve domain' },
        { from: 'dns', to: 'browser', label: 'IP address' },
        { from: 'browser', to: 'cdn', label: 'GET /assets' },
        { from: 'browser', to: 'loadbalancer', label: 'GET /api/data' },
        { from: 'loadbalancer', to: 'webserver', label: 'forward request' },
        { from: 'webserver', to: 'appserver', label: 'proxy to app' },
        { from: 'appserver', to: 'cache', label: 'check cache' },
        { from: 'appserver', to: 'database', label: 'query if cache miss' },
        { from: 'database', to: 'appserver', label: 'return data' },
        { from: 'appserver', to: 'browser', label: 'JSON response' },
      ],
    });
  }

  // Default fallback diagram
  return JSON.stringify({
    type: 'directed-graph',
    title: 'Basic System Architecture',
    nodes: [
      { id: 'user', label: 'User', kind: 'actor' },
      { id: 'frontend', label: 'Frontend\nApplication', kind: 'component' },
      { id: 'api', label: 'API Server', kind: 'service' },
      { id: 'cache', label: 'Cache Layer', kind: 'db' },
      { id: 'database', label: 'Database', kind: 'db' },
      { id: 'queue', label: 'Message Queue', kind: 'queue' },
      { id: 'worker', label: 'Background Worker', kind: 'service' },
    ],
    edges: [
      { from: 'user', to: 'frontend', label: 'interacts' },
      { from: 'frontend', to: 'api', label: 'HTTP/REST' },
      { from: 'api', to: 'cache', label: 'check cache' },
      { from: 'api', to: 'database', label: 'query data' },
      { from: 'api', to: 'queue', label: 'enqueue job' },
      { from: 'queue', to: 'worker', label: 'process async' },
      { from: 'worker', to: 'database', label: 'update' },
    ],
  });
}


