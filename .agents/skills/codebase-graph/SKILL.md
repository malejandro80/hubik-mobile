---
name: codebase-graph
description: >-
  Extracts and queries the codebase knowledge graph using Graphify. Maps dependencies, call hierarchies,
  god nodes, and architectural communities. Use when exploring a codebase, onboarding to a new project,
  or running /graphify.
argument-hint: "[path|query <question>]"
---

# Codebase Graph: Architectural Knowledge & Topology

This skill generates and maintains a persistent, navigable knowledge graph of the repository using **Graphify** and Tree-sitter AST extraction, enabling fast comprehension without context-window exhaustion.

## When to Use
- When first onboarding to or exploring this repository.
- When analyzing dependencies, circular references, or blast radius before refactoring.
- When querying relationships between components: `/graphify query "<question>"`.
- To detect architectural choke points ("god nodes") and export the visual Ontology Studio.

---

## Core Capabilities

1. **Persistent Architectural Memory**:
   - Stores topology in `.graphify/graph.json` so architecture survives across conversation sessions without re-reading every file.
2. **AST + Semantic Extraction**:
   - Deterministic structural extraction via Tree-sitter (Python, TypeScript, Go, Rust, Java, C++, etc.).
   - Semantic relationship extraction for cross-cutting concepts.
3. **God-Node & Coupling Detection**:
   - Automatically flags high-centrality nodes that create bottleneck risks.
4. **Interactive Ontology Studio**:
   - Generates a static, visual WebGL graph explorer in `.graphify/studio`.

---

## Command Reference

```bash
# Ingest current repository and build knowledge graph
/graphify

# Query codebase relationships using BFS/DFS graph traversal
/graphify query "How does authentication interact with user profiles?"

# Inspect blast radius of modifying a specific module
/graphify review-delta --files src/auth.ts --graph .graphify/graph.json

# Export visual static Ontology Studio
graphify studio export .graphify/studio
```

---

## Anti-Rationalization Table

| Common Agent Excuse | Why It Fails | Mandatory Response |
| :--- | :--- | :--- |
| *"I'll just read all 50 files into context to understand how this works."* | Consumes 40,000+ tokens, causes attention dilution, and forgets context next session. | Query the persistent graph in `.graphify/graph.json` or use targeted grep searches. |
| *"The graph is outdated, let me rebuild everything from scratch."* | Rebuilding without incremental cache wastes time and compute. | Run incremental update: `graphify update .` |

---

## Verification Criteria
- [ ] `.graphify/graph.json` contains valid nodes and edges.
- [ ] `GRAPH_REPORT.md` generated with detected communities and god-node warnings.
- [ ] Queries answered using structural graph evidence.
