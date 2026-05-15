import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js'; // もしエラーが出る場合は any 型などで回避するか型定義を確認
import api from '../lib/api';
// ★追加: Cardコンポーネントのインポート
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ChartProps {
  studentId: number;
  refreshTrigger?: number;
}

interface ChartItem {
  name: string;
  completed: number;
  total: number;
  type: string;
}

export default function ProgressChart({ studentId, refreshTrigger = 0 }: ChartProps) {
  const [subjects, setSubjects] = useState<string[]>(["全体"]);
  const [selectedSubject, setSelectedSubject] = useState("全体");
  // const [chartData, setChartData] = useState<ChartItem[]>([]); // エラー回避のため一旦anyにしておく場合もありますが、元のままでOKならそのままで
  const [chartData, setChartData] = useState<any[]>([]); // 念のためany[]にしておきますが、元のChartItem[]で動くならそれでもOK
  const [loading, setLoading] = useState(false);

  // 科目一覧取得
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/charts/subjects/${studentId}`);
        if (res.data && res.data.length > 0) {
          // "全体" が重複しないようにマージ
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

  // Plotly用のデータ生成
  // データが空でも描画できるように安全策をとる
  const safeChartData = chartData || [];
  
  const plotData: any[] = safeChartData.map((item: any) => ({ 
    x: [item.completed, item.total], 
    y: ["達成", "予定"],             
    name: item.name,                 
    type: 'bar',
    orientation: 'h',                
    hoverinfo: 'name+x',             
  }));

  // ★変更: Cardコンポーネントでラップ
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">学習進捗グラフ</CardTitle>
          
          {/* 科目切り替えタブ (ヘッダー内に配置してもスッキリします) */}
          <div className="flex space-x-1 overflow-x-auto max-w-[70%] scrollbar-hide">
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap border ${
                  selectedSubject === subj
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
                        margin: { l: 50, r: 20, t: 10, b: 30 }, // 余白調整
                        showlegend: false,
                        xaxis: { 
                            automargin: true,
                            zeroline: true,
                        },
                        yaxis: { 
                            automargin: true,
                        },
                        // 配色パレット
                        colorway: [
                            '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', 
                            '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52'
                        ]
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>
        )}
      </CardContent>
    </Card>
  );
}
