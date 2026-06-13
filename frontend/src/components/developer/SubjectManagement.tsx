import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, RefreshCw, GripHorizontal } from 'lucide-react';
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
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Subject {
    id: number;
    name: string;
    sequence_order?: number;
}

// 🌟 ドラッグ可能な個別のタグコンポーネント
const SortableSubjectItem = ({ subject, onDelete }: { subject: Subject, onDelete: (id: number, name: string) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subject.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-full shadow-sm transition-shadow ${isDragging ? 'ring-2 ring-emerald-500 shadow-md scale-105' : ''}`}
        >
            <button
                {...attributes}
                {...listeners}
                className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing focus:outline-none"
                title="ドラッグして並び替え"
            >
                <GripHorizontal className="w-4 h-4" />
            </button>
            <span className="font-medium ml-1 mr-2">{subject.name}</span>
            <button onClick={() => onDelete(subject.id, subject.name)} className="text-gray-300 hover:text-red-500 transition-colors focus:outline-none">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};

const SubjectManagement: React.FC = () => {
    const confirm = useConfirm();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // 5px動かしたらドラッグ開始（誤操作防止）
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchSubjects = () => {
        setLoading(true);
        api.get('/tenant-config/subjects')
            .then(res => {
                // 順番通りに並び替えてからセット
                const sorted = res.data.sort((a: Subject, b: Subject) => (a.sequence_order || 0) - (b.sequence_order || 0));
                setSubjects(sorted);
            })
            .catch(() => toast.error("科目データの取得に失敗しました"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchSubjects(); }, []);

    const handleAddSubject = async () => {
        if (!newSubject.trim()) return;
        try {
            await api.post('/tenant-config/subjects', { name: newSubject });
            setNewSubject("");
            fetchSubjects();
            toast.success("科目を追加しました");
        } catch (err) { toast.error("追加に失敗しました"); }
    };

    const handleDeleteSubject = async (id: number, name: string) => {
        if (!(await confirm({ title: "科目を削除しますか？", message: `「${name}」を削除します。` }))) return;
        try {
            await api.delete(`/tenant-config/subjects/${id}`);
            fetchSubjects();
            toast.success("削除しました");
        } catch (err) { toast.error("削除に失敗しました"); }
    };

    // 🌟 ドラッグ終了時の処理
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = subjects.findIndex(s => s.id === active.id);
            const newIndex = subjects.findIndex(s => s.id === over.id);

            // 1. 画面のUIを即座に更新する（オプティミスティックUI）
            const newSubjects = arrayMove(subjects, oldIndex, newIndex);
            setSubjects(newSubjects);

            // 2. バックエンドに新しい順番を一括送信する
            try {
                const payload = newSubjects.map((s, index) => ({
                    id: s.id,
                    sequence_order: index + 1
                }));
                await api.put('/tenant-config/subjects/reorder', { items: payload });
                toast.success("並び順を保存しました", { duration: 1500 });
            } catch (err) {
                toast.error("並び順の保存に失敗しました");
                fetchSubjects(); // 失敗した場合は元の順番に戻す
            }
        }
    };

    if (loading) return <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <BookOpen className="w-5 h-5 text-emerald-500" /> 科目マスタのカスタマイズ
            </h3>
            <div className="flex gap-2">
                <Input
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                    placeholder="新しい科目名を追加"
                />
                <Button onClick={handleAddSubject} variant="secondary" className="font-bold">
                    <Plus className="w-4 h-4 mr-1" />追加
                </Button>
            </div>

            {/* 🌟 ドラッグ＆ドロップのコンテキスト */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-wrap gap-2 p-2 min-h-[50px] bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <SortableContext
                        items={subjects.map(s => s.id)}
                        strategy={rectSortingStrategy} // Flex wrap用のソート戦略
                    >
                        {subjects.map(s => (
                            <SortableSubjectItem
                                key={s.id}
                                subject={s}
                                onDelete={handleDeleteSubject}
                            />
                        ))}
                    </SortableContext>
                </div>
            </DndContext>
        </section>
    );
};

export default SubjectManagement;