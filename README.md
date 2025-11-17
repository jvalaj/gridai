# Grid.

chatgpt but it replies in diagrams instead of walls of text

ask it technical questions and it draws you a diagram. built with react, typescript, tldraw, and gpt-4.

## what it does

- you ask a question
- gpt returns structured json (nodes + edges)
- we convert that to tldraw shapes
- you get a diagram

## stack

react 19, typescript, tldraw, openai api, tailwind, vite

## setup

```bash
npm install
```

create `.env`:
```
VITE_OPENAI_API_KEY=your_key_here
```

```bash
npm run dev
```

open localhost:5173

## how it works

1. user types question in chat
2. we send it to openai with a system prompt that forces json output
3. openai returns json like this:

```typescript
{
  type: "directed-graph",
  title: "whatever",
  nodes: [{ id: "x", label: "y", kind: "service" }],
  edges: [{ from: "x", to: "y", label: "does thing" }]
}
```

4. we parse that and create tldraw shapes
5. different node types get different shapes/colors
   - users = blue circles
   - services = green rectangles
   - databases = orange clouds
   - queues = purple hexagons
   - processes = yellow diamonds

## examples

"how does oauth2 work"
"show me a microservices architecture"
"explain http request flow"
"ci/cd pipeline"

## structure

```
src/
  components/
    ChatPanel.tsx        - left side chat
    DiagramPanel.tsx     - right side canvas
    DiagramCanvas.tsx    - tldraw wrapper
  hooks/
    useChat.ts           - handles messages and api calls
  lib/
    diagramConverter.ts  - json to shapes
    openaiClient.ts      - talks to openai
```

## customizing

shapes and colors are in `diagramConverter.ts`

layout algorithms:
- circular for graphs
- horizontal for sequences  
- tree for hierarchies

change the openai prompt in `openaiClient.ts` if you want different output

## no api key?

it has stub mode with fake but realistic diagrams for testing

## building

```bash
npm run build
```

## license

MIT

built because reading api docs in paragraphs sucks
