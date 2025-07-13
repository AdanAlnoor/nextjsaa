import { createClient } from '@/lib/supabase/client';

export interface JobSchedule {
  jobId: string;
  name: string;
  interval: number; // milliseconds
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  executedAt: Date;
  duration?: number;
}

export interface JobHistory {
  id: string;
  job_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: any;
}

export interface JobSummary {
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  running_jobs: number;
  success_rate: number;
  avg_duration_seconds: number;
  by_job_name: Record<string, {
    total: number;
    successful: number;
    failed: number;
  }>;
}

export class BackgroundJobService {
  private static instance: BackgroundJobService;
  private supabase: any;
  private jobs: Map<string, NodeJS.Timeout> = new Map();
  private schedules: Map<string, JobSchedule> = new Map();
  private isInitialized = false;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): BackgroundJobService {
    if (!this.instance) {
      this.instance = new BackgroundJobService();
    }
    return this.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  async initialize(options: {
    enablePopularityAggregation?: boolean;
    enablePriceSnapshots?: boolean;
    popularityIntervalHours?: number;
    snapshotIntervalHours?: number;
  } = {}) {
    if (this.isInitialized) {
      console.log('BackgroundJobService already initialized');
      return;
    }

    const {
      enablePopularityAggregation = true,
      enablePriceSnapshots = true,
      popularityIntervalHours = 24,
      snapshotIntervalHours = 168 // 7 days
    } = options;

    try {
      // Initialize job schedules
      if (enablePopularityAggregation) {
        this.schedulePopularityAggregation(popularityIntervalHours);
      }

      if (enablePriceSnapshots) {
        this.schedulePriceSnapshots(snapshotIntervalHours);
      }

      this.isInitialized = true;
      console.log('Background job service initialized successfully');
      
      // Clean up old logs on startup
      await this.cleanupOldLogs();
      
    } catch (error) {
      console.error('Failed to initialize background job service:', error);
      throw error;
    }
  }

  /**
   * Schedule popularity aggregation job
   */
  schedulePopularityAggregation(intervalHours: number = 24) {
    const jobId = 'popularity-aggregation';
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const schedule: JobSchedule = {
      jobId,
      name: 'Library Popularity Aggregation',
      interval: intervalMs,
      enabled: true,
      nextRun: new Date(Date.now() + intervalMs)
    };

    this.stopJob(jobId);
    this.schedules.set(jobId, schedule);

    if (schedule.enabled) {
      // Run immediately on first schedule
      setTimeout(() => this.runPopularityAggregation(), 1000);
      
      // Then run on interval
      const job = setInterval(async () => {
        await this.runPopularityAggregation();
        // Update next run time
        const updatedSchedule = this.schedules.get(jobId);
        if (updatedSchedule) {
          updatedSchedule.nextRun = new Date(Date.now() + intervalMs);
          this.schedules.set(jobId, updatedSchedule);
        }
      }, intervalMs);

      this.jobs.set(jobId, job);
      console.log(`Scheduled popularity aggregation every ${intervalHours} hours`);
    }
  }

  /**
   * Run popularity aggregation manually
   */
  async runPopularityAggregation(): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      console.log('Running popularity aggregation...');
      
      const { data, error } = await this.supabase.functions.invoke(
        'aggregate-library-popularity',
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (error) {
        console.error('Popularity aggregation error:', error);
        throw error;
      }

      const duration = Date.now() - startTime;
      
      // Update last run time
      const schedule = this.schedules.get('popularity-aggregation');
      if (schedule) {
        schedule.lastRun = new Date();
        this.schedules.set('popularity-aggregation', schedule);
      }

      console.log(`Popularity aggregation completed in ${duration}ms`);

      return {
        success: true,
        data,
        executedAt: new Date(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('Popularity aggregation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        executedAt: new Date(),
        duration
      };
    }
  }

  /**
   * Schedule price snapshots for all active projects
   */
  schedulePriceSnapshots(intervalHours: number = 168) { // Default weekly
    const jobId = 'price-snapshots';
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const schedule: JobSchedule = {
      jobId,
      name: 'Project Price Snapshots',
      interval: intervalMs,
      enabled: true,
      nextRun: new Date(Date.now() + intervalMs)
    };

    this.stopJob(jobId);
    this.schedules.set(jobId, schedule);

    if (schedule.enabled) {
      const job = setInterval(async () => {
        await this.runPriceSnapshots();
        // Update next run time
        const updatedSchedule = this.schedules.get(jobId);
        if (updatedSchedule) {
          updatedSchedule.nextRun = new Date(Date.now() + intervalMs);
          this.schedules.set(jobId, updatedSchedule);
        }
      }, intervalMs);

      this.jobs.set(jobId, job);
      console.log(`Scheduled price snapshots every ${intervalHours} hours`);
    }
  }

  /**
   * Run price snapshots for all active projects
   */
  async runPriceSnapshots(): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      console.log('Running price snapshots for all active projects...');
      
      // Get all active projects
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('is_active', true);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      // Capture snapshot for each project
      for (const project of projects || []) {
        try {
          const result = await this.capturePriceSnapshot(project.id);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
          results.push({ 
            projectId: project.id, 
            projectName: project.name,
            success: result.success, 
            error: result.error 
          });
        } catch (error: any) {
          console.error(`Failed to capture snapshot for project ${project.id}:`, error);
          results.push({ 
            projectId: project.id, 
            projectName: project.name,
            success: false, 
            error: error.message 
          });
          failureCount++;
        }
      }

      const duration = Date.now() - startTime;
      
      // Update last run time
      const schedule = this.schedules.get('price-snapshots');
      if (schedule) {
        schedule.lastRun = new Date();
        this.schedules.set('price-snapshots', schedule);
      }

      console.log(`Price snapshots completed in ${duration}ms: ${successCount} successful, ${failureCount} failed`);

      return {
        success: failureCount === 0,
        data: {
          processed: projects?.length || 0,
          successful: successCount,
          failed: failureCount,
          results
        },
        executedAt: new Date(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('Price snapshots job failed:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        executedAt: new Date(),
        duration
      };
    }
  }

  /**
   * Capture price snapshot for a specific project
   */
  async capturePriceSnapshot(projectId: string, includeAllItems: boolean = false): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Capturing price snapshot for project: ${projectId}`);
      
      const { data, error } = await this.supabase.functions.invoke(
        'capture-price-snapshot',
        {
          body: { projectId, includeAllItems },
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (error) {
        console.error('Price snapshot error:', error);
        throw error;
      }

      const duration = Date.now() - startTime;
      console.log(`Price snapshot for project ${projectId} completed in ${duration}ms`);

      return {
        success: true,
        data,
        executedAt: new Date(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`Price snapshot failed for project ${projectId}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        executedAt: new Date(),
        duration
      };
    }
  }

  /**
   * Run complex factor calculations
   */
  async calculateComplexFactors(
    libraryItemIds: string[],
    projectId: string,
    options: {
      includeIndirectCosts?: boolean;
      includeOverheads?: boolean;
      includeContingency?: boolean;
      indirectCostPercentage?: number;
      overheadPercentage?: number;
      contingencyPercentage?: number;
      bulkDiscountPercentage?: number;
      locationAdjustmentFactor?: number;
      seasonalAdjustmentFactor?: number;
    } = {}
  ): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Calculating complex factors for ${libraryItemIds.length} items in project ${projectId}`);
      
      const { data, error } = await this.supabase.functions.invoke(
        'calculate-complex-factors',
        {
          body: {
            libraryItemIds,
            projectId,
            options
          },
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (error) {
        console.error('Complex factors calculation error:', error);
        throw error;
      }

      const duration = Date.now() - startTime;
      console.log(`Complex factors calculation completed in ${duration}ms`);

      return {
        success: true,
        data,
        executedAt: new Date(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('Complex factors calculation failed:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        executedAt: new Date(),
        duration
      };
    }
  }

  /**
   * Get job execution history
   */
  async getJobHistory(
    jobName?: string,
    limit: number = 50
  ): Promise<JobHistory[]> {
    try {
      let query = this.supabase
        .from('background_job_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (jobName) {
        query = query.eq('job_name', jobName);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching job history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get job history:', error);
      return [];
    }
  }

  /**
   * Get job execution summary
   */
  async getJobSummary(daysBack: number = 7): Promise<JobSummary> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_job_execution_summary', { days_back: daysBack });

      if (error) {
        console.error('Error fetching job summary:', error);
        throw error;
      }

      return data || {
        total_jobs: 0,
        successful_jobs: 0,
        failed_jobs: 0,
        running_jobs: 0,
        success_rate: 0,
        avg_duration_seconds: 0,
        by_job_name: {}
      };
    } catch (error) {
      console.error('Failed to get job summary:', error);
      return {
        total_jobs: 0,
        successful_jobs: 0,
        failed_jobs: 0,
        running_jobs: 0,
        success_rate: 0,
        avg_duration_seconds: 0,
        by_job_name: {}
      };
    }
  }

  /**
   * Get active schedules
   */
  getActiveSchedules(): JobSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Stop a specific job
   */
  stopJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      clearInterval(job);
      this.jobs.delete(jobId);
      console.log(`Stopped job: ${jobId}`);
    }

    // Update schedule to disabled
    const schedule = this.schedules.get(jobId);
    if (schedule) {
      schedule.enabled = false;
      this.schedules.set(jobId, schedule);
    }
  }

  /**
   * Stop all background jobs
   */
  stopAllJobs() {
    console.log('Stopping all background jobs...');
    
    for (const [jobId, job] of this.jobs) {
      clearInterval(job);
      console.log(`Stopped job: ${jobId}`);
    }
    
    this.jobs.clear();
    this.schedules.clear();
    this.isInitialized = false;
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean) {
    const schedule = this.schedules.get(jobId);
    if (!schedule) {
      console.warn(`Job ${jobId} not found`);
      return;
    }

    schedule.enabled = enabled;
    
    if (enabled) {
      // Restart the job
      if (jobId === 'popularity-aggregation') {
        this.schedulePopularityAggregation(schedule.interval / (60 * 60 * 1000));
      } else if (jobId === 'price-snapshots') {
        this.schedulePriceSnapshots(schedule.interval / (60 * 60 * 1000));
      }
      console.log(`Enabled job: ${jobId}`);
    } else {
      // Stop the job
      this.stopJob(jobId);
      console.log(`Disabled job: ${jobId}`);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    schedule?: JobSchedule;
    lastExecution?: JobHistory;
    isRunning: boolean;
    nextRun?: Date;
  }> {
    const schedule = this.schedules.get(jobId);
    const isRunning = this.jobs.has(jobId) && schedule?.enabled;

    // Get last execution from logs
    const history = await this.getJobHistory(jobId, 1);
    const lastExecution = history[0];

    return {
      schedule,
      lastExecution,
      isRunning: isRunning || false,
      nextRun: schedule?.nextRun
    };
  }

  /**
   * Clean up old job logs (older than 30 days)
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('clean_old_job_logs');
      if (error) {
        console.error('Error cleaning old job logs:', error);
      } else {
        console.log('Old job logs cleaned up successfully');
      }
    } catch (error) {
      console.error('Failed to clean up old logs:', error);
    }
  }

  /**
   * Track library item usage (helper method)
   */
  async trackLibraryItemUsage(
    libraryItemId: string,
    projectId: string,
    estimateId?: string,
    elementId?: string,
    quantity: number = 1
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('track_library_item_usage', {
        p_library_item_id: libraryItemId,
        p_project_id: projectId,
        p_estimate_id: estimateId,
        p_element_id: elementId,
        p_quantity: quantity
      });

      if (error) {
        console.error('Error tracking library item usage:', error);
      }
    } catch (error) {
      console.error('Failed to track library item usage:', error);
    }
  }

  /**
   * Get library item statistics
   */
  async getLibraryItemStatistics(itemId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('get_library_item_statistics', {
        item_id: itemId
      });

      if (error) {
        console.error('Error fetching library item statistics:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get library item statistics:', error);
      return null;
    }
  }
}