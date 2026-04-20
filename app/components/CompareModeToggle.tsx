import { useState } from "react";
import { useJsonCompare } from "~/hooks/useJsonCompare";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowPathIcon, XIcon, UploadIcon } from "@heroicons/react/outline";
import { CodeEditor } from "~/components/CodeEditor";
import { Body } from "./Primitives/Body";
import { SmallTitle } from "./Primitives/SmallTitle";
import { ToolTip } from "./ToolTip";
import { useJsonDoc } from "~/hooks/useJsonDoc";
import { ShortcutIcon } from "./Icons/ShortcutIcon";

export function CompareModeToggle() {
  const { compareMode, setCompareMode, setCompareJson } = useJsonCompare();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [compareJsonText, setCompareJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const { doc } = useJsonDoc();

  const handleEnableCompare = () => {
    setDialogOpen(true);
  };

  const handleDisableCompare = () => {
    setCompareMode(false);
    setCompareJson(null);
  };

  const handleApplyCompare = () => {
    try {
      const parsed = JSON.parse(compareJsonText);
      setCompareJson(parsed);
      setCompareMode(true);
      setDialogOpen(false);
      setParseError(null);
    } catch (e) {
      setParseError("Invalid JSON format. Please check your input.");
    }
  };

  const handleLoadSample = () => {
    setCompareJsonText(`{
  "name": "Modified User",
  "age": 31,
  "email": "newemail@example.com",
  "isActive": true,
  "address": {
    "city": "San Francisco",
    "zipCode": "94103"
  },
  "hobbies": ["reading", "coding", "traveling"]
}`);
    setParseError(null);
  };

  return (
    <>
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <button
          onClick={compareMode ? handleDisableCompare : handleEnableCompare}
          className={`relative w-10 h-10 mb-1 rounded-sm cursor-pointer transition flex items-center justify-center ${
            compareMode
              ? "text-white bg-lime-600"
              : "text-slate-700 hover:bg-slate-300 dark:text-white dark:hover:bg-slate-700"
          }`}
        >
          <ToolTip arrow="left">
            <Body>{compareMode ? "Exit Compare Mode" : "Compare Mode"}</Body>
            <ShortcutIcon className="w-[26px] h-[26px] ml-1 text-slate-700 bg-slate-200 dark:text-slate-300 dark:bg-slate-800">
              ⌥
            </ShortcutIcon>
            <ShortcutIcon className="w-[26px] h-[26px] ml-1 text-slate-700 bg-slate-200 dark:text-slate-300 dark:bg-slate-800">
              4
            </ShortcutIcon>
          </ToolTip>
          <ArrowPathIcon className="p-2 w-full h-full" />
        </button>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-4/5 bg-white dark:bg-slate-800 rounded-lg shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <Dialog.Title>
                <SmallTitle>Compare with Another JSON</SmallTitle>
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                <XIcon className="w-5 h-5 text-slate-500" />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between">
                <Body className="text-slate-600 dark:text-slate-400">
                  Paste the JSON you want to compare with the current document:
                </Body>
                <button
                  onClick={handleLoadSample}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-300 transition"
                >
                  <UploadIcon className="w-4 h-4" />
                  Load Sample
                </button>
              </div>

              <div className="h-80 border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <CodeEditor
                  value={compareJsonText}
                  onChange={(val) => {
                    setCompareJsonText(val);
                    setParseError(null);
                  }}
                />
              </div>

              {parseError && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
                  {parseError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
              <Dialog.Close className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleApplyCompare}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                Start Compare
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
