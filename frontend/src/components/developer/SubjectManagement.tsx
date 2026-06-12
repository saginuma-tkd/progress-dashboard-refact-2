import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useConfirm } from '../../contexts/ConfirmContext';

interface Subject {
    id: number;
    name: string;
}

const SubjectManagement: React.FC = () => {
    const confirm = useConfirm();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchSubjects = () => {
        setLoading(true);
        api.get('/tenant-config/subjects')
            .then(res => setSubjects(res.data))
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

    if (loading) return <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>;

    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <BookOpen className="w-5 h-5 text-emerald-500" /> 科目マスタのカスタマイズ
            </h3>
            <div className="flex gap-2">
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="新しい科目名を追加" />
                <Button onClick={handleAddSubject} variant="secondary" className="font-bold"><Plus className="w-4 h-4 mr-1" />追加</Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-full shadow-sm">
                        <span className="font-medium">{s.name}</span>
                        <button onClick={() => handleDeleteSubject(s.id, s.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SubjectManagement;