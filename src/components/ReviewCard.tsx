'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { cn } from '@/lib/utils';
import MathRenderer from '@/components/MathRenderer';
import ChartRenderer from '@/components/ChartRenderer';
import StarRating from '@/components/StarRating';
import Toast from '@/components/Toast';

interface Question {
  id: string;
  moduleType: string;
  difficulty: string;
  category: string;
  subtopic: string | null;
  question: string;
  passage: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  chartData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Review {
  id: string;
  rating: number;
  description: string | null;
  hasDiagram: boolean;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}

export interface ReviewCardProps {
  question: Question;
  onReviewSubmitted?: () => void;
  className?: string;
}

/**
 * Question card component with embedded review form
 * Displays question content, metadata, and allows users to submit reviews
 */
export default function ReviewCard({
  question,
  onReviewSubmitted,
  className,
}: ReviewCardProps) {
  const [rating, setRating] = useState(0);
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user?.email;
  const [description, setDescription] = useState('');
  const [diagramIsAccurate, setDiagramIsAccurate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({ averageRating: 0, totalReviews: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const hasDiagram = Boolean(question.imageUrl || question.chartData);
  const characterCount = description.length;
  const maxCharacters = 500;

  // Fetch reviews when component mounts or when reviews are toggled
  const fetchReviews = async () => {
    if (reviews.length > 0) return; // Already loaded
    
    setLoadingReviews(true);
    try {
      const response = await fetch(`/api/questions/${question.id}/review`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
        
        // Calculate summary
        if (data.length > 0) {
          const avgRating = data.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.length;
          setReviewSummary({ averageRating: avgRating, totalReviews: data.length });
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      showToast('Please select a star rating', 'error');
      return;
    }

    if (description.length > maxCharacters) {
      showToast(`Description must be ${maxCharacters} characters or less`, 'error');
      return;
    }

    setIsSubmitting(true);

    setIsSubmitting(true);
    let didFinish = false;
    try {
      const response = await fetch(`/api/questions/${question.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          description: description.trim() || null,
          hasDiagram: diagramIsAccurate,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse review API response:', jsonErr);
      }

      if (!response.ok) {
        console.error('Review API error:', response.status, data);
        showToast((data && data.error) || `Failed to submit review (status ${response.status})`, 'error');
        setIsSubmitting(false);
        return;
      }

      // Optimistic UI update
      const newAvgRating = reviewSummary.totalReviews > 0
        ? (reviewSummary.averageRating * reviewSummary.totalReviews + rating) / (reviewSummary.totalReviews + 1)
        : rating;
      setReviewSummary({
        averageRating: newAvgRating,
        totalReviews: reviewSummary.totalReviews + 1,
      });

      // Reset form
      setRating(0);
      setDescription('');
      setDiagramIsAccurate(false);

      // Refresh reviews
      setReviews([]);
      if (showReviews) {
        fetchReviews();
      }

      showToast('Review submitted successfully!', 'success');

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      // Force reload to guarantee DB/UI sync
      setTimeout(() => {
        window.location.reload();
      }, 500);
      didFinish = true;
    } catch (error) {
      console.error('Review submit error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
      if (!didFinish) {
        // Fallback: force UI update and error if stuck
        showToast('Review failed to submit. Please try again.', 'error');
      }
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (showReviews) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviews]);

  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      {/* Toast Notification */}
      {toastVisible && (
        <div className="absolute top-4 right-4 z-10 max-w-md">
          <Toast
            message={toastMessage}
            type={toastType}
            visible={toastVisible}
            onDismiss={() => setToastVisible(false)}
          />
        </div>
      )}

      <div className="p-6">
        {/* Header with badges and metadata */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                question.moduleType === 'math'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              )}
            >
              {question.moduleType}
            </span>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                question.difficulty === 'easy'
                  ? 'bg-green-100 text-green-800'
                  : question.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              )}
            >
              {question.difficulty}
            </span>
            <span className="text-xs text-gray-600">{question.category}</span>
            {question.subtopic && (
              <span className="text-xs text-gray-500">• {question.subtopic}</span>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
            {new Date(question.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Review Summary */}
        {reviewSummary.totalReviews > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <StarRating value={Math.round(reviewSummary.averageRating)} readOnly size={20} />
            <span className="text-sm text-gray-700">
              {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.totalReviews}{' '}
              {reviewSummary.totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {/* Passage (if exists) */}
        {question.passage && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Passage:</h4>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              <MathRenderer block={true}>{question.passage}</MathRenderer>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
          <div className="text-gray-800">
            <MathRenderer>{question.question}</MathRenderer>
          </div>
        </div>

        {/* Visual: Chart or Image with lazy loading */}
        {hasDiagram && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">
              {question.chartData ? 'Diagram' : 'Image'}
            </h4>
            <ChartRenderer
              chartData={question.chartData as Record<string, unknown>}
              imageUrl={question.imageUrl || undefined}
              imageAlt={question.imageAlt || 'Question diagram'}
              className="max-w-full"
            />
            {/* ChartRenderer now always shows a placeholder if no diagram is available */}
          </div>
        )}

        {/* Options */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Options:</h4>
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  'p-3 rounded-md text-sm',
                  index === question.correctAnswer
                    ? 'bg-green-50 border border-green-300'
                    : 'bg-gray-50'
                )}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
                <MathRenderer>{option}</MathRenderer>
                {index === question.correctAnswer && (
                  <span className="ml-2 text-green-600 font-semibold">(Correct)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
          <div className="text-gray-700 text-sm">
            <MathRenderer block={true}>{question.explanation}</MathRenderer>
          </div>
        </div>

        {/* Previous Reviews Toggle */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowReviews(!showReviews)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
          >
            {showReviews ? 'Hide' : 'Show'} Previous Reviews
            {reviewSummary.totalReviews > 0 && ` (${reviewSummary.totalReviews})`}
          </button>
        </div>

        {/* Display Previous Reviews */}
        {showReviews && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            {loadingReviews ? (
              <p className="text-sm text-gray-600">Loading reviews...</p>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white p-3 rounded-md border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {review.user.name || review.user.email}
                        </span>
                        <StarRating value={review.rating} readOnly size={16} />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.hasDiagram && (
                      <div className="text-xs text-blue-700 mb-1">✓ Diagram is accurate</div>
                    )}
                    {review.description && (
                      <p className="text-sm text-gray-700">{review.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No reviews yet</p>
            )}
          </div>
        )}

        {/* Review Form - Only if authenticated */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Review</h3>
          {!isAuthenticated ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4 flex flex-col items-center">
              <p className="text-yellow-800 font-medium mb-2">You must be logged in to submit a review.</p>
              <button
                onClick={() => signIn()}
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
              >
                Log In
              </button>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4" aria-disabled={!isAuthenticated}>
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <StarRating
                value={rating}
                onChange={setRating}
                ariaLabel="Question rating"
              />
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  You rated: {rating} star{rating > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Description with character counter */}
            <div>
              <label htmlFor={`description-${question.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id={`description-${question.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your thoughts about this question..."
                maxLength={maxCharacters}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                aria-describedby={`char-count-${question.id}`}
              />
              <p
                id={`char-count-${question.id}`}
                className={cn(
                  'text-xs mt-1 text-right',
                  characterCount > maxCharacters - 50 ? 'text-orange-600' : 'text-gray-500'
                )}
              >
                {characterCount}/{maxCharacters} characters
              </p>
            </div>

            {/* Diagram Accuracy Checkbox - Only show if question has a diagram */}
            {hasDiagram && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`diagram-${question.id}`}
                  checked={diagramIsAccurate}
                  onChange={(e) => setDiagramIsAccurate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  aria-label="Mark if the diagram is accurate"
                />
                <label htmlFor={`diagram-${question.id}`} className="text-sm font-medium text-gray-700">
                  Diagram is accurate
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || rating === 0 || !isAuthenticated}
              className={cn(
                'w-full px-4 py-2 rounded-md font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                rating === 0 || isSubmitting || !isAuthenticated
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
