import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertCircle, Send, CheckCircle2, MessageSquare, Lightbulb, ChevronDown, ChevronUp, User as UserIcon } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import api from '../lib/api';

// --- 型定義 ---
interface ReportItem {
  id: number;
  reporter_username: string;
  report_date: string;
  title: string;
  description: string;
  status: string;
  resolution_message?: string;
}

const BugReport: React.FC = () => {
  const { user } = useAuth();
  // 管理者判定: userオブジェクトの構造に合わせて調整してください (例: user.role === 'admin')
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'developer';

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // フォーム用
  const [reportType, setReportType] = useState("bug"); // bug | feature
  const [formData, setFormData] = useState({ title: "", description: "" });

  // 一覧用
  const [bugReports, setBugReports] = useState<ReportItem[]>([]);
  const [featureRequests, setFeatureRequests] = useState<ReportItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  
  // 詳細展開用
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // 管理者編集用ステート
  const [editStatus, setEditStatus] = useState("");
  const [editResolution, setEditResolution] = useState("");

  const fetchReports = async () => {
    setListLoading(true);
    try {
      const [bugsRes, featuresRes] = await Promise.all([
        api.get('/system/bug_reports'),
        api.get('/system/feature_requests')
      ]);
      setBugReports(bugsRes.data);
      setFeatureRequests(featuresRes.data);
    } catch (e) {
      console.error("Failed to fetch reports", e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 報告送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("ログインが必要です");
    setLoading(true);
    
    try {
      const payload = {
          reporter_username: (user as any).username || "Unknown",
          title: formData.title,
          description: formData.description
      };
      const endpoint = reportType === "bug" ? '/system/bug_reports' : '/system/feature_requests';
      await api.post(endpoint, payload);
      
      setIsSubmitted(true);
      fetchReports();
    } catch (error) {
      alert("送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // ステータス更新 (管理者用)
  const handleUpdateStatus = async (id: number, type: "bug" | "feature") => {
      try {
          const endpoint = type === "bug" ? `/system/bug_reports/${id}` : `/system/feature_requests/${id}`;
          await api.patch(endpoint, {
              status: editStatus,
              resolution_message: editResolution
          });
          alert("更新しました");
          fetchReports();
      } catch (e) {
          alert("更新失敗");
      }
  };

  // 展開トグル
  const toggleExpand = (item: ReportItem) => {
    if (expandedIds.includes(item.id)) {
        setExpandedIds(expandedIds.filter(i => i !== item.id));
    } else {
        setExpandedIds([...expandedIds, item.id]);
        // 展開時に編集ステートに初期値をセット(管理者用)
        setEditStatus(item.status);
        setEditResolution(item.resolution_message || "");
    }
  };

  // ステータスバッジ
  const renderStatusBadge = ({ status }: { status: string }) => {
    let color = "bg-gray-100 text-gray-800";
    if (status === "対応中") color = "bg-blue-100 text-blue-800";
    if (status === "完了" || status === "解決済み") color = "bg-green-100 text-green-800";
    return <Badge variant="outline" className={`${color} border-none font-bold`}>{status}</Badge>;
  };

  // リストアイテム描画コンポーネント
  const renderReportList = ({ items, type }: { items: ReportItem[], type: "bug" | "feature" }) => (
      <div className="space-y-4 pb-4">
          {items.map(item => {
              const isExpanded = expandedIds.includes(item.id);
              return (
                  <Card key={item.id} className={`transition-all border-l-4 ${isExpanded ? 'border-l-blue-500 shadow-md' : 'border-l-gray-300 hover:bg-gray-50'}`}>
                      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => toggleExpand(item)}>
                          <div className="flex items-start justify-between">
                              <div className="flex flex-col gap-1 w-full">
                                  <div className="flex items-center justify-between w-full">
                                      <span className="text-xs text-muted-foreground">{item.report_date}</span>
                                      {renderStatusBadge({status:item.status})}
                                  </div>
                                  <div className="font-bold text-sm">{item.title}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <UserIcon className="w-3 h-3" /> {item.reporter_username}
                                  </div>
                              </div>
                              <div className="ml-2 mt-2">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                          </div>
                      </CardHeader>
                      
                      {isExpanded && (
                          <CardContent className="pt-0 pb-4 px-4 border-t bg-gray-50/50">
                              <div className="mt-3 space-y-4">
                                  {/* 詳細内容 */}
                                  <div>
                                      <Label className="text-xs text-muted-foreground">詳細</Label>
                                      <div className="text-sm mt-1 whitespace-pre-wrap">{item.description}</div>
                                  </div>

                                  {/* 管理者エリア or 解決メッセージ表示 */}
                                  {isAdmin ? (
                                      <div className="bg-white p-3 rounded border space-y-3">
                                          <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" /> 管理者メニュー
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                              <div className="space-y-1">
                                                  <Label className="text-xs">ステータス</Label>
                                                  <Select value={editStatus} onValueChange={setEditStatus}>
                                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                      <SelectContent>
                                                          <SelectItem value="未対応">未対応</SelectItem>
                                                          <SelectItem value="対応中">対応中</SelectItem>
                                                          <SelectItem value="解決済み">解決済み</SelectItem>
                                                          <SelectItem value="保留">保留</SelectItem>
                                                      </SelectContent>
                                                  </Select>
                                              </div>
                                              <div className="space-y-1 col-span-2">
                                                  <Label className="text-xs">対応コメント</Label>
                                                  <Textarea className="min-h-[60px] text-xs" value={editResolution} onChange={e => setEditResolution(e.target.value)} placeholder="解決方法やコメントを入力..." />
                                              </div>
                                          </div>
                                          <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleUpdateStatus(item.id, type)}>更新</Button>
                                      </div>
                                  ) : (
                                      item.resolution_message && (
                                          <div className="bg-green-50 p-3 rounded border border-green-100">
                                              <Label className="text-xs text-green-700 font-bold">対応コメント</Label>
                                              <div className="text-sm mt-1 text-green-800 whitespace-pre-wrap">{item.resolution_message}</div>
                                          </div>
                                      )
                                  )}
                              </div>
                          </CardContent>
                      )}
                  </Card>
              );
          })}
          {items.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">報告はありません</div>}
      </div>
  );

  return (
    <div className="h-full w-full p-4 md:p-8 pt-6 flex flex-col gap-4 overflow-hidden">
      <div className="flex-none">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6" /> フィードバック
        </h2>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
{/* 左カラム: 報告フォーム */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
            {/* Cardに h-full flex flex-col を適用 */}
            <Card className="h-full flex flex-col overflow-hidden">
                <CardHeader className="shrink-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Send className="w-4 h-4" /> 新規報告
                    </CardTitle>
                    <CardDescription>不具合やご要望を入力してください。</CardDescription>
                </CardHeader>
                
                {isSubmitted ? (
                    // 送信完了画面
                    <CardContent className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h3 className="text-xl font-bold">送信しました</h3>
                        <Button onClick={() => { setIsSubmitted(false); setFormData({title:"", description:""}); }} className="mt-4">
                        続けて報告する
                        </Button>
                    </CardContent>
                ) : (
                    // フォーム本体: form自体を flex-1 flex flex-col にして高さを確保
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                        {/* CardContent を flex-1 overflow-y-auto にしてスクロールさせる */}
                        <CardContent className="flex-1 overflow-y-auto space-y-4">
                            <div className="space-y-2">
                                <Label>種類</Label>
                                <Select value={reportType} onValueChange={setReportType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bug">不具合 (バグ)</SelectItem>
                                        <SelectItem value="feature">機能リクエスト</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>タイトル</Label>
                                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                            </div>
                            <div className="space-y-2">
                                <Label>詳細</Label>
                                <Textarea className="min-h-[150px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                            </div>
                        </CardContent>
                        
                        {/* Footer (送信ボタン) は shrink-0 で固定表示 */}
                        <CardFooter className="border-t pt-4 pb-4 shrink-0 bg-white">
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "送信中..." : "送信"}
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>

        {/* 右カラム: 一覧リスト */}
        <div className="w-full md:w-2/3 flex flex-col">
            <Card className="h-full flex flex-col border shadow-sm">
                <Tabs defaultValue="bug" className="h-full flex flex-col">
                    <CardHeader className="px-4 py-3 border-b shrink-0 bg-white">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">報告一覧</CardTitle>
                            <TabsList>
                                <TabsTrigger value="bug"><AlertCircle className="w-4 h-4 mr-1" /> バグ報告</TabsTrigger>
                                <TabsTrigger value="feature"><Lightbulb className="w-4 h-4 mr-1" /> 要望</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 p-0 overflow-hidden bg-gray-50/30">
                        <TabsContent value="bug" className="h-full m-0">
                            <ScrollArea className="h-full p-4">
                                {renderReportList({ items: bugReports, type: "bug" })}
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="feature" className="h-full m-0">
                            <ScrollArea className="h-full p-4">
                                {renderReportList({ items: featureRequests, type: "feature" })}
                            </ScrollArea>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default BugReport;
