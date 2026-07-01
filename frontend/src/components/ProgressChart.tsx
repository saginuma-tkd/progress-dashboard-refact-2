// frontend/src/components/ProgressChart.tsx

import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ChartProps {
  studentId: number;
  refreshTrigger?: number;
  onChartDataCalculated?: (subject: string, completedTime: number, plannedTime: number) => void;
}

interface RouteLevel {
  id: number;
  level_name: string;
  sequence_order: number;
  graph_line_type: string;
  show_on_graph: boolean;
}

export default function ProgressChart({ studentId, refreshTrigger = 0, onChartDataCalculated }: ChartProps) {
  const [subjects, setSubjects] = useState<string[]>(["全体"]);
  const [selectedSubject, setSelectedSubject] = useState("全体");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [routeLevels, setRouteLevels] = useState<RouteLevel[]>([]);
  const LINE_COLOR_MAP: Record<string, string> = {
    blue: '#3b82f6',    // Tailwindの blue-500
    red: '#ef4444',     // Tailwindの red-500
    green: '#22c55e',   // Tailwindの green-500
    orange: '#f97316',  // Tailwindの orange-500
    purple: '#a855f7',  // Tailwindの purple-500
    // 以下は過去のデータの互換性用
    standard: '#ef4444',
    advance: '#8b5cf6',
  };

  // 科目一覧取得
  // 🌟 1. 初期化時にテナントのルートレベル設定を取得
  useEffect(() => {
    const fetchRouteLevels = async () => {
      try {
        const res = await api.get('/tenant-config/route-levels');
        // sequence_order（順番）でソートしてStateに保存
        const sortedLevels = res.data.sort((a: RouteLevel, b: RouteLevel) => a.sequence_order - b.sequence_order);
        setRouteLevels(sortedLevels);
      } catch (error) {
        console.error("Failed to fetch route levels", error);
      }
    };
    fetchRouteLevels();
  }, []);

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

  useEffect(() => {
    if (!onChartDataCalculated || !chartData) return;

    // chartDataから時間を集計する
    let totalCompleted = 0;
    let totalPlanned = 0;
    chartData.forEach(item => {
      totalCompleted += Number(item.completed) || 0;
      totalPlanned += Number(item.total) || 0;
    });

    onChartDataCalculated(selectedSubject, totalCompleted, totalPlanned);
  }, [chartData, selectedSubject]);

  const safeChartData = chartData || [];

  // 🌟 2. DBから取得した設定を使って並び順（levelOrder配列）を作る
  // （もし取得前や空なら、最低限動くようにフォールバック配列を用意）
  const levelOrder = routeLevels.length > 0
    ? routeLevels.map(rl => rl.level_name)
    : ["基礎", "日大", "MARCH"]; // フォールバック

  // 🌟 3. データをルート順にソートする
  const sortedData = [...safeChartData].sort((a, b) => {
    const lvlA = a.level || "その他";
    const lvlB = b.level || "その他";
    const aIndex = levelOrder.findIndex(keyword => lvlA.includes(keyword));
    const bIndex = levelOrder.findIndex(keyword => lvlB.includes(keyword));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

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

    // 集計時に名前を統一する
    sortedData.forEach((item: any) => {
      const lvl = item.level || "その他";
      const matchedLevel = levelOrder.find(keyword => lvl.includes(keyword)) || "その他";
      levelTotals[matchedLevel] = (levelTotals[matchedLevel] || 0) + (item.total || 0);
    });

    let currentX = 0;

    // DBで設定したレベルの順番に沿ってループ
    routeLevels.forEach((rl) => {
      const lvl = rl.level_name;

      if (levelTotals[lvl] && levelTotals[lvl] > 0) {
        currentX += levelTotals[lvl];

        // 🌟 4. 線を引くかどうかはDBの show_on_graph フラグで判定！
        if (rl.show_on_graph) {

          // 線の種類（色や太さ）を graph_line_type で出し分けることも可能
          const isAdvance = rl.graph_line_type === 'advance';
          const lineColor = LINE_COLOR_MAP[rl.graph_line_type] || '#94a3b8';

          shapes.push({
            type: 'line',
            x0: currentX, x1: currentX,
            y0: -0.4, y1: 1.4,
            line: { color: lineColor, width: 2, dash: 'dot' }
          });

          annotations.push({
            x: currentX,
            y: 1.45,
            text: lvl,
            showarrow: false,
            font: { color: lineColor, size: 11, weight: 'bold' }
          });

          // ホバー用の透明なマーカー
          plotData.push({
            x: [currentX],
            y: ["予定"],
            type: 'scatter',
            mode: 'markers',
            marker: { size: 30, color: 'rgba(0,0,0,0)' },
            hoverinfo: 'text',
            hovertext: `🎯 ${lvl}まで: 合計 ${currentX.toFixed(1)} 時間`,
            hoverlabel: { bgcolor: lineColor, font: { color: 'white', size: 12 } },
            showlegend: false
          });
        }
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

      <CardContent className="flex-1 min-h-0 relative touch-pan-y">
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