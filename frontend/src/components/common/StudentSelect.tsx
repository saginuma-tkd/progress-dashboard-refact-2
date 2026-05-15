// frontend/src/components/common/StudentSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '../ui/input';

interface Student {
  id: number;
  name: string;
  grade?: string;
}

interface StudentSelectProps {
  students: Student[];
  selectedStudentId: number | null;
  onSelect: (studentId: number) => void;
  className?: string; // 外側から幅などを調整できるようにする
}

export default function StudentSelect({ 
  students, 
  selectedStudentId, 
  onSelect,
  className = "w-full md:w-64" // デフォルト幅
}: StudentSelectProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // 選択中の生徒オブジェクトを取得
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  // 検索による絞り込み
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 外側をクリックした時に閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* フィールド部分 */}
      <div 
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-gray-50"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm(""); // 開くときに検索文字をリセット
        }}
      >
        <span className="truncate">
          {selectedStudent 
            ? `${selectedStudent.name} ${selectedStudent.grade ? `(${selectedStudent.grade})` : ""}` 
            : "生徒を選択..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>

      {/* 開いたときのリスト部分 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-md border bg-white shadow-md flex flex-col">
          {/* 検索インプット（ドロップダウン内部） */}
          <div className="p-2 border-b bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                autoFocus
                placeholder="生徒名で絞り込み..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          {/* リスト本体 */}
          <div className="overflow-y-auto p-1 max-h-60">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s) => (
                <div 
                  key={s.id}
                  className={`flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-gray-100 ${selectedStudentId === s.id ? 'bg-blue-50 text-blue-900 font-medium' : ''}`}
                  onClick={() => {
                    onSelect(s.id);
                    setIsOpen(false);
                    setSearchTerm(""); // 選択したら検索文字をリセット
                  }}
                >
                  {s.name} <span className="ml-2 text-gray-500 text-xs">{s.grade}</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">
                該当する生徒がいません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}