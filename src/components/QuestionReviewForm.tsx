'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface QuestionReviewFormProps {
  questionId: string;
  onSubmitSuccess?: () => void;
}

export default function QuestionReviewForm({ questionId, onSubmitSuccess }: QuestionReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState('');
  const [hasDiagram, setHasDiagram] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/questions/${questionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          description: description.trim() || null,
          hasDiagram,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccess(true);
      setRating(0);
      setDescription('');
      setHasDiagram(false);
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Submit Your Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      (hoverRating || rating) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                You rated: {rating} star{rating > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              placeholder="Share your thoughts about this question..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Diagram Checkbox */}
          <div>
            <Checkbox
              id="hasDiagram"
              label="This question has a diagram"
              checked={hasDiagram}
              onChange={(e) => setHasDiagram(e.target.checked)}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-md border border-green-300 bg-green-50 text-green-800 p-3 text-sm">
              Review submitted successfully!
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
