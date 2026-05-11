'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketDemandBar } from '@/components/charts/MarketDemandBar';
import { Users, TrendingUp, RefreshCw } from 'lucide-react';

interface CommunityEntry {
  id: string;
  target_role: string;
  readiness_score: number;
  top_gap: string;
  created_at: string;
}

interface TrendingSkill {
  skill: string;
  count: number;
}

interface PopularRole {
  role: string;
  count: number;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export function CommunityFeed() {
  const [entries, setEntries] = useState<CommunityEntry[]>([]);
  const [trending, setTrending] = useState<TrendingSkill[]>([]);
  const [popularRoles, setPopularRoles] = useState<PopularRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/community');
      const data = await res.json();
      setEntries(data.entries || []);
      setTrending(data.trending || []);
      setPopularRoles(data.popularRoles || []);
      setLastRefresh(new Date());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const trendingChartData = trending.map((t) => ({
    skill: t.skill,
    demand: Math.min(100, Math.round((t.count / Math.max(...trending.map((x) => x.count))) * 95)),
    hasSkill: false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          Community Activity
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <RefreshCw className="h-3 w-3" />
          Updated {timeAgo(lastRefresh.toISOString())}
        </div>
      </div>

      {/* Live feed */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-4">What others are studying</h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-background rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-secondary">
                    <span className="font-medium text-primary">Someone</span> is learning{' '}
                    <span className="text-accent font-medium">{entry.top_gap}</span>
                    {' · '}targeting <span className="font-medium text-primary">{entry.target_role}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Badge variant={entry.readiness_score >= 75 ? 'success' : entry.readiness_score >= 50 ? 'warning' : 'outline'}>
                    {Math.round(entry.readiness_score)}%
                  </Badge>
                  <span className="text-xs text-muted">{timeAgo(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Trending skills */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          Trending skills this week
        </h3>
        {trendingChartData.length > 0 && (
          <MarketDemandBar data={trendingChartData} />
        )}
      </Card>

      {/* Popular roles */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-4">Most popular target roles</h3>
        <div className="space-y-2">
          {popularRoles.slice(0, 8).map((role, i) => (
            <div key={role.role} className="flex items-center gap-3">
              <span className="text-xs text-muted w-4 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary">{role.role}</span>
                  <span className="text-xs text-muted">{role.count}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round((role.count / popularRoles[0].count) * 100)}%`,
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
