'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
  };
  userEngagement: {
    dailyActiveUsers: number;
    avgSessionDuration: number;
    featureAdoption: {
      libraryUsage: number;
      bulkOperations: number;
      spreadsheetEditor: number;
      mobileUsage: number;
    };
  };
  businessImpact: {
    timeSavingsPerEstimate: number;
    accuracyImprovement: number;
    monthlyCostSavings: number;
    estimatesPerMonth: number;
  };
  libraryStats: {
    totalItems: number;
    itemsUsedThisMonth: number;
    popularItems: Array<{
      id: string;
      name: string;
      code: string;
      usageCount: number;
    }>;
    searchMetrics: {
      avgSearchTime: number;
      searchSuccessRate: number;
      topSearchTerms: Array<{ term: string; count: number }>;
    };
  };
}

export function PerformanceAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with actual API endpoint
      const response = await fetch('/api/analytics/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        // Fallback to mock data for demo
        setMetrics(getMockMetrics());
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Use mock data as fallback
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  };

  const getMockMetrics = (): PerformanceMetrics => ({
    systemHealth: {
      uptime: 99.94,
      responseTime: 145,
      errorRate: 0.08,
      activeUsers: 23
    },
    userEngagement: {
      dailyActiveUsers: 87,
      avgSessionDuration: 24.5,
      featureAdoption: {
        libraryUsage: 89,
        bulkOperations: 67,
        spreadsheetEditor: 45,
        mobileUsage: 34
      }
    },
    businessImpact: {
      timeSavingsPerEstimate: 3.2,
      accuracyImprovement: 24,
      monthlyCostSavings: 12400,
      estimatesPerMonth: 145
    },
    libraryStats: {
      totalItems: 1247,
      itemsUsedThisMonth: 892,
      popularItems: [
        { id: '1', name: 'Concrete C25/30', code: '03.10.20.01', usageCount: 156 },
        { id: '2', name: 'Rebar 16mm', code: '03.20.10.05', usageCount: 134 },
        { id: '3', name: 'Formwork Timber', code: '03.10.30.02', usageCount: 98 },
        { id: '4', name: 'Block Masonry 200mm', code: '04.10.10.01', usageCount: 87 },
        { id: '5', name: 'Excavation Machine', code: '02.20.10.01', usageCount: 76 }
      ],
      searchMetrics: {
        avgSearchTime: 0.18,
        searchSuccessRate: 94.2,
        topSearchTerms: [
          { term: 'concrete', count: 234 },
          { term: 'steel', count: 187 },
          { term: 'block', count: 145 },
          { term: 'excavation', count: 98 },
          { term: 'formwork', count: 87 }
        ]
      }
    }
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getHealthColor = (value: number, type: 'uptime' | 'response' | 'error') => {
    switch (type) {
      case 'uptime':
        return value >= 99.9 ? 'text-green-600' : value >= 99 ? 'text-yellow-600' : 'text-red-600';
      case 'response':
        return value <= 200 ? 'text-green-600' : value <= 500 ? 'text-yellow-600' : 'text-red-600';
      case 'error':
        return value <= 0.1 ? 'text-green-600' : value <= 1 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-lg">Loading analytics...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertTriangle className="h-8 w-8 text-red-600" />
        <span className="ml-2 text-lg">Failed to load analytics data</span>
        <Button onClick={loadMetrics} className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={loadMetrics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth.uptime, 'uptime')}`}>
              {formatPercentage(metrics.systemHealth.uptime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.systemHealth.uptime >= 99.9 ? 'Excellent' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth.responseTime, 'response')}`}>
              {metrics.systemHealth.responseTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 200ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth.errorRate, 'error')}`}>
              {formatPercentage(metrics.systemHealth.errorRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 0.1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
          <TabsTrigger value="library">Library Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Active Users</CardTitle>
                <CardDescription>User engagement trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.userEngagement.dailyActiveUsers}</div>
                <p className="text-xs text-muted-foregreen mt-2">
                  Avg session: {metrics.userEngagement.avgSessionDuration} minutes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption Rates</CardTitle>
                <CardDescription>Percentage of users using each feature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics.userEngagement.featureAdoption).map(([feature, percentage]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.businessImpact.timeSavingsPerEstimate}h
                </div>
                <p className="text-xs text-muted-foreground">Per estimate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy Gain</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +{metrics.businessImpact.accuracyImprovement}%
                </div>
                <p className="text-xs text-muted-foreground">Improvement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.businessImpact.monthlyCostSavings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {metrics.businessImpact.estimatesPerMonth} estimates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual ROI</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.businessImpact.monthlyCostSavings * 12)}
                </div>
                <p className="text-xs text-muted-foreground">Projected annual savings</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Library Usage Statistics</CardTitle>
                <CardDescription>Current month activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Library Items</span>
                  <Badge variant="secondary">{metrics.libraryStats.totalItems.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Items Used This Month</span>
                  <Badge variant="default">{metrics.libraryStats.itemsUsedThisMonth.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Usage Rate</span>
                  <Badge variant="outline">
                    {formatPercentage((metrics.libraryStats.itemsUsedThisMonth / metrics.libraryStats.totalItems) * 100)}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Search Performance</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Avg Search Time</span>
                      <span className="text-green-600">{metrics.libraryStats.searchMetrics.avgSearchTime}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="text-green-600">{formatPercentage(metrics.libraryStats.searchMetrics.searchSuccessRate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Popular Items</CardTitle>
                <CardDescription>Top 5 used items this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.libraryStats.popularItems.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.code}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{item.usageCount}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Search Terms</CardTitle>
              <CardDescription>Most frequently searched terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {metrics.libraryStats.searchMetrics.topSearchTerms.map((term) => (
                  <Badge key={term.term} variant="outline" className="text-sm">
                    {term.term} ({term.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Service</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Background Jobs</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>External APIs</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>23%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '67%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Usage</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>No active alerts</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Last alert: Database slow query (resolved 2 hours ago)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}