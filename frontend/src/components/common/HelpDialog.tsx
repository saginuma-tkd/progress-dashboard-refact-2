// HelpDialog.tsx
// 全ページ・ダイアログで共通して使えるヘルプダイアログコンポーネント
//
// 使い方:
//   import HelpDialog from "../../components/common/HelpDialog";
//   import { helpDashboard } from "../../help/helpDashboard";
//
//   <HelpDialog content={helpDashboard} />
//
// ボタンのみ表示され、クリックでダイアログが開く。
// 各ページ・ダイアログのヘッダー付近に配置してください。

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { HelpCircle } from "lucide-react";
import type { HelpContent } from "../help/helpDashboard";

type Props = {
  content: HelpContent;
  /** ボタンの表示テキスト。省略時は「使い方」 */
  label?: string;
  /** ボタンのサイズ。省略時は "sm" */
  size?: "sm" | "default" | "lg" | "icon";
};

const HelpDialog: React.FC<Props> = ({ content, label = "使い方", size = "sm" }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground gap-1"
        aria-label={`${content.pageTitle}を開く`}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
              {content.pageTitle}
            </DialogTitle>
          </DialogHeader>

          {/* 概要 */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content.description}
          </p>

          {/* セクション一覧 */}
          <div className="space-y-4 mt-2">
            {content.sections.map((section, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50/60">
                <h4 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  {section.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed pl-6">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDialog;
