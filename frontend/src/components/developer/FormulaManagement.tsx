import React, { useState, useEffect } from 'react';
import { Calculator, Info, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const FormulaManagement: React.FC = () => {
    const [formula, setFormula] = useState("");
    const [testX, setTestX] = useState("50");
    const [testY, setTestY] = useState("60");
    const [testT, setTestT] = useState("20");
    const [testResult, setTestResult] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/tenant-config/settings')
            .then(res => setFormula(res.data.duration_slope_formula))
            .catch(() => toast.error("計算式データの取得に失敗しました"))
            .finally(() => setLoading(false));
    }, []);

    const handleSaveFormula = async () => {
        try {
            await api.put('/tenant-config/settings', { duration_slope_formula: formula });
            toast.success("計算式を保存しました");
        } catch (err) { toast.error("保存に失敗しました"); }
    };

    const handleTestFormula = async () => {
        try {
            const res = await api.post('/tenant-config/calculate-duration', {
                x: Number(testX), y: Number(testY), t: Number(testT)
            });
            setTestResult(res.data.duration);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "計算エラー");
        }
    };

    if (loading) return <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Calculator className="w-5 h-5 text-indigo-500" /> 所要時間傾斜計算式の設定
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
                <div className="flex gap-2">
                    <Input
                        value={formula}
                        onChange={e => setFormula(e.target.value)}
                        placeholder="例:(1+0.025*(x-y))*t"
                        className="bg-white font-mono"
                    />
                    <Button onClick={handleSaveFormula} className="font-bold">保存</Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm bg-indigo-50 p-3 rounded-md border border-indigo-100">
                    <span className="font-bold text-indigo-700 flex items-center gap-1"><Info className="w-4 h-4" /> プレビュー計算:</span>
                    <div className="flex items-center gap-2">
                        <span>生徒偏差値(x):</span>
                        <Input type="number" value={testX} onChange={e => setTestX(e.target.value)} className="w-20 h-8 bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span>ルート基準偏差値(y):</span>
                        <Input type="number" value={testY} onChange={e => setTestY(e.target.value)} className="w-20 h-8 bg-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span>目安時間(t):</span>
                        <Input type="number" value={testT} onChange={e => setTestT(e.target.value)} className="w-20 h-8 bg-white" />
                    </div>
                    <Button size="sm" variant="outline" onClick={handleTestFormula}>計算実行</Button>
                    {testResult !== null && (
                        <span className="ml-2 font-bold text-lg text-indigo-600">結果: {testResult} 時間</span>
                    )}
                </div>
            </div>
        </section>
    );
};

export default FormulaManagement;