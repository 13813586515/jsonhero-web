import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";
import { DeepDiffResult, deepDiff, flattenDiff, DiffResult } from "~/utilities/jsonDiff";
import { useJson } from "~/hooks/useJson";

type JsonCompareContextType = {
  compareMode: boolean;
  setCompareMode: Dispatch<SetStateAction<boolean>>;
  compareJson: unknown;
  setCompareJson: Dispatch<SetStateAction<unknown>>;
  diff: DeepDiffResult | null;
  flatDiff: DiffResult[];
  hasDifferences: boolean;
};

const JsonCompareContext = createContext<JsonCompareContextType | undefined>(undefined);

export function JsonCompareProvider({ children }: { children: ReactNode }) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareJson, setCompareJson] = useState<unknown>(null);
  const [baseJson] = useJson();

  const diff = useMemo(() => {
    if (!compareMode || !compareJson || !baseJson) return null;
    return deepDiff(baseJson, compareJson);
  }, [compareMode, compareJson, baseJson]);

  const flatDiff = useMemo(() => {
    if (!diff) return [];
    return flattenDiff(diff);
  }, [diff]);

  const hasDifferences = useMemo(() => {
    if (!diff) return false;
    return flatDiff.length > 0;
  }, [diff, flatDiff]);

  return (
    <JsonCompareContext.Provider
      value={{
        compareMode,
        setCompareMode,
        compareJson,
        setCompareJson,
        diff,
        flatDiff,
        hasDifferences,
      }}
    >
      {children}
    </JsonCompareContext.Provider>
  );
}

export function useJsonCompare(): JsonCompareContextType {
  const context = useContext(JsonCompareContext);
  invariant(context, "useJsonCompare must be used within a JsonCompareProvider");
  return context;
}
