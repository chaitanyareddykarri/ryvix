# Ryvix Web Chat & Visual Console Specification

## 1. Console Layout & Architecture

The **Ryvix Web Console** provides a unified graphical interface combining conversational control with high-density developer tooling.

```
+------------------------------------------------------------------------------------+
|  [Logo] RYVIX       Project: prod-ecommerce (main)             [Status: Healthy]   |
+--------------------------+---------------------------------------------------------+
| NAVIGATION               | MAIN WORKSPACE AREA                                     |
| - Dashboard              | +-----------------------------------------------------+ |
| - Web Chat               | | LIVE CONVERSATION STREAM                            | |
| - Repositories           | | User: "Change pricing badge from green to purple"   | |
| - Servers & Health       | |                                                     | |
| - Coding Workspaces      | | Ryvix: "I have drafted the changes and built an     | |
| - Telemetry & Logs       | | isolated preview. View diff and preview below."     | |
| - Security Alerts        | +-----------------------------------------------------+ |
| - Audit Trail            | | INTERACTIVE DIFF & PREVIEW PANEL                     | |
|                          | | [Unified Diff] | [Live Preview (iframe)]            | |
|                          | |                                                     | |
|                          | | <div class="badge bg-purple-600 animate-pulse">     | |
|                          | |                                                     | |
|                          | | [ Approve & Deploy ]      [ Request Modifications ] | |
|                          | +-----------------------------------------------------+ |
+--------------------------+---------------------------------------------------------+
```

---

## 2. Key Web Chat Components

1. **Streaming Markdown & Thought Traces**: Real-time token streaming using Supabase Realtime / Server-Sent Events, showing the AI's reasoning steps, inspected files, and compiler output.
2. **Side-by-Side Unified Diff Viewer**: Syntax-highlighted view showing exact additions (`+`) and deletions (`-`) across modified files.
3. **Sandboxed Iframe Preview**: Live interactive rendering of the frontend application running from the ephemeral workspace.
4. **Approval Cards**: Modal action triggers requiring authenticated clicks before high-tier actions are executed.
5. **Real-Time Telemetry Gauges**: Live sparklines displaying CPU, Memory, and Network rates alongside active chat threads.


---

## 3. Cognitive Integration & Flow

The Web Chat Console directly interfaces with the unified AI pipeline:
1. **Natural Language Understanding**: Users can submit vague or high-level prompts (e.g. *"make my website look better"*). The requirement understanding layer refines this into an architectural specification.
2. **Ambiguity Clarification Dialogs**: If a request cannot be safely diagnosed, the chat displays clarification guidance before any plan is formed.
3. **Live Streaming**: Dual-process cognition (System 1 subconscious reflex + System 2 Tree-of-Thoughts) streams tokens directly via SSE.
4. **Interactive Preview Tab**: Embedded `<iframe>` connects directly to the container's dynamic port (3100-3999) with Desktop, Tablet, and Mobile viewport toggles.
5. **Action Approval Cards**: Destructive commands, code modifications, or repository pushes require authenticated user clicks before backend execution proceeds.

---

## 4. Mem0 Cognitive Memory Integration in Web Chat

The Web Chat Console (`/chat` via `/api/chat`) is directly connected to the Mem0 Cognitive Memory Architecture:

1. **Short-Term Session Working Buffer**:
   - Every user message and assistant completion is recorded in `ShortTermMemoryManager` keyed by `conversationId`.
   - Maintains continuous multi-turn dialogue context across the session without unbounded context-window growth.
2. **Real-Time Thought Stream Memory Trace**:
   - The SSE stream emits an `Event B0: Mem0 3-Tier Cognitive Memory Recall Stream` thought item directly into the thought drawer:
     ```json
     {
       "type": "thought",
       "data": {
         "type": "memory",
         "label": "Mem0 Cognitive Architecture (3-Tier Memory Recall)",
         "content": "Recalled 4 active session turns, 3 long-term facts, and 2 semantic associations.",
         "latencyMs": 0.18
       }
     }
     ```
3. **Continuous Background Learning**:
   - Whenever a user expresses a preference (*"I prefer Next.js and Vanilla CSS"*) or defines infrastructure (*"Our database is PostgreSQL on port 5432"*), `LongTermMemoryManager` heuristically extracts and persists the fact to disk.
   - Finished chat conversations are periodically distilled into dense 64-D vectors via `CognitiveMemoryEngine.distillSession()`.
