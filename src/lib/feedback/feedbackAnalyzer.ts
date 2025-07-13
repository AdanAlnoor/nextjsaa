export interface FeedbackTrends {
  period: 'daily' | 'weekly' | 'monthly';
  trends: Array<{
    date: string;
    totalFeedback: number;
    averageRating: number;
    sentimentScore: number;
    topIssues: string[];
    improvements: string[];
  }>;
  
  overallMetrics: {
    totalFeedback: number;
    averageRating: number;
    satisfactionScore: number;
    responseTime: number; // average time to respond to feedback
    resolutionRate: number; // % of issues resolved
  };
  
  categoryAnalysis: {
    mostCommonIssues: Array<{
      category: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
    }>;
    
    featureRequests: Array<{
      feature: string;
      requestCount: number;
      priority: 'low' | 'medium' | 'high';
      effort: 'small' | 'medium' | 'large';
    }>;
    
    praisedFeatures: Array<{
      feature: string;
      mentionCount: number;
      satisfaction: number;
    }>;
  };
  
  userSegmentAnalysis: {
    newUsers: { averageRating: number; commonIssues: string[] };
    powerUsers: { averageRating: number; commonRequests: string[] };
    mobileUsers: { averageRating: number; specificIssues: string[] };
  };
}

export interface Improvement {
  id: string;
  title: string;
  description: string;
  category: 'ui' | 'performance' | 'feature' | 'bug' | 'workflow';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  
  relatedFeedback: string[]; // feedback IDs
  suggestedSolution: string;
  estimatedTimeToImplement: number; // hours
  
  businessValue: {
    userSatisfactionImpact: number; // 1-10 scale
    productivityGain: number; // % improvement
    retentionImpact: number; // % improvement
  };
  
  feasibility: {
    technicalComplexity: 'low' | 'medium' | 'high';
    resourceRequirement: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class FeedbackAnalyzer {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async analyzeFeedbackTrends(
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    daysBack: number = 30
  ): Promise<FeedbackTrends> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get all feedback in the period
    const { data: feedback } = await this.supabase
      .from('user_feedback')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (!feedback || feedback.length === 0) {
      return this.getEmptyTrends(period);
    }

    // Group feedback by time periods
    const groupedFeedback = this.groupFeedbackByPeriod(feedback, period);
    
    // Analyze trends
    const trends = await this.calculateTrends(groupedFeedback);
    
    // Calculate overall metrics
    const overallMetrics = await this.calculateOverallMetrics(feedback);
    
    // Analyze categories
    const categoryAnalysis = await this.analyzeFeedbackCategories(feedback);
    
    // User segment analysis
    const userSegmentAnalysis = await this.analyzeUserSegments(feedback);

    return {
      period,
      trends,
      overallMetrics,
      categoryAnalysis,
      userSegmentAnalysis
    };
  }

  async generateImprovementSuggestions(
    feedbackIds?: string[],
    limitToContext?: string
  ): Promise<Improvement[]> {
    // Get feedback data
    let query = this.supabase
      .from('user_feedback')
      .select('*')
      .order('timestamp', { ascending: false });

    if (feedbackIds && feedbackIds.length > 0) {
      query = query.in('id', feedbackIds);
    }

    if (limitToContext) {
      query = query.eq('context', limitToContext);
    }

    const { data: feedback } = await query.limit(500);

    if (!feedback || feedback.length === 0) {
      return [];
    }

    // Analyze feedback and generate improvements
    const improvements: Improvement[] = [];

    // 1. Analyze bug reports
    const bugImprovements = await this.analyzeBugReports(feedback);
    improvements.push(...bugImprovements);

    // 2. Analyze feature requests
    const featureImprovements = await this.analyzeFeatureRequests(feedback);
    improvements.push(...featureImprovements);

    // 3. Analyze usability issues
    const usabilityImprovements = await this.analyzeUsabilityIssues(feedback);
    improvements.push(...usabilityImprovements);

    // 4. Analyze performance complaints
    const performanceImprovements = await this.analyzePerformanceIssues(feedback);
    improvements.push(...performanceImprovements);

    // Sort by priority and impact
    return improvements.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const impactOrder = { high: 3, medium: 2, low: 1 };
      
      const aScore = priorityOrder[a.priority] * impactOrder[a.impact];
      const bScore = priorityOrder[b.priority] * impactOrder[b.impact];
      
      return bScore - aScore;
    });
  }

  private groupFeedbackByPeriod(feedback: any[], period: 'daily' | 'weekly' | 'monthly') {
    const groups = new Map();

    feedback.forEach(item => {
      const date = new Date(item.timestamp);
      let key: string;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    return groups;
  }

  private async calculateTrends(groupedFeedback: Map<string, any[]>) {
    const trends = [];

    for (const [date, feedbackItems] of groupedFeedback) {
      const totalFeedback = feedbackItems.length;
      
      // Calculate average rating
      const ratingsWithValues = feedbackItems.filter(f => f.rating && f.rating > 0);
      const averageRating = ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValues.length
        : 0;

      // Calculate sentiment score
      const sentimentScore = this.calculateSentimentScore(feedbackItems);

      // Extract top issues and improvements
      const topIssues = this.extractTopIssues(feedbackItems);
      const improvements = this.extractImprovementMentions(feedbackItems);

      trends.push({
        date,
        totalFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        sentimentScore,
        topIssues,
        improvements
      });
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculateOverallMetrics(feedback: any[]) {
    const totalFeedback = feedback.length;
    
    // Average rating
    const ratingsWithValues = feedback.filter(f => f.rating && f.rating > 0);
    const averageRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValues.length
      : 0;

    // Satisfaction score (% of ratings 4 or above)
    const satisfiedRatings = ratingsWithValues.filter(f => f.rating >= 4).length;
    const satisfactionScore = ratingsWithValues.length > 0
      ? (satisfiedRatings / ratingsWithValues.length) * 100
      : 0;

    // Get response and resolution metrics from database
    const { data: responseMetrics } = await this.supabase
      .from('feedback_response_metrics')
      .select('avg_response_time, resolution_rate')
      .single();

    return {
      totalFeedback,
      averageRating: Math.round(averageRating * 10) / 10,
      satisfactionScore: Math.round(satisfactionScore),
      responseTime: responseMetrics?.avg_response_time || 0,
      resolutionRate: responseMetrics?.resolution_rate || 0
    };
  }

  private async analyzeFeedbackCategories(feedback: any[]) {
    // Most common issues
    const issueKeywords = ['bug', 'error', 'broken', 'slow', 'confusing', 'difficult'];
    const mostCommonIssues = this.extractCommonIssues(feedback, issueKeywords);

    // Feature requests
    const requestKeywords = ['add', 'feature', 'want', 'need', 'request', 'suggest'];
    const featureRequests = this.extractFeatureRequests(feedback, requestKeywords);

    // Praised features
    const praiseKeywords = ['love', 'great', 'excellent', 'perfect', 'amazing'];
    const praisedFeatures = this.extractPraisedFeatures(feedback, praiseKeywords);

    return {
      mostCommonIssues,
      featureRequests,
      praisedFeatures
    };
  }

  private async analyzeUserSegments(feedback: any[]) {
    // Get user metadata to segment feedback
    const userIds = [...new Set(feedback.filter(f => f.user_id).map(f => f.user_id))];
    
    // Simplified segmentation - in reality would need more user data
    const mobileUsers = feedback.filter(f => 
      f.user_agent && (f.user_agent.includes('Mobile') || f.user_agent.includes('Android'))
    );

    const newUsers = feedback.filter(f => {
      // Assume users created within last 30 days are "new"
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(f.timestamp) > thirtyDaysAgo;
    });

    // Power users would need more complex logic based on usage patterns
    const powerUsers = feedback.filter(f => f.context.includes('bulk') || f.context.includes('advanced'));

    return {
      newUsers: {
        averageRating: this.calculateAverageRating(newUsers),
        commonIssues: this.extractTopIssues(newUsers)
      },
      powerUsers: {
        averageRating: this.calculateAverageRating(powerUsers),
        commonRequests: this.extractFeatureRequestKeywords(powerUsers)
      },
      mobileUsers: {
        averageRating: this.calculateAverageRating(mobileUsers),
        specificIssues: this.extractTopIssues(mobileUsers)
      }
    };
  }

  private async analyzeBugReports(feedback: any[]): Promise<Improvement[]> {
    const bugReports = feedback.filter(f => 
      f.feedback_type === 'bug' || 
      this.containsBugKeywords(f.message)
    );

    const improvements: Improvement[] = [];
    
    // Group similar bug reports
    const bugGroups = this.groupSimilarFeedback(bugReports);
    
    for (const [category, bugs] of bugGroups) {
      if (bugs.length >= 2) { // Only create improvements for recurring issues
        improvements.push({
          id: `bug_${category}_${Date.now()}`,
          title: `Fix ${category} issues`,
          description: `Multiple users reported issues with ${category}`,
          category: 'bug',
          priority: bugs.length > 5 ? 'high' : 'medium',
          effort: 'medium',
          impact: bugs.length > 5 ? 'high' : 'medium',
          relatedFeedback: bugs.map(b => b.id),
          suggestedSolution: this.generateBugFixSuggestion(category, bugs),
          estimatedTimeToImplement: this.estimateBugFixTime(category, bugs.length),
          businessValue: {
            userSatisfactionImpact: Math.min(bugs.length, 10),
            productivityGain: bugs.length * 2,
            retentionImpact: bugs.length > 5 ? 15 : 5
          },
          feasibility: {
            technicalComplexity: 'medium',
            resourceRequirement: 'medium',
            riskLevel: 'low'
          }
        });
      }
    }

    return improvements;
  }

  private async analyzeFeatureRequests(feedback: any[]): Promise<Improvement[]> {
    const featureRequests = feedback.filter(f => 
      f.feedback_type === 'feature' || 
      this.containsFeatureKeywords(f.message)
    );

    const improvements: Improvement[] = [];
    
    // Group similar feature requests
    const requestGroups = this.groupSimilarFeedback(featureRequests);
    
    for (const [feature, requests] of requestGroups) {
      if (requests.length >= 3) { // Need multiple requests for a feature
        improvements.push({
          id: `feature_${feature}_${Date.now()}`,
          title: `Implement ${feature}`,
          description: `Users requested ${feature} functionality`,
          category: 'feature',
          priority: requests.length > 10 ? 'high' : 'medium',
          effort: this.estimateFeatureEffort(feature),
          impact: requests.length > 10 ? 'high' : 'medium',
          relatedFeedback: requests.map(r => r.id),
          suggestedSolution: this.generateFeatureSuggestion(feature, requests),
          estimatedTimeToImplement: this.estimateFeatureTime(feature),
          businessValue: {
            userSatisfactionImpact: Math.min(requests.length / 2, 10),
            productivityGain: requests.length * 5,
            retentionImpact: requests.length > 10 ? 25 : 10
          },
          feasibility: {
            technicalComplexity: this.assessFeatureComplexity(feature),
            resourceRequirement: 'medium',
            riskLevel: 'medium'
          }
        });
      }
    }

    return improvements;
  }

  private async analyzeUsabilityIssues(feedback: any[]): Promise<Improvement[]> {
    const usabilityIssues = feedback.filter(f => 
      this.containsUsabilityKeywords(f.message) || f.rating <= 2
    );

    // Implementation would analyze UI/UX issues and suggest improvements
    return [];
  }

  private async analyzePerformanceIssues(feedback: any[]): Promise<Improvement[]> {
    const performanceIssues = feedback.filter(f => 
      this.containsPerformanceKeywords(f.message)
    );

    // Implementation would analyze performance complaints and suggest optimizations
    return [];
  }

  // Helper methods
  private calculateSentimentScore(feedback: any[]): number {
    if (feedback.length === 0) return 0;
    
    let totalScore = 0;
    feedback.forEach(f => {
      const rating = f.rating || 3; // neutral if no rating
      const messageScore = this.analyzeMessageSentiment(f.message);
      totalScore += (rating + messageScore) / 2;
    });
    
    return Math.round((totalScore / feedback.length) * 10) / 10;
  }

  private analyzeMessageSentiment(message: string): number {
    if (!message) return 3; // neutral
    
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'slow'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 4 + Math.min(positiveCount, 1);
    if (negativeCount > positiveCount) return 2 - Math.min(negativeCount, 1);
    return 3;
  }

  private extractTopIssues(feedback: any[]): string[] {
    const issueWords = ['bug', 'error', 'broken', 'slow', 'confusing', 'difficult', 'problem'];
    const issueCounts = new Map();

    feedback.forEach(f => {
      if (f.message) {
        issueWords.forEach(word => {
          if (f.message.toLowerCase().includes(word)) {
            issueCounts.set(word, (issueCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    return Array.from(issueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractImprovementMentions(feedback: any[]): string[] {
    const improvementWords = ['better', 'improve', 'easier', 'faster', 'simpler'];
    const improvementCounts = new Map();

    feedback.forEach(f => {
      if (f.message) {
        improvementWords.forEach(word => {
          if (f.message.toLowerCase().includes(word)) {
            improvementCounts.set(word, (improvementCounts.get(word) || 0) + 1);
          }
        });
      }
    });

    return Array.from(improvementCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  private extractCommonIssues(feedback: any[], keywords: string[]) {
    // Simplified implementation - would use more sophisticated text analysis
    return keywords.map(keyword => ({
      category: keyword,
      count: feedback.filter(f => f.message?.toLowerCase().includes(keyword)).length,
      severity: 'medium' as const,
      impact: 'medium' as const
    })).filter(issue => issue.count > 0).slice(0, 5);
  }

  private extractFeatureRequests(feedback: any[], keywords: string[]) {
    // Simplified implementation
    return keywords.map(keyword => ({
      feature: keyword,
      requestCount: feedback.filter(f => f.message?.toLowerCase().includes(keyword)).length,
      priority: 'medium' as const,
      effort: 'medium' as const
    })).filter(request => request.requestCount > 0).slice(0, 5);
  }

  private extractPraisedFeatures(feedback: any[], keywords: string[]) {
    // Simplified implementation
    return keywords.map(keyword => ({
      feature: keyword,
      mentionCount: feedback.filter(f => f.message?.toLowerCase().includes(keyword)).length,
      satisfaction: 8.5
    })).filter(feature => feature.mentionCount > 0).slice(0, 5);
  }

  private calculateAverageRating(feedback: any[]): number {
    const ratingsWithValues = feedback.filter(f => f.rating && f.rating > 0);
    return ratingsWithValues.length > 0
      ? Math.round((ratingsWithValues.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValues.length) * 10) / 10
      : 0;
  }

  private extractFeatureRequestKeywords(feedback: any[]): string[] {
    return this.extractTopIssues(feedback); // Simplified
  }

  private containsBugKeywords(message: string): boolean {
    const bugKeywords = ['bug', 'error', 'broken', 'crash', 'issue', 'problem'];
    return bugKeywords.some(keyword => message?.toLowerCase().includes(keyword));
  }

  private containsFeatureKeywords(message: string): boolean {
    const featureKeywords = ['add', 'feature', 'want', 'need', 'request', 'suggest', 'would like'];
    return featureKeywords.some(keyword => message?.toLowerCase().includes(keyword));
  }

  private containsUsabilityKeywords(message: string): boolean {
    const usabilityKeywords = ['confusing', 'difficult', 'hard to', 'unclear', 'complex'];
    return usabilityKeywords.some(keyword => message?.toLowerCase().includes(keyword));
  }

  private containsPerformanceKeywords(message: string): boolean {
    const performanceKeywords = ['slow', 'fast', 'performance', 'speed', 'loading'];
    return performanceKeywords.some(keyword => message?.toLowerCase().includes(keyword));
  }

  private groupSimilarFeedback(feedback: any[]): Map<string, any[]> {
    // Simplified grouping - would use more sophisticated text similarity
    const groups = new Map();
    
    feedback.forEach(f => {
      const key = this.extractKeyCategory(f.message);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(f);
    });

    return groups;
  }

  private extractKeyCategory(message: string): string {
    if (!message) return 'general';
    
    const categories = ['library', 'search', 'bulk', 'mobile', 'performance', 'ui'];
    const lowerMessage = message.toLowerCase();
    
    for (const category of categories) {
      if (lowerMessage.includes(category)) {
        return category;
      }
    }
    
    return 'general';
  }

  private generateBugFixSuggestion(category: string, bugs: any[]): string {
    return `Review and fix ${category} functionality based on ${bugs.length} user reports`;
  }

  private estimateBugFixTime(category: string, count: number): number {
    const baseHours = 8;
    const complexityMultiplier = Math.min(count / 5, 2);
    return Math.round(baseHours * complexityMultiplier);
  }

  private generateFeatureSuggestion(feature: string, requests: any[]): string {
    return `Implement ${feature} feature requested by ${requests.length} users`;
  }

  private estimateFeatureTime(feature: string): number {
    const baseHours = 40; // Default estimate
    return baseHours;
  }

  private estimateFeatureEffort(feature: string): 'small' | 'medium' | 'large' {
    // Simplified logic
    return 'medium';
  }

  private assessFeatureComplexity(feature: string): 'low' | 'medium' | 'high' {
    // Simplified logic
    return 'medium';
  }

  private getEmptyTrends(period: 'daily' | 'weekly' | 'monthly'): FeedbackTrends {
    return {
      period,
      trends: [],
      overallMetrics: {
        totalFeedback: 0,
        averageRating: 0,
        satisfactionScore: 0,
        responseTime: 0,
        resolutionRate: 0
      },
      categoryAnalysis: {
        mostCommonIssues: [],
        featureRequests: [],
        praisedFeatures: []
      },
      userSegmentAnalysis: {
        newUsers: { averageRating: 0, commonIssues: [] },
        powerUsers: { averageRating: 0, commonRequests: [] },
        mobileUsers: { averageRating: 0, specificIssues: [] }
      }
    };
  }
}