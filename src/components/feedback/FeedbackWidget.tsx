'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Bug, 
  Lightbulb,
  Send,
  X,
  CheckCircle
} from 'lucide-react';

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'praise' | 'general';
  rating: number;
  message: string;
  context: string;
  userAgent: string;
  url: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface FeedbackWidgetProps {
  context?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showQuickActions?: boolean;
  customTrigger?: React.ReactNode;
}

export function FeedbackWidget({ 
  context = 'general',
  position = 'bottom-right',
  showQuickActions = true,
  customTrigger
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [showQuickFeedback, setShowQuickFeedback] = useState(false);

  // Auto-show feedback request for new users or after significant actions
  useEffect(() => {
    const shouldShowPrompt = shouldPromptForFeedback(context);
    if (shouldShowPrompt) {
      const timer = setTimeout(() => setShowQuickFeedback(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [context]);

  const feedbackTypes = [
    { type: 'bug' as const, label: 'Report Bug', icon: Bug, color: 'bg-red-100 text-red-800' },
    { type: 'feature' as const, label: 'Feature Request', icon: Lightbulb, color: 'bg-blue-100 text-blue-800' },
    { type: 'improvement' as const, label: 'Improvement', icon: ThumbsUp, color: 'bg-green-100 text-green-800' },
    { type: 'praise' as const, label: 'Praise', icon: Star, color: 'bg-yellow-100 text-yellow-800' },
    { type: 'general' as const, label: 'General', icon: MessageSquare, color: 'bg-gray-100 text-gray-800' }
  ];

  const handleSubmit = async () => {
    if (!message.trim() && rating === 0) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      rating,
      message: message.trim(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date(),
      sessionId: getSessionId(),
      metadata: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timestamp: Date.now()
      }
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        setIsSubmitted(true);
        
        // Track successful feedback submission
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'feedback_submitted', {
            feedback_type: feedbackType,
            rating,
            context
          });
        }

        // Reset form after delay
        setTimeout(() => {
          setIsOpen(false);
          setIsSubmitted(false);
          setMessage('');
          setRating(0);
          setFeedbackType('general');
        }, 2000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFeedback = async (type: 'positive' | 'negative') => {
    const quickFeedbackData: FeedbackData = {
      type: type === 'positive' ? 'praise' : 'improvement',
      rating: type === 'positive' ? 5 : 2,
      message: type === 'positive' ? 'Quick positive feedback' : 'Quick negative feedback',
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date(),
      sessionId: getSessionId(),
      metadata: { quickFeedback: true }
    };

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quickFeedbackData),
      });
      
      setShowQuickFeedback(false);
    } catch (error) {
      console.error('Error submitting quick feedback:', error);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
          }`}
          onClick={() => onChange(star)}
        />
      ))}
    </div>
  );

  // Quick feedback prompt
  if (showQuickFeedback && !isOpen) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 transition-all duration-300`}>
        <Card className="w-80 shadow-lg border-2 border-blue-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">How is your experience?</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickFeedback(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback('positive')}
                className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Good
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFeedback('negative')}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Issues
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQuickFeedback(false);
                  setIsOpen(true);
                }}
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const triggerButton = customTrigger || (
    <Button
      className="rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700"
      size="sm"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );

  return (
    <>
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            {triggerButton}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <DialogTitle className="text-xl mb-2">Thank you!</DialogTitle>
                <DialogDescription>
                  Your feedback has been submitted successfully. We appreciate your input!
                </DialogDescription>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Share Your Feedback</DialogTitle>
                  <DialogDescription>
                    Help us improve your experience. Your feedback is valuable to us.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Feedback Type Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">What type of feedback?</label>
                    <div className="flex flex-wrap gap-2">
                      {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
                        <Badge
                          key={type}
                          variant={feedbackType === type ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            feedbackType === type ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setFeedbackType(type)}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">How would you rate your experience?</label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>

                  {/* Message */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Tell us more {feedbackType === 'bug' ? '(steps to reproduce)' : ''}
                    </label>
                    <Textarea
                      placeholder={getPlaceholderText(feedbackType)}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Context Information */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Context:</strong> {context} • <strong>Page:</strong> {window.location.pathname}
                  </div>

                  {/* Submit Button */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || (message.trim().length === 0 && rating === 0)}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </div>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Feedback
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Helper functions
function shouldPromptForFeedback(context: string): boolean {
  // Logic to determine if we should prompt for feedback
  const lastPrompt = localStorage.getItem(`feedback_prompt_${context}`);
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  if (!lastPrompt || (now - parseInt(lastPrompt)) > oneWeek) {
    localStorage.setItem(`feedback_prompt_${context}`, now.toString());
    return true;
  }
  
  return false;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('feedback_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('feedback_session_id', sessionId);
  }
  return sessionId;
}

function getPlaceholderText(type: FeedbackData['type']): string {
  switch (type) {
    case 'bug':
      return 'Describe the bug and steps to reproduce it...';
    case 'feature':
      return 'Describe the feature you would like to see...';
    case 'improvement':
      return 'How can we improve this feature?';
    case 'praise':
      return 'What did you like about your experience?';
    default:
      return 'Share your thoughts with us...';
  }
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}