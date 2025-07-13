import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const feedbackData = await request.json();

    // Validate required fields
    if (!feedbackData.type || (!feedbackData.message && feedbackData.rating === 0)) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      );
    }

    // Get user info if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // Store feedback in database
    const { data: feedback, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: user?.id || null,
        session_id: feedbackData.sessionId,
        feedback_type: feedbackData.type,
        rating: feedbackData.rating || null,
        message: feedbackData.message,
        context: feedbackData.context,
        url: feedbackData.url,
        user_agent: feedbackData.userAgent,
        metadata: feedbackData.metadata || {},
        timestamp: feedbackData.timestamp,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store feedback:', error);
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 }
      );
    }

    // Process feedback for analytics
    await processFeedbackForAnalytics(feedback, supabase);

    // Send notification for critical feedback
    if (feedbackData.type === 'bug' || feedbackData.rating <= 2) {
      await sendCriticalFeedbackNotification(feedback);
    }

    return NextResponse.json({ 
      success: true, 
      feedbackId: feedback.id,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient();

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('user_feedback')
      .select('*')
      .order('timestamp', { ascending: false });

    // Add period filter
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    query = query.gte('timestamp', startDate.toISOString());

    // Add type filter
    if (type) {
      query = query.eq('feedback_type', type);
    }

    // Add status filter
    if (status) {
      query = query.eq('status', status);
    }

    const { data: feedback, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    // Generate analytics summary
    const analytics = generateFeedbackAnalytics(feedback || []);

    return NextResponse.json({
      success: true,
      feedback: feedback || [],
      analytics,
      total: feedback?.length || 0
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

async function processFeedbackForAnalytics(feedback: any, supabase: any) {
  try {
    // Update feedback analytics aggregation
    await supabase.rpc('update_feedback_analytics', {
      feedback_type: feedback.feedback_type,
      rating: feedback.rating,
      context: feedback.context
    });

    // Track sentiment trends
    const sentiment = calculateSentiment(feedback.message, feedback.rating);
    
    await supabase
      .from('feedback_sentiment_trends')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        context: feedback.context,
        positive_count: sentiment === 'positive' ? 1 : 0,
        negative_count: sentiment === 'negative' ? 1 : 0,
        neutral_count: sentiment === 'neutral' ? 1 : 0,
        avg_rating: feedback.rating || 0
      }, {
        onConflict: 'date,context',
        ignoreDuplicates: false
      });

  } catch (error) {
    console.warn('Failed to process feedback analytics:', error);
  }
}

async function sendCriticalFeedbackNotification(feedback: any) {
  try {
    // In a real implementation, this would send to Slack, email, or other notification systems
    console.log('Critical feedback received:', {
      id: feedback.id,
      type: feedback.feedback_type,
      rating: feedback.rating,
      context: feedback.context,
      message: feedback.message?.substring(0, 100) + (feedback.message?.length > 100 ? '...' : '')
    });

    // Could integrate with services like:
    // - Slack webhook
    // - Email service
    // - Discord webhook
    // - Teams notification
    
  } catch (error) {
    console.warn('Failed to send critical feedback notification:', error);
  }
}

function calculateSentiment(message: string, rating: number): 'positive' | 'negative' | 'neutral' {
  // Simple sentiment analysis based on rating and keywords
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  
  if (!message) return 'neutral';
  
  const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'awesome', 'fantastic'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'slow', 'confusing', 'frustrating'];
  
  const lowerMessage = message.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function generateFeedbackAnalytics(feedback: any[]) {
  const total = feedback.length;
  
  if (total === 0) {
    return {
      total: 0,
      averageRating: 0,
      typeBreakdown: {},
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
      contextBreakdown: {},
      statusBreakdown: {},
      trends: []
    };
  }

  // Calculate average rating
  const ratingsWithValues = feedback.filter(f => f.rating && f.rating > 0);
  const averageRating = ratingsWithValues.length > 0 
    ? ratingsWithValues.reduce((sum, f) => sum + f.rating, 0) / ratingsWithValues.length
    : 0;

  // Type breakdown
  const typeBreakdown = feedback.reduce((acc, f) => {
    acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sentiment breakdown
  const sentimentBreakdown = feedback.reduce((acc, f) => {
    const sentiment = calculateSentiment(f.message, f.rating);
    acc[sentiment]++;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });

  // Context breakdown
  const contextBreakdown = feedback.reduce((acc, f) => {
    acc[f.context] = (acc[f.context] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Status breakdown
  const statusBreakdown = feedback.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Trends (daily breakdown for last 30 days)
  const trends = calculateFeedbackTrends(feedback);

  return {
    total,
    averageRating: Math.round(averageRating * 10) / 10,
    typeBreakdown,
    sentimentBreakdown,
    contextBreakdown,
    statusBreakdown,
    trends
  };
}

function calculateFeedbackTrends(feedback: any[]) {
  const dailyTrends = new Map();
  
  feedback.forEach(f => {
    const date = new Date(f.timestamp).toISOString().split('T')[0];
    if (!dailyTrends.has(date)) {
      dailyTrends.set(date, {
        date,
        count: 0,
        averageRating: 0,
        totalRating: 0,
        ratingCount: 0
      });
    }
    
    const dayData = dailyTrends.get(date);
    dayData.count++;
    
    if (f.rating && f.rating > 0) {
      dayData.totalRating += f.rating;
      dayData.ratingCount++;
      dayData.averageRating = dayData.totalRating / dayData.ratingCount;
    }
  });
  
  return Array.from(dailyTrends.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
}