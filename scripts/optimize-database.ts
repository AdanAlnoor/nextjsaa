#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
}

interface IndexSuggestion {
  table_name: string;
  column_names: string[];
  index_type: 'btree' | 'gin' | 'hash';
  reason: string;
  expected_improvement: string;
}

interface OptimizationReport {
  timestamp: string;
  slow_queries: SlowQuery[];
  index_suggestions: IndexSuggestion[];
  table_stats: any[];
  actions_taken: string[];
  performance_metrics: {
    before: any;
    after: any;
  };
}

class DatabaseOptimizer {
  private supabase: any;
  private report: OptimizationReport;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.report = {
      timestamp: new Date().toISOString(),
      slow_queries: [],
      index_suggestions: [],
      table_stats: [],
      actions_taken: [],
      performance_metrics: { before: {}, after: {} }
    };
  }

  async optimize(): Promise<OptimizationReport> {
    console.log('🚀 Starting database optimization...');
    
    try {
      // Collect baseline metrics
      await this.collectBaselineMetrics();
      
      // Analyze slow queries
      await this.analyzeSlowQueries();
      
      // Generate index suggestions
      await this.generateIndexSuggestions();
      
      // Update table statistics
      await this.updateTableStatistics();
      
      // Archive old data
      await this.archiveOldData();
      
      // Optimize materialized views
      await this.optimizeMaterializedViews();
      
      // Collect post-optimization metrics
      await this.collectPostOptimizationMetrics();
      
      // Generate and save report
      await this.generateReport();
      
      console.log('✅ Database optimization completed successfully');
      return this.report;
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      throw error;
    }
  }

  private async collectBaselineMetrics(): Promise<void> {
    console.log('📊 Collecting baseline performance metrics...');
    
    try {
      // Get database connection stats
      const { data: connections } = await this.supabase.rpc('get_db_connections');
      
      // Get database size
      const { data: dbSize } = await this.supabase.rpc('get_database_size');
      
      // Get table sizes
      const { data: tableSizes } = await this.supabase.rpc('get_table_sizes');
      
      this.report.performance_metrics.before = {
        connections,
        database_size: dbSize,
        table_sizes: tableSizes,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('⚠️ Could not collect all baseline metrics:', error);
    }
  }

  private async analyzeSlowQueries(): Promise<void> {
    console.log('🔍 Analyzing slow queries...');
    
    try {
      const { data: slowQueries } = await this.supabase.rpc('get_slow_queries');
      
      if (slowQueries && slowQueries.length > 0) {
        this.report.slow_queries = slowQueries;
        console.log(`Found ${slowQueries.length} slow queries`);
        
        // Log the top 3 slowest queries
        slowQueries.slice(0, 3).forEach((query: SlowQuery, index: number) => {
          console.log(`  ${index + 1}. Query taking ${query.mean_time.toFixed(2)}ms on average`);
        });
      } else {
        console.log('✅ No slow queries detected');
      }
      
    } catch (error) {
      console.warn('⚠️ Could not analyze slow queries:', error);
    }
  }

  private async generateIndexSuggestions(): Promise<void> {
    console.log('💡 Generating index suggestions...');
    
    // Analyze common query patterns and suggest indexes
    const suggestions: IndexSuggestion[] = [];
    
    // Check for missing indexes on foreign keys
    const foreignKeyQueries = [
      {
        table: 'estimate_element_items',
        columns: ['element_id', 'library_item_id'],
        type: 'btree' as const,
        reason: 'Foreign key lookups'
      },
      {
        table: 'library_items',
        columns: ['assembly_id', 'status'],
        type: 'btree' as const,
        reason: 'Assembly filtering with status'
      },
      {
        table: 'audit_logs',
        columns: ['user_id', 'timestamp'],
        type: 'btree' as const,
        reason: 'User activity queries'
      }
    ];

    for (const suggestion of foreignKeyQueries) {
      // Check if index already exists
      const indexExists = await this.checkIndexExists(suggestion.table, suggestion.columns);
      
      if (!indexExists) {
        suggestions.push({
          table_name: suggestion.table,
          column_names: suggestion.columns,
          index_type: suggestion.type,
          reason: suggestion.reason,
          expected_improvement: 'Faster JOIN and WHERE operations'
        });
      }
    }

    // Check for missing full-text search indexes
    const textSearchSuggestions = [
      {
        table: 'library_items',
        columns: ['name', 'description', 'code'],
        type: 'gin' as const,
        reason: 'Full-text search optimization'
      }
    ];

    for (const suggestion of textSearchSuggestions) {
      const indexExists = await this.checkTextSearchIndexExists(suggestion.table);
      
      if (!indexExists) {
        suggestions.push({
          table_name: suggestion.table,
          column_names: suggestion.columns,
          index_type: suggestion.type,
          reason: suggestion.reason,
          expected_improvement: 'Faster text search queries'
        });
      }
    }

    this.report.index_suggestions = suggestions;
    
    if (suggestions.length > 0) {
      console.log(`💡 Generated ${suggestions.length} index suggestions`);
      suggestions.forEach(suggestion => {
        console.log(`  - ${suggestion.table_name}: ${suggestion.column_names.join(', ')} (${suggestion.reason})`);
      });
    } else {
      console.log('✅ No additional indexes needed');
    }
  }

  private async checkIndexExists(tableName: string, columns: string[]): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc('check_index_exists', {
        table_name: tableName,
        column_names: columns
      });
      return data || false;
    } catch {
      return false;
    }
  }

  private async checkTextSearchIndexExists(tableName: string): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc('check_text_search_index_exists', {
        table_name: tableName
      });
      return data || false;
    } catch {
      return false;
    }
  }

  private async updateTableStatistics(): Promise<void> {
    console.log('📈 Updating table statistics...');
    
    try {
      // Update PostgreSQL statistics for better query planning
      await this.supabase.rpc('update_table_statistics');
      this.report.actions_taken.push('Updated table statistics for query planner');
      console.log('✅ Table statistics updated');
      
    } catch (error) {
      console.warn('⚠️ Could not update table statistics:', error);
    }
  }

  private async archiveOldData(): Promise<void> {
    console.log('🗄️ Archiving old data...');
    
    try {
      // Archive old audit logs (older than 90 days)
      const { data: archivedLogs } = await this.supabase.rpc('archive_old_audit_logs');
      
      if (archivedLogs > 0) {
        this.report.actions_taken.push(`Archived ${archivedLogs} old audit log entries`);
        console.log(`✅ Archived ${archivedLogs} audit log entries`);
      }
      
      // Archive old user behavior events (older than 180 days)
      const { data: archivedEvents } = await this.supabase.rpc('archive_old_behavior_events');
      
      if (archivedEvents > 0) {
        this.report.actions_taken.push(`Archived ${archivedEvents} old behavior events`);
        console.log(`✅ Archived ${archivedEvents} behavior events`);
      }
      
      // Clean up temporary data
      const { data: cleanedTemp } = await this.supabase.rpc('cleanup_temporary_data');
      
      if (cleanedTemp > 0) {
        this.report.actions_taken.push(`Cleaned up ${cleanedTemp} temporary records`);
        console.log(`✅ Cleaned up ${cleanedTemp} temporary records`);
      }
      
    } catch (error) {
      console.warn('⚠️ Could not complete data archiving:', error);
    }
  }

  private async optimizeMaterializedViews(): Promise<void> {
    console.log('🔄 Refreshing materialized views...');
    
    try {
      // Refresh popular items view
      await this.supabase.rpc('refresh_popular_items_mv');
      this.report.actions_taken.push('Refreshed mv_popular_library_items');
      
      console.log('✅ Materialized views refreshed');
      
    } catch (error) {
      console.warn('⚠️ Could not refresh materialized views:', error);
    }
  }

  private async collectPostOptimizationMetrics(): Promise<void> {
    console.log('📊 Collecting post-optimization metrics...');
    
    try {
      // Get updated connection stats
      const { data: connections } = await this.supabase.rpc('get_db_connections');
      
      // Get updated database size
      const { data: dbSize } = await this.supabase.rpc('get_database_size');
      
      this.report.performance_metrics.after = {
        connections,
        database_size: dbSize,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('⚠️ Could not collect post-optimization metrics:', error);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('📝 Generating optimization report...');
    
    const reportPath = path.join(process.cwd(), 'logs', `database-optimization-${Date.now()}.json`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(reportPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write detailed report
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    // Generate summary report
    const summaryReport = this.generateSummaryReport();
    const summaryPath = path.join(logsDir, `optimization-summary-${Date.now()}.txt`);
    fs.writeFileSync(summaryPath, summaryReport);
    
    console.log(`📁 Reports saved to:`);
    console.log(`  - Detailed: ${reportPath}`);
    console.log(`  - Summary: ${summaryPath}`);
  }

  private generateSummaryReport(): string {
    const actions = this.report.actions_taken;
    const slowQueries = this.report.slow_queries.length;
    const suggestions = this.report.index_suggestions.length;
    
    return `
Database Optimization Report
Generated: ${this.report.timestamp}

SUMMARY:
========
- Slow queries detected: ${slowQueries}
- Index suggestions: ${suggestions}
- Actions taken: ${actions.length}

ACTIONS PERFORMED:
=================
${actions.map(action => `- ${action}`).join('\n')}

PERFORMANCE RECOMMENDATIONS:
===========================
${this.report.index_suggestions.map(suggestion => 
  `- Add ${suggestion.index_type} index on ${suggestion.table_name}(${suggestion.column_names.join(', ')}) - ${suggestion.reason}`
).join('\n')}

${slowQueries > 0 ? `
SLOW QUERIES TO INVESTIGATE:
============================
${this.report.slow_queries.slice(0, 5).map((query, index) => 
  `${index + 1}. Average time: ${query.mean_time.toFixed(2)}ms, Calls: ${query.calls}`
).join('\n')}
` : 'No slow queries detected ✅'}
`;
  }
}

// Command line interface
if (require.main === module) {
  const optimizer = new DatabaseOptimizer();
  
  optimizer.optimize()
    .then(report => {
      console.log('\n🎉 Optimization completed successfully!');
      console.log(`📊 Actions taken: ${report.actions_taken.length}`);
      console.log(`💡 Index suggestions: ${report.index_suggestions.length}`);
      console.log(`🐌 Slow queries found: ${report.slow_queries.length}`);
    })
    .catch(error => {
      console.error('\n💥 Optimization failed:', error);
      process.exit(1);
    });
}

export { DatabaseOptimizer };