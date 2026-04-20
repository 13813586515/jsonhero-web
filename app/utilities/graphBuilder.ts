export interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: "object" | "array" | "primitive";
  value?: unknown;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "id-reference" | "contains" | "array-item";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface IdReference {
  path: string;
  idValue: string | number;
  fieldName: string;
}

const ID_FIELD_PATTERNS = [
  /^id$/,
  /^userId$/,
  /^user_id$/,
  /^postId$/,
  /^post_id$/,
  /^commentId$/,
  /^comment_id$/,
  /^authorId$/,
  /^author_id$/,
  /^parentId$/,
  /^parent_id$/,
  /^categoryId$/,
  /^category_id$/,
  /^productId$/,
  /^product_id$/,
  /^orderId$/,
  /^order_id$/,
  /^createdById$/,
  /^created_by_id$/,
  /^updatedById$/,
  /^updated_by_id$/,
  /^ownerId$/,
  /^owner_id$/,
  /^managerId$/,
  /^manager_id$/,
  /^employeeId$/,
  /^employee_id$/,
  /^departmentId$/,
  /^department_id$/,
  /^projectId$/,
  /^project_id$/,
  /^taskId$/,
  /^task_id$/,
  /^assigneeId$/,
  /^assignee_id$/,
  /^reporterId$/,
  /^reporter_id$/,
];

function isIdField(fieldName: string): boolean {
  return ID_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function isLikelyIdValue(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      value.length > 0 &&
      (value.length <= 36 ||
        /^[a-f0-9-]{36}$/i.test(value) ||
        /^\d+$/.test(value) ||
        /^[a-zA-Z0-9_-]+$/.test(value))
    );
  }
  if (typeof value === "number") {
    return Number.isInteger(value);
  }
  return false;
}

function extractIdReferences(
  obj: unknown,
  path: string = "$",
  references: IdReference[] = []
): IdReference[] {
  if (obj === null || obj === undefined) {
    return references;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractIdReferences(item, `${path}[${index}]`, references);
    });
    return references;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;

      if (isIdField(key) && isLikelyIdValue(value)) {
        references.push({
          path: currentPath,
          idValue: value as string | number,
          fieldName: key,
        });
      }

      extractIdReferences(value, currentPath, references);
    }
  }

  return references;
}

function getAllNodes(
  obj: unknown,
  path: string = "$",
  nodes: GraphNode[] = []
): GraphNode[] {
  if (obj === null || obj === undefined) {
    return nodes;
  }

  if (Array.isArray(obj)) {
    nodes.push({
      id: path,
      label: path,
      path: path,
      type: "array",
    });

    obj.forEach((item, index) => {
      getAllNodes(item, `${path}[${index}]`, nodes);
    });
    return nodes;
  }

  if (typeof obj === "object") {
    nodes.push({
      id: path,
      label: generateObjectLabel(obj, path),
      path: path,
      type: "object",
    });

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== "object" || value === null) {
        nodes.push({
          id: `${path}.${key}`,
          label: `${key}: ${JSON.stringify(value)}`,
          path: `${path}.${key}`,
          type: "primitive",
          value,
        });
      } else {
        getAllNodes(value, `${path}.${key}`, nodes);
      }
    }
    return nodes;
  }

  nodes.push({
    id: path,
    label: `${path}: ${JSON.stringify(obj)}`,
    path: path,
    type: "primitive",
    value: obj,
  });

  return nodes;
}

function generateObjectLabel(obj: Record<string, unknown>, path: string): string {
  if (obj.id !== undefined) {
    if (obj.name !== undefined) {
      return `${obj.name} (id: ${obj.id})`;
    }
    return `${path} (id: ${obj.id})`;
  }
  if (obj.name !== undefined) {
    return String(obj.name);
  }
  if (obj.title !== undefined) {
    return String(obj.title);
  }
  return path;
}

function findIdTarget(
  references: IdReference[],
  nodes: GraphNode[],
  ref: IdReference
): GraphNode | null {
  const idStr = String(ref.idValue);

  for (const node of nodes) {
    if (node.type === "object") {
      const idField = nodes.find(
        (n) => n.path === `${node.path}.id` && String(n.value) === idStr
      );
      if (idField) {
        return node;
      }
    }
  }

  return null;
}

export function buildGraphData(json: unknown): GraphData {
  const references = extractIdReferences(json);
  const allNodes = getAllNodes(json);

  const objectNodes = allNodes.filter((n) => n.type === "object" || n.type === "array");

  const edges: GraphEdge[] = [];
  const nodeIdSet = new Set<string>();
  const importantNodes = new Set<string>();

  for (const ref of references) {
    const targetNode = findIdTarget(references, allNodes, ref);
    if (targetNode) {
      const sourcePath = ref.path.split(".").slice(0, -1).join(".") || "$";
      const sourceNode = objectNodes.find((n) => n.path === sourcePath);

      if (sourceNode && sourceNode.id !== targetNode.id) {
        edges.push({
          id: `${sourceNode.id}->${targetNode.id}:${ref.fieldName}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: ref.fieldName,
          type: "id-reference",
        });
        importantNodes.add(sourceNode.id);
        importantNodes.add(targetNode.id);
      }
    }
  }

  for (const node of objectNodes) {
    if (node.path === "$") continue;

    const parentPath = getParentPath(node.path);
    if (parentPath) {
      const parentNode = objectNodes.find((n) => n.path === parentPath);
      if (parentNode) {
        const isArrayItem = /\[\d+\]$/.test(node.path);
        edges.push({
          id: `${parentNode.id}->${node.id}:contains`,
          source: parentNode.id,
          target: node.id,
          label: isArrayItem ? "item" : "contains",
          type: isArrayItem ? "array-item" : "contains",
        });
        importantNodes.add(parentNode.id);
        importantNodes.add(node.id);
      }
    }
  }

  const filteredNodes = objectNodes.filter((n) => importantNodes.has(n.id));
  if (filteredNodes.length === 0) {
    filteredNodes.push(...objectNodes.slice(0, 10));
  }

  return {
    nodes: filteredNodes,
    edges,
  };
}

function getParentPath(path: string): string | null {
  if (path === "$") return null;

  const arrayMatch = path.match(/^(.*)\[\d+\]$/);
  if (arrayMatch) {
    return arrayMatch[1] || "$";
  }

  const dotMatch = path.match(/^(.*)\.[^.]+$/);
  if (dotMatch) {
    return dotMatch[1] || "$";
  }

  return "$";
}

export function calculateLayout(
  graph: GraphData,
  width: number,
  height: number
): GraphData {
  const nodeCount = graph.nodes.length;
  if (nodeCount === 0) return graph;

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, { ...n }]));
  const edgeMap = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, []);
    }
    edgeMap.get(edge.source)!.push(edge.target);

    if (!edgeMap.has(edge.target)) {
      edgeMap.set(edge.target, []);
    }
    edgeMap.get(edge.target)!.push(edge.source);
  }

  const levels: string[][] = [];
  const visited = new Set<string>();
  const rootNode = graph.nodes.find((n) => n.path === "$") || graph.nodes[0];

  const queue: { id: string; level: number }[] = [{ id: rootNode.id, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    if (!levels[level]) {
      levels[level] = [];
    }
    levels[level].push(id);

    const neighbors = edgeMap.get(id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, level: level + 1 });
      }
    }
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      levels.push([node.id]);
    }
  }

  const levelCount = levels.length;
  const levelHeight = height / Math.max(levelCount, 1);

  for (let i = 0; i < levels.length; i++) {
    const levelNodes = levels[i];
    const nodeWidth = width / Math.max(levelNodes.length, 1);

    for (let j = 0; j < levelNodes.length; j++) {
      const nodeId = levelNodes[j];
      const node = nodeMap.get(nodeId);
      if (node) {
        node.x = nodeWidth * (j + 0.5);
        node.y = levelHeight * (i + 0.5);
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: graph.edges,
  };
}
