// frontend/src/components/ProgressChart.tsx

import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ChartProps {
  studentId: number;
  refreshTrigger?: number;
}

export default function ProgressChart({ studentId, refreshTrigger = 0 }: ChartProps) {
  const [subjects, setSubjects] = useState<string[]>(["全体"]);
  const [selectedSubject, setSelectedSubject] = useState("全体");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 科目一覧取得
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/charts/subjects/${studentId}`);
        if (res.data && res.data.length > 0) {
          const newSubjects = Array.from(new Set(["全体", ...res.data]));
          setSubjects(newSubjects);
        }
      } catch (error) {
        console.error("Failed to fetch subjects", error);
      }
    };
    if (studentId) fetchSubjects();
  }, [studentId]);

  // チャートデータ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/charts/progress/${studentId}`, {
          params: { subject: selectedSubject }
        });
        setChartData(res.data);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchData();
  }, [studentId, selectedSubject, refreshTrigger]);

  const safeChartData = chartData || [];

  // 🌟 1. ルートの順番を定義
  const levelOrder = ["基礎徹底", "日大", "MARCH", "早慶", "地方国公立", "難関国公立", "東大", "京大"];

  // 🌟 2. データをルート順にソートする
  const sortedData = [...safeChartData].sort((a, b) => {
    const aIndex = levelOrder.indexOf(a.level || "その他");
    const bIndex = levelOrder.indexOf(b.level || "その他");
    const aRank = aIndex === -1 ? 99 : aIndex; // 定義にないものは後ろへ
    const bRank = bIndex === -1 ? 99 : bIndex;
    return aRank - bRank;
  });

  // 🌟 3. ソート済みのデータでグラフを生成
  const plotData: any[] = sortedData.map((item: any) => ({
    x: [item.completed, item.total],
    y: ["達成", "予定"],
    name: item.name,
    type: 'bar',
    orientation: 'h',
    hoverinfo: 'name+x',
  }));

  const shapes: any[] = [];
  const annotations: any[] = [];

  if (selectedSubject !== "全体") {
    const levelTotals: Record<string, number> = {};
    sortedData.forEach((item: any) => {
      const lvl = item.level || "その他";
      levelTotals[lvl] = (levelTotals[lvl] || 0) + (item.total || 0);
    });

    Object.keys(levelTotals).forEach(lvl => {
      if (!levelOrder.includes(lvl) && lvl !== "その他") levelOrder.push(lvl);
    });

    let currentX = 0;
    levelOrder.forEach((lvl) => {
      if (levelTotals[lvl] && levelTotals[lvl] > 0) {
        currentX += levelTotals[lvl];

        // 縦線を描画
        shapes.push({
          type: 'line',
          x0: currentX, x1: currentX,
          y0: -0.5, y1: 1.5,
          line: { color: '#ef4444', width: 2, dash: 'dot' }
        });

        // 縦線の上にレベル名を表示
        annotations.push({
          x: currentX,
          y: 1.55,
          text: lvl,
          showarrow: false,
          font: { color: '#ef4444', size: 11, weight: 'bold' }
        });
      }
    });
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">学習進捗グラフ</CardTitle>
          <div className="flex space-x-1 overflow-x-auto max-w-[70%] scrollbar-hide">
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap border ${selectedSubject === subj
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "bg-white text-muted-foreground border-transparent hover:bg-gray-100"
                  }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            読み込み中...
          </div>
        ) : (!chartData || chartData.length === 0) ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            データがありません
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px]">
            <Plot
              data={plotData}
              layout={{
                barmode: 'stack',
                autosize: true,
                margin: { l: 50, r: 20, t: 30, b: 30 },
                showlegend: false,
                xaxis: {
                  automargin: true,
                  zeroline: true,
                  title: { text: "時間 (h)", font: { size: 11, color: "gray" } }
                },
                yaxis: {
                  automargin: true,
                },
                shapes: shapes,
                annotations: annotations,
                colorway: [
                  '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
                  '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52'
                ]
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}