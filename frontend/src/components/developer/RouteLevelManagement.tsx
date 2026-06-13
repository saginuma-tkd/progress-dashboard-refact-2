// frontend/src/components/developer/RouteLevelManagement.tsx

import React, { useState, useEffect } from 'react';
import { ListOrdered, Trash2, Eye, EyeOff, RefreshCw, Edit2, Save, X, GripVertical } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RouteLevel {
    id: number;
    level_name: string;
    sequence_order: number;
    graph_line_type: string;
    show_on_graph: boolean;
    target_deviation: number | null | undefined;
}

const LINE_COLORS = [
    { id: 'blue', class: 'bg-blue-500', hover: 'hover:bg-blue-600', label: 'ブルー' },
    { id: 'red', class: 'bg-red-500', hover: 'hover:bg-red-600', label: 'レッド' },
    { id: 'green', class: 'bg-green-500', hover: 'hover:bg-green-600', label: 'グリーン' },
    { id: 'orange', class: 'bg-orange-500', hover: 'hover:bg-orange-600', label: 'オレンジ' },
    { id: 'purple', class: 'bg-purple-500', hover: 'hover:bg-purple-600', label: 'パープル' },
];

// 🌟 テーブルの「行」をドラッグ可能にする専用コンポーネント
const SortableRouteLevelRow = ({
    level, editingId, editForm, setEditForm, handleSaveEdit, cancelEdit, startEdit, handleDeleteLevel, handleQuickUpdate
}: {
    level: RouteLevel;
    editingId: number | null;
    editForm: RouteLevel | null;
    setEditForm: any;
    handleSaveEdit: () => void;
    cancelEdit: () => void;
    startEdit: (level: RouteLevel) => void;
    handleDeleteLevel: (id: number, name: string) => void;
    handleQuickUpdate: (level: RouteLevel, field: keyof RouteLevel, value: any) => void;
}) => {
    const isEditing = editingId === level.id;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: level.id,
        disabled: isEditing // 編集モード中はドラッグを無効化する
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.9 : 1,
        // ドラッグ中の行を目立たせる
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : 'none',
    };

    return (
        <tr ref={setNodeRef} style={style} className={`transition-colors bg-white ${isDragging ? 'ring-2 ring-orange-400 relative' : 'hover:bg-gray-50'}`}>
            {isEditing && editForm ? (
                <>
                    <td className="px-2 py-2 font-mono text-gray-400 text-center">{editForm.sequence_order}</td>
                    <td className="px-2 py-2"><Input value={editForm.level_name ?? ""} onChange={e => setEditForm({ ...editForm, level_name: e.target.value })} className="h-8" /></td>
                    <td className="px-2 py-2"><Input type="number" step="0.1" value={editForm.target_deviation ?? 50.0} onChange={e => setEditForm({ ...editForm, target_deviation: Number(e.target.value) })} className="h-8 text-center px-1" /></td>
                    <td className="px-2 py-2">
                        <div className="flex gap-1.5 px-2">
                            {LINE_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setEditForm({ ...editForm, graph_line_type: c.id })}
                                    title={c.label}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${editForm.graph_line_type === c.id ? 'border-gray-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${c.class}`}
                                />
                            ))}
                        </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                        <button onClick={() => setEditForm({ ...editForm, show_on_graph: !editForm.show_on_graph })} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                            {editForm.show_on_graph ? <Eye className="w-4 h-4 mx-auto text-emerald-500" /> : <EyeOff className="w-4 h-4 mx-auto text-gray-300" />}
                        </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={handleSaveEdit}><Save className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-gray-100" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                        </div>
                    </td>
                </>
            ) : (
                <>
                    <td className="px-4 py-3 flex items-center gap-2">
                        {/* 🌟 ドラッグ用のグリップアイコン */}
                        <button {...attributes} {...listeners} className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing focus:outline-none" title="ドラッグして並び替え">
                            <GripVertical className="w-4 h-4" />
                        </button>
                        <span className="font-mono text-gray-400 font-bold">{level.sequence_order}</span>
                    </td>
                    <td className="px-4 py-3 font-bold">{level.level_name}</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{level.target_deviation != null ? level.target_deviation : '-'}</td>
                    <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                            {LINE_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleQuickUpdate(level, 'graph_line_type', c.id)}
                                    title={`${c.label}に変更`}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${level.graph_line_type === c.id ? 'border-gray-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${c.class}`}
                                />
                            ))}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                        <button onClick={() => handleQuickUpdate(level, 'show_on_graph', !level.show_on_graph)} title={level.show_on_graph ? "クリックで非表示にする" : "クリックで表示する"} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                            {level.show_on_graph ? <Eye className="w-4 h-4 mx-auto text-emerald-500" /> : <EyeOff className="w-4 h-4 mx-auto text-gray-300" />}
                        </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:bg-gray-200" onClick={() => startEdit(level)}>
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteLevel(level.id, level.level_name)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </td>
                </>
            )}
        </tr>
    );
};

const RouteLevelManagement: React.FC = () => {
    const confirm = useConfirm();
    const [levels, setLevels] = useState<RouteLevel[]>([]);
    const [newLevel, setNewLevel] = useState({ name: '', type: 'blue', show: true, deviation: 50.0 });
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<RouteLevel | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchLevels = () => {
        setLoading(true);
        api.get('/tenant-config/route-levels')
            .then(res => {
                const sorted = res.data.sort((a: RouteLevel, b: RouteLevel) => a.sequence_order - b.sequence_order);
                setLevels(sorted);
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
                sequence_order: levels.length + 1, // 🌟 常に一番最後に追加されるように自動計算
                graph_line_type: newLevel.type,
                show_on_graph: newLevel.show,
                target_deviation: Number(newLevel.deviation)
            });
            setNewLevel({ name: '', type: 'blue', show: true, deviation: 50.0 });
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

    const handleQuickUpdate = async (level: RouteLevel, field: keyof RouteLevel, value: any) => {
        try {
            await api.put(`/tenant-config/route-levels/${level.id}`, {
                level_name: level.level_name,
                sequence_order: Number(level.sequence_order),
                graph_line_type: field === 'graph_line_type' ? value : level.graph_line_type,
                show_on_graph: field === 'show_on_graph' ? value : level.show_on_graph,
                target_deviation: Number(level.target_deviation)
            });
            fetchLevels();
            toast.success("設定を更新しました", { duration: 1500 });
        } catch (err) {
            toast.error("更新に失敗しました");
        }
    };

    // 🌟 ドラッグ終了時の処理（ここで一気に順番を再計算！）
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = levels.findIndex(l => l.id === active.id);
            const newIndex = levels.findIndex(l => l.id === over.id);

            // 1. 配列を入れ替え、新しい順番(sequence_order)を1から振り直す
            const reorderedLevels = arrayMove(levels, oldIndex, newIndex).map((level, index) => ({
                ...level,
                sequence_order: index + 1
            }));

            // 2. 画面を即座に更新してヌルヌル感を出す
            setLevels(reorderedLevels);

            // 3. バックエンドに一括送信
            try {
                const payload = reorderedLevels.map(l => ({
                    id: l.id,
                    sequence_order: l.sequence_order
                }));
                await api.put('/tenant-config/route-levels/reorder', { items: payload });
                toast.success("ルートレベルの順番を保存しました", { duration: 1500 });
            } catch (err) {
                toast.error("順番の保存に失敗しました");
                fetchLevels(); // 失敗したら元の状態に戻す
            }
        }
    };

    const startEdit = (level: RouteLevel) => {
        setEditingId(level.id);
        setEditForm({ ...level, target_deviation: level.target_deviation != null ? level.target_deviation : 50.0 });
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
        } catch (err) { toast.error("更新に失敗しました"); }
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
                            <th className="px-4 py-3 w-20">順序</th>
                            <th className="px-4 py-3 min-w-[120px]">レベル名</th>
                            <th className="px-4 py-3 w-24">偏差値</th>
                            <th className="px-4 py-3 w-36">グラフ線カラー</th>
                            <th className="px-4 py-3 text-center w-20">表示</th>
                            <th className="px-4 py-3 text-right w-24">操作</th>
                        </tr>
                    </thead>
                    {/* 🌟 テーブルのボディ全体をDnDのコンテキストで囲む */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <tbody className="divide-y relative">
                            <SortableContext items={levels.map(l => l.id)} strategy={verticalListSortingStrategy}>
                                {levels.map(l => (
                                    <SortableRouteLevelRow
                                        key={l.id}
                                        level={l}
                                        editingId={editingId}
                                        editForm={editForm}
                                        setEditForm={setEditForm}
                                        handleSaveEdit={handleSaveEdit}
                                        cancelEdit={cancelEdit}
                                        startEdit={startEdit}
                                        handleDeleteLevel={handleDeleteLevel}
                                        handleQuickUpdate={handleQuickUpdate}
                                    />
                                ))}
                            </SortableContext>

                            {/* 新規追加フォームはドラッグ対象外なので一番下に固定 */}
                            <tr className="bg-orange-50/30 border-t-2 border-orange-100">
                                <td className="px-2 py-2 text-center text-gray-400 font-mono text-xs">
                                    次へ
                                </td>
                                <td className="px-2 py-2">
                                    <Input value={newLevel.name ?? ""} onChange={e => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="新規レベル名" className="h-8 bg-white" />
                                </td>
                                <td className="px-2 py-2">
                                    <Input type="number" step="0.1" value={newLevel.deviation ?? 50.0} onChange={e => setNewLevel({ ...newLevel, deviation: Number(e.target.value) })} placeholder="偏差値" className="h-8 text-center px-1 bg-white" />
                                </td>
                                <td className="px-2 py-2">
                                    <div className="flex gap-1.5 px-2">
                                        {LINE_COLORS.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setNewLevel({ ...newLevel, type: c.id })}
                                                title={c.label}
                                                className={`w-5 h-5 rounded-full border-2 transition-all ${newLevel.type === c.id ? 'border-gray-800 scale-110 shadow-sm' : 'border-transparent hover:scale-110'} ${c.class}`}
                                            />
                                        ))}
                                    </div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <button onClick={() => setNewLevel({ ...newLevel, show: !newLevel.show })} className="p-1.5 rounded hover:bg-orange-100 transition-colors">
                                        {newLevel.show ? <Eye className="w-4 h-4 mx-auto text-emerald-500" /> : <EyeOff className="w-4 h-4 mx-auto text-gray-300" />}
                                    </button>
                                </td>
                                <td className="px-2 py-2 text-right">
                                    <Button size="sm" onClick={handleAddLevel} className="h-8 font-bold bg-orange-500 hover:bg-orange-600">追加</Button>
                                </td>
                            </tr>
                        </tbody>
                    </DndContext>
                </table>
            </div>
        </section>
    );
};

export default RouteLevelManagement;