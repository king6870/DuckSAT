'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Filter, Eye, EyeOff } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import ChartRenderer from '@/components/ChartRenderer';

interface Question {
  id: string;
  question: string;
  passage?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  chartData?: any;
  difficulty: string;
  category: string;
  subtopic?: string;
  source?: string;
  timeEstimate: number;
  tags: string[];
  createdAt: string;
  subtopicRef?: {
    name: string;
    topic: {
      name: string;
    };
  };
}

interface QuestionResponse {
  questions: Question[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    categories: string[];
    subtopics: string[];
    sources: string[];
  };
}

export default function QuestionReviewPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [filters, setFilters] = useState<any>(null);

  const limit = 20;

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (currentPage * limit).toString(),
      });

      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubtopic) params.append('subtopic', selectedSubtopic);
      if (selectedSource) params.append('source', selectedSource);

      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch questions');

      const data: QuestionResponse = await response.json();
      setQuestions(data.questions);
      setFilters(data.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, selectedCategory, selectedSubtopic, selectedSource]);

  const filteredQuestions = questions.filter(question => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      question.question.toLowerCase().includes(searchLower) ||
      question.passage?.toLowerCase().includes(searchLower) ||
      question.category.toLowerCase().includes(searchLower) ||
      question.subtopic?.toLowerCase().includes(searchLower)
    );
  });

  const toggleAnswer = (questionId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading questions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-2">Error Loading Questions</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Question Review</h1>
        <p className="text-gray-600">Browse and review all questions in the database</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {filters?.categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subtopic</label>
              <Select value={selectedSubtopic} onValueChange={setSelectedSubtopic}>
                <SelectTrigger>
                  <SelectValue placeholder="All subtopics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subtopics</SelectItem>
                  {filters?.subtopics.map((subtopic: string) => (
                    <SelectItem key={subtopic} value={subtopic}>
                      {subtopic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Source</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sources</SelectItem>
                  {filters?.sources.map((source: string) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No questions found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline">{question.category}</Badge>
                      {question.subtopic && (
                        <Badge variant="secondary">{question.subtopic}</Badge>
                      )}
                      {question.source && (
                        <Badge variant="outline" className="text-xs">
                          {question.source}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      Created: {formatDate(question.createdAt)} • 
                      Time: {question.timeEstimate}s
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAnswer(question.id)}
                    className="flex items-center gap-2"
                  >
                    {showAnswers[question.id] ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide Answer
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Show Answer
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Passage */}
                {question.passage && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-900 mb-2">Passage:</h4>
                    <div className="text-blue-800 whitespace-pre-wrap">
                      <MathRenderer content={question.passage} />
                    </div>
                  </div>
                )}

                {/* Question */}
                <div>
                  <h4 className="font-semibold mb-2">Question:</h4>
                  <div className="text-gray-800">
                    <MathRenderer content={question.question} />
                  </div>
                </div>

                {/* Chart/Diagram */}
                {question.chartData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Diagram:</h4>
                    <ChartRenderer chartData={question.chartData} />
                  </div>
                )}

                {/* Image */}
                {question.imageUrl && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Image:</h4>
                    <img 
                      src={question.imageUrl} 
                      alt="Question diagram" 
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}

                {/* Answer Options */}
                <div>
                  <h4 className="font-semibold mb-2">Answer Options:</h4>
                  <div className="space-y-2">
                    {question.options.map((option, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded border ${
                          showAnswers[question.id] && index === question.correctAnswer
                            ? 'bg-green-50 border-green-300 border-2'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <MathRenderer content={option} />
                        {showAnswers[question.id] && index === question.correctAnswer && (
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            Correct
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                {showAnswers[question.id] && (
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-semibold text-green-900 mb-2">Explanation:</h4>
                    <div className="text-green-800">
                      <MathRenderer content={question.explanation} />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-gray-600">
          Showing {filteredQuestions.length} questions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage + 1}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!filters?.pagination?.hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
