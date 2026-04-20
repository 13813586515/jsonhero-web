import { useJsonCompare } from "~/hooks/useJsonCompare";
import { getDiffAtPath } from "~/utilities/jsonDiff";
import { DiffType } from "~/utilities/jsonDiff";

export function useDiffHighlight(path: string): {
  diffType: DiffType | null;
  diffClass: string;
} {
  const { compareMode, diff } = useJsonCompare();

  if (!compareMode || !diff) {
    return { diffType: null, diffClass: "" };
  }

  const diffInfo = getDiffAtPath(diff, path);

  if (!diffInfo) {
    return { diffType: null, diffClass: "" };
  }

  const diffClasses: Record<DiffType, string> = {
    added: "bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500",
    removed: "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 line-through opacity-70",
    modified: "bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500",
    unchanged: "",
  };

  return {
    diffType: diffInfo.type,
    diffClass: diffClasses[diffInfo.type] || "",
  };
}

export function DiffBadge({ diffType }: { diffType: DiffType | null }) {
  if (!diffType || diffType === "unchanged") return null;

  const configs: Record<string, { label: string; className: string }> = {
    added: {
      label: "ADDED",
      className: "bg-green-500 text-white",
    },
    removed: {
      label: "REMOVED",
      className: "bg-red-500 text-white",
    },
    modified: {
      label: "MODIFIED",
      className: "bg-yellow-500 text-slate-900",
    },
  };

  const config = configs[diffType];
  if (!config) return null;

  return (
    <span
      className={`ml-2 px-1.5 py-0.5 text-xs font-bold rounded ${config.className}`}
    >
      {config.label}
    </span>
  );
}
