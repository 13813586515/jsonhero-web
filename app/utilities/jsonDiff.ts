export type DiffType = "added" | "removed" | "modified" | "unchanged";

export interface DiffResult {
  path: string;
  type: DiffType;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DeepDiffResult {
  [key: string]: {
    type: DiffType;
    oldValue?: unknown;
    newValue?: unknown;
    children?: DeepDiffResult;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function deepDiff(
  oldObj: unknown,
  newObj: unknown,
  path: string = "$"
): DeepDiffResult {
  const result: DeepDiffResult = {};

  if (oldObj === undefined && newObj !== undefined) {
    result[path] = { type: "added", newValue: newObj };
    return result;
  }

  if (oldObj !== undefined && newObj === undefined) {
    result[path] = { type: "removed", oldValue: oldObj };
    return result;
  }

  if (JSON.stringify(oldObj) === JSON.stringify(newObj)) {
    result[path] = { type: "unchanged", oldValue: oldObj, newValue: newObj };
    return result;
  }

  if (isObject(oldObj) && isObject(newObj)) {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const children: DeepDiffResult = {};

    for (const key of allKeys) {
      const childPath = `${path}.${key}`;
      const childDiff = deepDiff(oldObj[key], newObj[key], childPath);
      Object.assign(children, childDiff);
    }

    const hasChanges = Object.values(children).some((c) => c.type !== "unchanged");
    result[path] = {
      type: hasChanges ? "modified" : "unchanged",
      oldValue: oldObj,
      newValue: newObj,
      children,
    };
  } else if (isArray(oldObj) && isArray(newObj)) {
    const maxLength = Math.max(oldObj.length, newObj.length);
    const children: DeepDiffResult = {};

    for (let i = 0; i < maxLength; i++) {
      const childPath = `${path}[${i}]`;
      const childDiff = deepDiff(oldObj[i], newObj[i], childPath);
      Object.assign(children, childDiff);
    }

    const hasChanges = Object.values(children).some((c) => c.type !== "unchanged");
    result[path] = {
      type: hasChanges ? "modified" : "unchanged",
      oldValue: oldObj,
      newValue: newObj,
      children,
    };
  } else {
    result[path] = {
      type: "modified",
      oldValue: oldObj,
      newValue: newObj,
    };
  }

  return result;
}

export function flattenDiff(diff: DeepDiffResult): DiffResult[] {
  const results: DiffResult[] = [];

  function traverse(current: DeepDiffResult) {
    for (const [path, value] of Object.entries(current)) {
      if (value.type !== "unchanged") {
        results.push({
          path,
          type: value.type,
          oldValue: value.oldValue,
          newValue: value.newValue,
        });
      }
      if (value.children) {
        traverse(value.children);
      }
    }
  }

  traverse(diff);
  return results;
}

export function getDiffAtPath(
  diff: DeepDiffResult,
  path: string
): { type: DiffType; oldValue?: unknown; newValue?: unknown } | null {
  function traverse(
    current: DeepDiffResult
  ): { type: DiffType; oldValue?: unknown; newValue?: unknown } | null {
    if (current[path]) {
      return {
        type: current[path].type,
        oldValue: current[path].oldValue,
        newValue: current[path].newValue,
      };
    }

    for (const key in current) {
      if (current[key].children) {
        const result = traverse(current[key].children!);
        if (result) return result;
      }
    }

    return null;
  }

  return traverse(diff);
}

export function hasDifferences(diff: DeepDiffResult): boolean {
  function traverse(current: DeepDiffResult): boolean {
    for (const key in current) {
      if (current[key].type !== "unchanged") return true;
      if (current[key].children && traverse(current[key].children)) return true;
    }
    return false;
  }
  return traverse(diff);
}
