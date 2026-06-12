// frontend/src/components/developer/RouteLevelManagement.tsx

import React, { useState, useEffect } from 'react';
import { ListOrdered, Trash2, Eye, EyeOff, RefreshCw, Edit2, Save, X } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useConfirm } from '../../contexts/ConfirmContext';

interface RouteLevel {
    id: number;
    level_name: string;
    sequence_order: number;
    graph_line_type: string;
    show_on_graph: boolean;
    target_deviation: number | null | undefined; // 🌟 より安全な型定義に変更
}

const RouteLevelManagement: React.FC = () => {
    const confirm = useConfirm();
    const [levels, setLevels] = useState<RouteLevel[]>([]);
    const [newLevel, setNewLevel] = useState({ name: '', order: 1, type: 'standard', show: true, deviation: 50.0 });
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<RouteLevel | null>(null);

    const fetchLevels = () => {
        setLoading(true);
        api.get('/tenant-config/route-levels')
            .then(res => {
                const sorted = res.data.sort((a: RouteLevel, b: RouteLevel) => a.sequence_order - b.sequence_order);
                setLevels(sorted);
                setNewLevel(prev => ({ ...prev, order: sorted.length + 1 }));
            })
            .catch(() => toast.error("ルートレベルデータの取得に失敗しました"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLevels(); }, []);

    const handleAddLevel = async () => {
        if (!newLevel.name.trim()) return;
        try {
            await api.post('/tenant-config/route-levels', {
                level_name: newLevel.name,
                sequence_order: Number(newLevel.order),
                graph_line_type: newLevel.type,
                show_on_graph: newLevel.show,
                target_deviation: Number(newLevel.deviation)
            });
            setNewLevel({ name: '', order: levels.length + 2, type: 'standard', show: true, deviation: 50.0 });
            fetchLevels();
            toast.success("レベルを追加しました");
        } catch (err) { toast.error("追加に失敗しました"); }
    };

    const handleDeleteLevel = async (id: number, name: string) => {
        if (!(await confirm({ title: "レベルを削除しますか？", message: `「${name}」を削除します。` }))) return;
        try {
            await api.delete(`/tenant-config/route-levels/${id}`);
            fetchLevels();
            toast.success("削除しました");
        } catch (err) { toast.error("削除に失敗しました"); }
    };

    const startEdit = (level: RouteLevel) => {
        setEditingId(level.id);
        // 🌟 編集開始時に、確実に数値をセットする（nullの場合は50.0にする）
        setEditForm({
            ...level,
            target_deviation: level.target_deviation != null ? level.target_deviation : 50.0
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleSaveEdit = async () => {
        if (!editForm || !editForm.level_name.trim()) return;
        try {
            await api.put(`/tenant-config/route-levels/${editForm.id}`, {
                level_name: editForm.level_name,
                sequence_order: Number(editForm.sequence_order),
                graph_line_type: editForm.graph_line_type,
                show_on_graph: editForm.show_on_graph,
                target_deviation: Number(editForm.target_deviation)
            });
            toast.success("レベルを更新しました");
            setEditingId(null);
            fetchLevels();
        } catch (err) {
            toast.error("更新に失敗しました");
        }
    };

    if (loading) return <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <ListOrdered className="w-5 h-5 text-orange-500" /> ルートレベルと偏差値の管理
            </h3>
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-600 border-b">
                        <tr>
                            <th className="px-4 py-3 w-16">順序</th>
                            <th className="px-4 py-3 min-w-[120px]">レベル名</th>
                            <th className="px-4 py-3 w-24">偏差値</th>
                            <th className="px-4 py-3 w-28">グラフ線種</th>
                            <th className="px-4 py-3 text-center w-16">表示</th>
                            <th className="px-4 py-3 text-right w-24">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {levels.map(l => (
                            <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                {editingId === l.id && editForm ? (
                                    <>
                                        <td className="px-2 py-2"><Input type="number" value={editForm.sequence_order ?? ""} onChange={e => setEditForm({ ...editForm, sequence_order: Number(e.target.value) })} className="h-8 text-center px-1" /></td>
                                        <td className="px-2 py-2"><Input value={editForm.level_name ?? ""} onChange={e => setEditForm({ ...editForm, level_name: e.target.value })} className="h-8" /></td>
                                        {/* 🌟 警告対策：valueに null/undefined が渡らないようにする */}
                                        <td className="px-2 py-2"><Input type="number" step="0.1" value={editForm.target_deviation ?? 50.0} onChange={e => setEditForm({ ...editForm, target_deviation: Number(e.target.value) })} className="h-8 text-center px-1" /></td>
                                        <td className="px-2 py-2">
                                            <select value={editForm.graph_line_type} onChange={e => setEditForm({ ...editForm, graph_line_type: e.target.value })} className="text-xs h-8 border rounded-md w-full bg-white px-2">
                                                <option value="standard">Standard</option>
                                                <option value="advance">Advance</option>
                                            </select>
                                        </td>
                                        <td className="px-2 py-2 text-center"><input type="checkbox" checked={editForm.show_on_graph} onChange={e => setEditForm({ ...editForm, show_on_graph: e.target.checked })} className="rounded text-orange-500 w-4 h-4 cursor-pointer" /></td>
                                        <td className="px-2 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={handleSaveEdit}><Save className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-gray-100" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3 font-mono text-gray-400">{l.sequence_order}</td>
                                        <td className="px-4 py-3 font-bold">{l.level_name}</td>
                                        {/* 🌟 表示対策：null だけでなく 0 の場合も正しく表示されるように厳密に判定 */}
                                        <td className="px-4 py-3 font-medium text-blue-600">
                                            {l.target_deviation != null ? l.target_deviation : '-'}
                                        </td>
                                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{l.graph_line_type}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            {l.show_on_graph ? <Eye className="w-4 h-4 mx-auto text-emerald-500" /> : <EyeOff className="w-4 h-4 mx-auto text-gray-300" />}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-gray-200" onClick={() => startEdit(l)}>
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteLevel(l.id, l.level_name)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}

                        <tr className="bg-orange-50/30">
                            <td className="px-2 py-2">
                                <Input type="number" value={newLevel.order ?? ""} onChange={e => setNewLevel({ ...newLevel, order: Number(e.target.value) })} className="h-8 text-center px-1" />
                            </td>
                            <td className="px-2 py-2">
                                <Input value={newLevel.name ?? ""} onChange={e => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="新規レベル名" className="h-8" />
                            </td>
                            {/* 🌟 警告対策：valueに null/undefined が渡らないようにする */}
                            <td className="px-2 py-2">
                                <Input type="number" step="0.1" value={newLevel.deviation ?? 50.0} onChange={e => setNewLevel({ ...newLevel, deviation: Number(e.target.value) })} placeholder="偏差値" className="h-8 text-center px-1" />
                            </td>
                            <td className="px-2 py-2">
                                <select value={newLevel.type} onChange={e => setNewLevel({ ...newLevel, type: e.target.value })} className="text-xs h-8 border rounded-md w-full bg-white px-2">
                                    <option value="standard">Standard</option>
                                    <option value="advance">Advance</option>
                                </select>
                            </td>
                            <td className="px-2 py-2 text-center">
                                <input type="checkbox" checked={newLevel.show} onChange={e => setNewLevel({ ...newLevel, show: e.target.checked })} className="rounded text-orange-500 w-4 h-4 cursor-pointer" />
                            </td>
                            <td className="px-2 py-2">
                                <Button size="sm" onClick={handleAddLevel} className="w-full h-8 font-bold bg-orange-500 hover:bg-orange-600">追加</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default RouteLevelManagement;