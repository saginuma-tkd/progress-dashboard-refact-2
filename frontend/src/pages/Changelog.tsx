import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tag, CheckCircle2, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import api from '../lib/api';

interface ChangelogItem {
  id: number;
  version: string;
  release_date: string;
  title: string;
  description: string;
}

const Changelog: React.FC = () => {
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]); // 展開中のIDリスト

  useEffect(() => {
    const fetchChangelogs = async () => {
      try {
        const res = await api.get('/system/changelog');
        setChangelogs(res.data);
        // 最新の1件だけデフォルトで開いておく
        if (res.data.length > 0) {
            setExpandedIds([res.data[0].id]);
        }
      } catch (e) {
        console.error("Failed to fetch changelogs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchChangelogs();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full w-full p-4 md:p-8 pt-6 flex flex-col gap-4">
      <div className="flex-none">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="w-6 h-6" /> 更新履歴
        </h2>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4 pb-8">
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : changelogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">更新履歴はありません</div>
            ) : (
                changelogs.map((change) => {
                  const isExpanded = expandedIds.includes(change.id);
                  return (
                    <Card key={change.id} className={`transition-all duration-200 border-l-4 ${isExpanded ? 'border-l-blue-500 shadow-md' : 'border-l-gray-300 hover:border-l-blue-300'}`}>
                        <CardHeader className="py-3 cursor-pointer" onClick={() => toggleExpand(change.id)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={`font-bold px-2 py-1 text-sm ${isExpanded ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600'}`}>
                                        {change.version}
                                    </Badge>
                                    <div>
                                        <CardTitle className="text-base">{change.title}</CardTitle>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Tag className="w-3 h-3" /> {change.release_date}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        
                        {isExpanded && (
                            <CardContent className="pt-0 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="border-t pt-3 mt-1">
                                    <ul className="space-y-2">
                                        {change.description.split('\n').map((line, j) => (
                                        <li key={j} className="flex items-start gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                            <span className="leading-relaxed">{line}</span>
                                        </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                  );
                })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Changelog;
