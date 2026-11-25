import type { Project, UserAccount } from '../types/devsync';

export const DEMO_USER: UserAccount = {
  id: 'usr-om',
  name: 'Om Upadhyay',
  email: 'om.upadhyay@devsync.dev',
  initials: 'OU',
};

export function createSeedProjects(): Project[] {
  return [
    {
      id: 'proj-algolab',
      name: 'AlgoLab',
      ownerId: DEMO_USER.id,
      ownerName: DEMO_USER.name,
      currentUserRole: 'owner',
      updatedAt: '2026-11-25T12:10:00.000Z',
      lastOpenedAt: '2026-11-25T12:25:00.000Z',
      collaborators: [
        {
          id: DEMO_USER.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          initials: DEMO_USER.initials,
          role: 'owner',
          online: true,
          cursorColor: '#F4F4F6',
        },
        {
          id: 'usr-aarav',
          name: 'Aarav Mehta',
          email: 'aarav.mehta@devsync.dev',
          initials: 'AM',
          role: 'edit',
          online: true,
          cursorColor: '#5E5CE6',
        },
        {
          id: 'usr-maya',
          name: 'Maya Lin',
          email: 'maya.lin@devsync.dev',
          initials: 'ML',
          role: 'edit',
          online: true,
          cursorColor: '#14B8A6',
        },
        {
          id: 'usr-rohan',
          name: 'Rohan Kapoor',
          email: 'rohan.k@devsync.dev',
          initials: 'RK',
          role: 'view',
          online: false,
          cursorColor: '#F59E0B',
        },
      ],
      nodes: [
        {
          id: 'folder-graphs',
          name: 'graphs',
          type: 'folder',
          parentId: null,
          updatedAt: '2026-11-25T11:30:00.000Z',
        },
        {
          id: 'file-bfs-cpp',
          name: 'bfs.cpp',
          type: 'file',
          parentId: 'folder-graphs',
          language: 'cpp',
          updatedAt: '2026-11-25T12:08:00.000Z',
          content: `// Shortest-hop Breadth-First Search on an unweighted graph
#include <iostream>
#include <vector>
#include <queue>

int bfs_shortest_hops(const std::vector<std::vector<int>>& adj, int src, int dst) {
  std::vector<int> dist(adj.size(), -1);
  std::queue<int> q;
  dist[src] = 0;
  q.push(src);

  while (!q.empty()) {
    int node = q.front();
    q.pop();
    if (node == dst) return dist[node];
    for (int next : adj[node]) {
      if (dist[next] == -1) {
        dist[next] = dist[node] + 1;
        q.push(next);
      }
    }
  }
  return -1;
}

int main() {
  std::vector<std::vector<int>> adj = {
    {1, 2}, {0, 3, 4}, {0, 4}, {1, 5}, {1, 2, 5}, {3, 4}
  };
  int hops = bfs_shortest_hops(adj, 0, 5);
  std::cout << "Hop distance 0 -> 5: " << hops << " hops" << std::endl;
  return 0;
}
`,
        },
        {
          id: 'file-solver-py',
          name: 'solver.py',
          type: 'file',
          parentId: null,
          language: 'python',
          updatedAt: '2026-11-25T12:10:00.000Z',
          content: `# Weighted shortest-path solver (Dijkstra)
import heapq

def dijkstra_shortest_path(weighted_graph, start):
    distances = {node: float("inf") for node in weighted_graph}
    distances[start] = 0
    heap = [(0, start)]

    while heap:
        current_cost, node = heapq.heappop(heap)
        if current_cost > distances[node]:
            continue
        for neighbor, weight in weighted_graph[node]:
            next_cost = current_cost + weight
            if next_cost < distances[neighbor]:
                distances[neighbor] = next_cost
                heapq.heappush(heap, (next_cost, neighbor))

    return distances

graph = {
    "A": [("B", 4), ("C", 2)],
    "B": [("D", 5), ("E", 4)],
    "C": [("B", 1), ("E", 8)],
    "D": [("F", 2)],
    "E": [("F", 3)],
    "F": []
}

result = dijkstra_shortest_path(graph, "A")
print(f"Shortest path A -> F: {result['F']}")
`,
        },
        {
          id: 'file-utils-js',
          name: 'utils.js',
          type: 'file',
          parentId: null,
          language: 'javascript',
          updatedAt: '2026-11-25T12:04:00.000Z',
          content: `// Benchmark & latency formatting helpers for AlgoLab
const samplesMs = [0.42, 0.39, 0.51, 0.44, 0.37, 0.48];

function computeStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((acc, n) => acc + n, 0) / values.length;
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    count: values.length,
    meanMs: Number(mean.toFixed(3)),
    p95Ms: sorted[p95Index],
  };
}

const summary = computeStats(samplesMs);
console.log("AlgoLab Benchmark Summary:", summary);
console.log("Throughput estimate:", Math.round(1000 / summary.meanMs), "runs/sec");
`,
        },
        {
          id: 'folder-tests',
          name: 'tests',
          type: 'folder',
          parentId: null,
          updatedAt: '2026-11-25T11:20:00.000Z',
        },
        {
          id: 'file-verify-js',
          name: 'verify.js',
          type: 'file',
          parentId: 'folder-tests',
          language: 'javascript',
          updatedAt: '2026-11-25T11:55:00.000Z',
          content: `// Quick smoke assertions for path weights
const expectedCost = 11;
const computedEdges = [2, 1, 5, 3];
const total = computedEdges.reduce((sum, w) => sum + w, 0);

if (total !== expectedCost) {
  console.error("Assertion failed: expected", expectedCost, "got", total);
} else {
  console.log("PASS: Shortest-path weight verified =", total);
}
`,
        },
      ],
      executions: [
        {
          id: 'exec-seed-1',
          projectId: 'proj-algolab',
          fileId: 'file-bfs-cpp',
          fileName: 'graphs/bfs.cpp',
          language: 'cpp',
          runtime: 'g++ 13.2 (C++20)',
          status: 'success',
          stdout:
            'Compiling bfs.cpp with -O2 -std=c++20 ... OK\nBFS Traversal Order from Node 0: 0 1 2 3 4 5\nHop distance 0 -> 5: 3 hops\nVisited 6/6 vertices in 0.04ms',
          stderr: '',
          durationMs: 64,
          timestamp: '2026-11-25T12:08:12.000Z',
        },
        {
          id: 'exec-seed-2',
          projectId: 'proj-algolab',
          fileId: 'file-solver-py',
          fileName: 'solver.py',
          language: 'python',
          runtime: 'Python 3.12.4',
          status: 'success',
          stdout:
            'Graph nodes: 6 | Edges: 8\nOptimal path A -> F: A -> C -> B -> E -> F (cost 11)',
          stderr: '',
          durationMs: 31,
          timestamp: '2026-11-25T11:52:40.000Z',
        },
      ],
    },
    {
      id: 'proj-polyglot-web',
      name: 'PulseUI Kit',
      ownerId: DEMO_USER.id,
      ownerName: DEMO_USER.name,
      currentUserRole: 'owner',
      updatedAt: '2026-11-25T09:45:00.000Z',
      lastOpenedAt: '2026-11-25T10:15:00.000Z',
      collaborators: [
        {
          id: DEMO_USER.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          initials: DEMO_USER.initials,
          role: 'owner',
          online: true,
          cursorColor: '#F4F4F6',
        },
        {
          id: 'usr-maya',
          name: 'Maya Lin',
          email: 'maya.lin@devsync.dev',
          initials: 'ML',
          role: 'edit',
          online: true,
          cursorColor: '#14B8A6',
        },
      ],
      nodes: [
        {
          id: 'file-index-html',
          name: 'index.html',
          type: 'file',
          parentId: null,
          language: 'html',
          updatedAt: '2026-11-25T09:40:00.000Z',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PulseUI Design Tokens</title>
    <link rel="stylesheet" href="tokens.css" />
  </head>
  <body>
    <main class="shell">
      <h1>Minimalist Component Primitives</h1>
      <button id="syncBtn">Trigger Sync</button>
    </main>
    <script src="controller.js"></script>
  </body>
</html>
`,
        },
        {
          id: 'file-tokens-css',
          name: 'tokens.css',
          type: 'file',
          parentId: null,
          language: 'css',
          updatedAt: '2026-11-25T09:42:00.000Z',
          content: `/* Core dark surface scale */
:root {
  --bg-obsidian: #050507;
  --bg-elevated: #111116;
  --accent-indigo: #5e5ce6;
}

.shell {
  display: grid;
  gap: 16px;
  padding: 24px;
  background-color: #050507;
  color: #f4f4f6;
}
`,
        },
        {
          id: 'file-controller-js',
          name: 'controller.js',
          type: 'file',
          parentId: null,
          language: 'javascript',
          updatedAt: '2026-11-25T09:45:00.000Z',
          content: `// Interactive state machine for token export
const tokens = {
  canvas: "#050507",
  surface: "#0B0B0F",
  accent: "#5E5CE6",
};

function serializeCssVariables(map) {
  return Object.entries(map)
    .map(([key, value]) => \`  --ds-\${key}: \${value};\`)
    .join("\\n");
}

console.log(":root {\\n" + serializeCssVariables(tokens) + "\\n}");
`,
        },
      ],
      executions: [
        {
          id: 'exec-seed-3',
          projectId: 'proj-polyglot-web',
          fileId: 'file-controller-js',
          fileName: 'controller.js',
          language: 'javascript',
          runtime: 'Node.js v22.14',
          status: 'success',
          stdout: ':root {\n  --ds-canvas: #050507;\n  --ds-surface: #0B0B0F;\n  --ds-accent: #5E5CE6;\n}',
          stderr: '',
          durationMs: 12,
          timestamp: '2026-11-25T09:46:02.000Z',
        },
      ],
    },
    {
      id: 'proj-distributed-cache',
      name: 'DistributedCache',
      ownerId: 'usr-aarav',
      ownerName: 'Aarav Mehta',
      currentUserRole: 'editor',
      updatedAt: '2026-11-24T18:20:00.000Z',
      lastOpenedAt: '2026-11-24T19:05:00.000Z',
      collaborators: [
        {
          id: 'usr-aarav',
          name: 'Aarav Mehta',
          email: 'aarav.mehta@devsync.dev',
          initials: 'AM',
          role: 'owner',
          online: true,
          cursorColor: '#5E5CE6',
        },
        {
          id: DEMO_USER.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          initials: DEMO_USER.initials,
          role: 'edit',
          online: true,
          cursorColor: '#F4F4F6',
        },
        {
          id: 'usr-maya',
          name: 'Maya Lin',
          email: 'maya.lin@devsync.dev',
          initials: 'ML',
          role: 'view',
          online: false,
          cursorColor: '#14B8A6',
        },
      ],
      nodes: [
        {
          id: 'file-cache-java',
          name: 'CacheNode.java',
          type: 'file',
          parentId: null,
          language: 'java',
          updatedAt: '2026-11-24T18:15:00.000Z',
          content: `// In-memory LRU Cache Node implementation
import java.util.LinkedHashMap;

public class CacheNode {
  private final int capacity;
  private final LinkedHashMap<String, String> store;

  public CacheNode(int capacity) {
    this.capacity = capacity;
    this.store = new LinkedHashMap<>(capacity, 0.75f, true);
  }

  public void put(String key, String value) {
    if (store.size() >= capacity && !store.containsKey(key)) {
      String oldest = store.keySet().iterator().next();
      store.remove(oldest); // evict LRU entry
    }
    store.put(key, value);
  }

  public static void main(String[] args) {
    CacheNode LRUCacheNode = new CacheNode(3);
    LRUCacheNode.put("session:1", "active_user_42");
    System.out.println("Cache node initialized");
  }
}
`,
        },
        {
          id: 'file-ring-py',
          name: 'ring_hash.py',
          type: 'file',
          parentId: null,
          language: 'python',
          updatedAt: '2026-11-24T18:18:00.000Z',
          content: `# Consistent hash ring partitioning
import hashlib

class ConsistentHashRing:
    def __init__(self, nodes, replicas=32):
        self.ring = {}
        for node in nodes:
            for i in range(replicas):
                digest = hashlib.md5(f"{node}:{i}".encode()).hexdigest()
                self.ring[int(digest, 16)] = node
        self.sorted_keys = sorted(self.ring.keys())

    def get_node(self, key):
        key_hash = int(hashlib.md5(key.encode()).hexdigest(), 16)
        for ring_key in self.sorted_keys:
            if key_hash <= ring_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]

ring = ConsistentHashRing(["cache-us-east-1", "cache-eu-west-1", "cache-ap-south-1"])
print(f"session:4812 -> {ring.get_node('session:4812')}")
`,
        },
        {
          id: 'file-bench-cpp',
          name: 'bench.cpp',
          type: 'file',
          parentId: null,
          language: 'cpp',
          updatedAt: '2026-11-24T18:20:00.000Z',
          content: `// Throughput micro-benchmark for key lookup
#include <iostream>

void benchmark_lookups(int iterations) {
  std::cout << "Benchmarking " << iterations << " lookups" << std::endl;
}

int main() {
  benchmark_lookups(250000);
  return 0;
}
`,
        },
      ],
      executions: [],
    },
  ];
}
