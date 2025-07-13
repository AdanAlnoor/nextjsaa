'use client';

import React, { useState, useEffect } from 'react';
import { BackgroundJobService, JobSchedule, JobHistory, JobSummary } from '../../services/backgroundJobService';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { Play, Pause, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface JobMetrics {
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  isRecent: boolean;
  lastRun?: Date;
  nextRun?: Date;
  duration?: number;
}

export const BackgroundJobsManager: React.FC = () => {
  const [schedules, setSchedules] = useState<JobSchedule[]>([]);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningJobs, setRunningJobs] = useState(new Set<string>());
  const [jobMetrics, setJobMetrics] = useState<Map<string, JobMetrics>>(new Map());

  const jobService = BackgroundJobService.getInstance();

  useEffect(() => {
    initializeService();
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeService = async () => {
    try {
      await jobService.initialize({
        enablePopularityAggregation: true,
        enablePriceSnapshots: true,
        popularityIntervalHours: 24,
        snapshotIntervalHours: 168
      });
    } catch (error) {
      console.error('Failed to initialize job service:', error);
      toast({
        title: 'Initialization Error',
        description: 'Failed to initialize background job service',
        variant: 'destructive'
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load active schedules
      const activeSchedules = jobService.getActiveSchedules();
      setSchedules(activeSchedules);

      // Load job history
      const history = await jobService.getJobHistory(undefined, 20);
      setJobHistory(history);

      // Load job summary
      const summary = await jobService.getJobSummary(7);
      setJobSummary(summary);

      // Calculate job metrics
      const metrics = new Map<string, JobMetrics>();
      
      for (const schedule of activeSchedules) {
        const status = await jobService.getJobStatus(schedule.jobId);
        const recentJob = history.find(h => h.job_name === schedule.jobId);
        
        const isRecent = recentJob ? 
          new Date(recentJob.completed_at || recentJob.started_at) > 
          new Date(Date.now() - 5 * 60 * 1000) : false;

        metrics.set(schedule.jobId, {
          name: schedule.name,
          status: status.isRunning ? 'running' : 
                  recentJob?.status === 'completed' ? 'completed' :
                  recentJob?.status === 'failed' ? 'failed' : 'idle',
          isRecent,
          lastRun: status.lastExecution ? new Date(status.lastExecution.started_at) : undefined,
          nextRun: status.nextRun,
          duration: recentJob && recentJob.completed_at ? 
            new Date(recentJob.completed_at).getTime() - new Date(recentJob.started_at).getTime() : undefined
        });
      }
      
      setJobMetrics(metrics);

    } catch (error) {
      console.error('Failed to load job data:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load job data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunJob = async (jobId: string) => {
    setRunningJobs(prev => new Set(prev).add(jobId));
    
    try {
      let result;
      if (jobId === 'popularity-aggregation') {
        result = await jobService.runPopularityAggregation();
      } else if (jobId === 'price-snapshots') {
        result = await jobService.runPriceSnapshots();
      }

      if (result?.success) {
        toast({
          title: 'Job Completed',
          description: `${jobId} completed successfully in ${result.duration ? Math.round(result.duration / 1000) : '?'}s`
        });
      } else {
        toast({
          title: 'Job Failed',
          description: result?.error || 'Unknown error',
          variant: 'destructive'
        });
      }

      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run job',
        variant: 'destructive'
      });
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleToggleJob = (jobId: string, enabled: boolean) => {
    try {
      jobService.setJobEnabled(jobId, enabled);
      loadData();
      
      toast({
        title: enabled ? 'Job Enabled' : 'Job Disabled',
        description: `${jobId} has been ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle job',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string, isRecent: boolean) => {
    if (!isRecent) return null;
    
    const variant = status === 'completed' ? 'default' : 
                   status === 'failed' ? 'destructive' : 
                   status === 'running' ? 'secondary' : 'outline';
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Background Jobs</h2>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Job Summary */}
      {jobSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Job Performance (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{jobSummary.total_jobs}</div>
                <div className="text-sm text-muted-foreground">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{jobSummary.successful_jobs}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{jobSummary.failed_jobs}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{jobSummary.running_jobs}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(jobSummary.success_rate)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scheduled jobs found. Click refresh to initialize jobs.
              </div>
            ) : (
              schedules.map(schedule => {
                const metrics = jobMetrics.get(schedule.jobId);
                const isRunning = runningJobs.has(schedule.jobId) || metrics?.status === 'running';

                return (
                  <div
                    key={schedule.jobId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{schedule.name}</h4>
                        {metrics && getStatusBadge(metrics.status, metrics.isRecent)}
                        {isRunning && (
                          <Badge variant="secondary">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Running
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Runs every {Math.round(schedule.interval / (60 * 60 * 1000))} hours
                      </p>
                      {metrics?.lastRun && (
                        <p className="text-xs text-muted-foreground">
                          Last run: {formatDistanceToNow(metrics.lastRun, { addSuffix: true })}
                          {metrics.duration && ` (${formatDuration(metrics.duration)})`}
                        </p>
                      )}
                      {metrics?.nextRun && schedule.enabled && (
                        <p className="text-xs text-muted-foreground">
                          Next run: {formatDistanceToNow(metrics.nextRun, { addSuffix: true })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(enabled) => handleToggleJob(schedule.jobId, enabled)}
                        disabled={isRunning}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunJob(schedule.jobId)}
                        disabled={isRunning || !schedule.enabled}
                      >
                        {isRunning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No job history available
                  </TableCell>
                </TableRow>
              ) : (
                jobHistory.map(job => {
                  const duration = job.completed_at
                    ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                    : null;

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        {job.job_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          <span className="capitalize">{job.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(job.started_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        {duration ? formatDuration(duration) : '-'}
                      </TableCell>
                      <TableCell>
                        {job.error_message && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-destructive truncate max-w-[200px]" title={job.error_message}>
                              {job.error_message}
                            </span>
                          </div>
                        )}
                        {job.metadata?.items_processed && (
                          <span className="text-sm text-muted-foreground">
                            {job.metadata.items_processed} items processed
                          </span>
                        )}
                        {job.metadata?.total_value && (
                          <span className="text-sm text-muted-foreground">
                            ${job.metadata.total_value.toLocaleString()} total value
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};