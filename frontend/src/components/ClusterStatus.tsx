import React from 'react';
import {
  Activity,
  BadgeCheck,
  Clock,
  Database,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Settings
} from 'lucide-react';
import type { StatsResponse } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface ClusterStatusProps {
  stats: StatsResponse | null;
  onRefresh: () => void;
  loading: boolean;
}

const ClusterStatus: React.FC<ClusterStatusProps> = ({ stats, onRefresh, loading }) => {
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            TiKV 集群状态
          </CardTitle>
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新状态
          </Button>
        </CardHeader>

        <CardContent>
          {loading && !stats ? (
            <div className="py-10 text-center text-muted-foreground">正在加载集群状态...</div>
          ) : stats ? (
            <div className="space-y-6">
              <Card className="bg-white">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    整体状态
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">v{stats.overall.apiVersion}</Badge>
                    <Badge className={stats.overall.connected ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'}>
                      {stats.overall.connected ? '已连接' : '未连接'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-sm text-muted-foreground">连接状态</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      {stats.overall.connected ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
                      {stats.overall.connected ? '已连接' : '未连接'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">API 版本</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      <Server className="h-5 w-5 text-blue-600" />
                      {stats.overall.apiVersion}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">总样本键数</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      <Database className="h-5 w-5 text-indigo-600" />
                      {(stats.rawkv.sampleKeys || 0) + (stats.txn.sampleKeys || 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      RawKV 模式
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={stats.rawkv.connected ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'}>
                      {stats.rawkv.connected ? '正常' : '异常'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">连接状态</div>
                    <div className="text-lg font-semibold">{stats.rawkv.connected ? '已连接' : '未连接'}</div>
                    <div className="text-sm text-muted-foreground">RawKV 样本键数</div>
                    <div className="text-lg font-semibold">{stats.rawkv.sampleKeys || 0}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Transaction 模式
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={stats.txn.connected ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'}>
                      {stats.txn.connected ? '正常' : '异常'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">连接状态</div>
                    <div className="text-lg font-semibold">{stats.txn.connected ? '已连接' : '未连接'}</div>
                    <div className="text-sm text-muted-foreground">Txn 样本键数</div>
                    <div className="text-lg font-semibold">{stats.txn.sampleKeys || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    详细信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    RawKV 连接：{stats.rawkv.connected ? '正常' : '断开'}
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    Txn 连接：{stats.txn.connected ? '正常' : '断开'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-blue-600" />
                    API 版本：{stats.overall.apiVersion}
                  </div>
                  <div>RawKV 数据量：{stats.rawkv.sampleKeys || 0} 个键 (样本)</div>
                  <div>Txn 数据量：{stats.txn.sampleKeys || 0} 个键 (样本)</div>
                  <div>总数据量：{(stats.rawkv.sampleKeys || 0) + (stats.txn.sampleKeys || 0)} 个键 (样本)</div>
                </CardContent>
              </Card>

              <Separator />
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• RawKV 模式：直接键值对操作，适用于简单的高性能读写场景</p>
                  <p>• Transaction 模式：事务性操作，支持 ACID 特性，适用于需要原子性的操作</p>
                  <p>• 样本键数：通过扫描操作获取的样本数据量，用于估算集群数据规模</p>
                  <p>• 连接状态：显示各模式与 TiKV 集群的连接情况</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              无法获取集群状态，请检查后端服务或刷新重试。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClusterStatus;
