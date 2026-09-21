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
