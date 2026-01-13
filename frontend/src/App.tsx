import React, { useState } from 'react';
import { Database, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import KVTable from './components/KVTable';
import TiKVApiService from './services/api';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Input } from './components/ui/input';
import { Toaster, toast } from 'sonner';

const App: React.FC = () => {
  const pdEndpointsStorageKey = 'config_pd_endpoints';
  const [clusterConnected, setClusterConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [savingEndpoints, setSavingEndpoints] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('rawkv');
  const [clusterEndpointsInput, setClusterEndpointsInput] = useState<string>('');

  const checkClusterHealth = async () => {
    setLoading(true);
    try {
      await TiKVApiService.healthCheck();
      setClusterConnected(true);
    } catch (error) {
      console.error('Cluster health check failed:', error);
      setClusterConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadClusterEndpoints = async () => {
    const stored = localStorage.getItem(pdEndpointsStorageKey);
    if (stored) {
      setClusterEndpointsInput(stored);
      return;
    }

    try {
      const status = await TiKVApiService.getClusterStatus();
      setClusterEndpointsInput(status.endpoints?.join(',') || '');
    } catch (error) {
      console.error('Failed to load cluster endpoints:', error);
    }
  };

  const saveClusterEndpoints = async () => {
    const nextEndpoints = clusterEndpointsInput.trim();
    if (!nextEndpoints) {
      toast.error('请输入有效的 PD 地址');
      return;
    }

    setSavingEndpoints(true);
    localStorage.setItem(pdEndpointsStorageKey, nextEndpoints);
    try {
      const status = await TiKVApiService.updateClusterEndpoints(nextEndpoints);
      const normalized = status.endpoints?.join(',') || nextEndpoints;
      setClusterEndpointsInput(normalized);
      localStorage.setItem(pdEndpointsStorageKey, normalized);
      toast.success('集群地址已更新');
      checkClusterHealth();
    } catch (error: any) {
      toast.error(error?.message || '更新集群地址失败');
    } finally {
      setSavingEndpoints(false);
    }
  };

  React.useEffect(() => {
    checkClusterHealth();
    loadClusterEndpoints();
    // 每30秒检查一次集群状态
    const interval = setInterval(checkClusterHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabItems = [
    {
      key: 'rawkv',
      label: 'RawKV 操作',
      content: <KVTable mode="rawkv" />
    },
    {
      key: 'txn',
      label: 'Transaction 操作',
      content: <KVTable mode="txn" />
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative border-b border-gray-200">
        <div className="flex w-full flex-col gap-3 px-8 py-3 md:flex-row md:items-center md:justify-between md:px-16">
          <div className="space-y-1">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-[0_1px_0_rgba(15,23,42,0.06)]">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  TiKV 数据库管理系统
                </h1>
                <p className="text-sm text-muted-foreground">高效管理 RawKV 与 Transaction 操作</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <Input
                value={clusterEndpointsInput}
                onChange={(event) => setClusterEndpointsInput(event.target.value)}
                placeholder="PD 地址，例如 172.16.0.10:2379,172.16.0.20:2379"
                className="h-9 w-full md:w-[420px]"
              />
              <Button
                variant="secondary"
                onClick={saveClusterEndpoints}
                disabled={savingEndpoints}
              >
                {savingEndpoints ? '保存中...' : '保存地址'}
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-[0_1px_0_rgba(15,23,42,0.06)]">
              {clusterConnected ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  集群已连接
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  集群未连接
                </>
              )}
            </div>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={checkClusterHealth}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新状态
            </Button>
          </div>
        </div>
      </div>

      <main className="w-full px-8 pb-16 pt-6 md:px-16">
        <Card className="bg-card">
          <div className="p-5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-center rounded-none">
                {tabItems.map((item) => (
                  <TabsTrigger key={item.key} value={item.key} className="gap-2 rounded-none">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabItems.map((item) => (
                <TabsContent key={item.key} value={item.key}>
                  {item.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </Card>
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default App;
