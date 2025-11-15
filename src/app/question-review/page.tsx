'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, Filter, Eye, EyeOff } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import ChartRenderer from '@/components/ChartRenderer';
import QuestionReviewForm from '@/components/QuestionReviewForm';

type ScatterPoint = { x: number; y: number; label?: string };
type ScatterChartData = { type?: 'scatter'; points?: ScatterPoint[]; line?: boolean; description?: string };
type BarItem = { label?: string; student?: string; value?: number; score?: number };
type BarChartData = { type?: 'bar'; data?: BarItem[]; description?: string };
type GeometryChartData = { type?: 'geometry'; shape?: string; angles?: number[]; description?: string };
type ImageDiagramData = { diagramType: 'image'; imageUrl: string };

// Fallback allows unknown keys without using any
type ChartData = ScatterChartData | BarChartData | GeometryChartData | ImageDiagramData | { [key: string]: unknown };

type WrongAnswerExplanations =
  | string[]
  | Record<number, string>
  | Record<string, string>;

interface Question {
  id: string;
  question: string;
  passage?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  imageUrl?: string;
  imageAlt?: string;
  chartData?: ChartData;
  difficulty: string;
  category: string;
  subtopic?: string;
  source?: string;
  timeEstimate: number;
  tags: string[];
  moduleType: string;
  createdAt: string;
  updatedAt?: string;
  wrongAnswerExplanations?: WrongAnswerExplanations;
  reviewStatus?: string;
  reviewComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  subtopicRef?: {
    name: string;
    topic?: {
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

interface ErrorResponse {
  error: string;
  message?: string;
  details?: string;
}

export default function QuestionReviewPage() {
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDatabaseUnavailable, setIsDatabaseUnavailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showAnswers, setShowAnswers] = useState<{ [key: string]: boolean }>({});
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [filters, setFilters] = useState<QuestionResponse['filters'] | null>(null);
  const [pagination, setPagination] = useState<{ total: number; limit: number; offset: number; hasMore: boolean } | null>(null);
  const [readableMode, setReadableMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
 
  const limit = 20;

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsDatabaseUnavailable(false);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (currentPage * limit).toString(),
      });

      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSubtopic) params.append('subtopic', selectedSubtopic);
      if (selectedSource) params.append('source', selectedSource);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (sortOrder) params.append('sortOrder', sortOrder as 'asc' | 'desc');

      const response = await fetch(`/api/questions?${params}`);
      
      // Check for error responses
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        
        // Handle database unavailable error (503)
        if (response.status === 503 && errorData.error === 'database_unavailable') {
          setIsDatabaseUnavailable(true);
          setError(errorData.message || 'Database is temporarily unavailable. Please try again later.');
          return;
        }
        
        // Handle other errors
        throw new Error(errorData.message || errorData.details || 'Failed to fetch questions');
      }

      const data: QuestionResponse = await response.json();

      // Normalize questions for display
      const normalizedQuestions = data.questions.map((q) => {
  const normalizedOptions = normalizeOptionsWithContext(q.options, q.question, q.explanation, q.reviewComments);
        const normalizedCorrect = normalizeCorrectAnswer(q.correctAnswer as unknown, normalizedOptions.length);
        const normalizedExplanation =
          typeof q.explanation === 'string' ? cleanText(q.explanation) : q.explanation;
        const normalizedQuestionText =
          typeof q.question === 'string' ? cleanText(q.question) : q.question;
        const normalizedPassage =
          typeof q.passage === 'string' ? cleanText(q.passage) : q.passage;
        const normalizedWrong = normalizeWrongExplanations(q.wrongAnswerExplanations);
        const normalizedTags = Array.isArray(q.tags) ? q.tags.map((t) => cleanText(String(t))) : [];
        const normalizedImageAlt = typeof q.imageAlt === 'string' ? cleanText(q.imageAlt) : q.imageAlt;
        const normalizedSource = typeof q.source === 'string' ? cleanText(q.source) : q.source;

        return {
          ...q,
          options: normalizedOptions,
          correctAnswer: normalizedCorrect,
          explanation: normalizedExplanation,
          question: normalizedQuestionText,
          passage: normalizedPassage,
          wrongAnswerExplanations: normalizedWrong,
          tags: normalizedTags,
          imageAlt: normalizedImageAlt,
          source: normalizedSource,
        };
      });

      setQuestions(normalizedQuestions);
      setFilters(data.filters);
      setPagination(data.pagination);
      
      // Clear error on successful fetch
      setError(null);
      setIsDatabaseUnavailable(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handler for manual retry
  const handleRetry = () => {
    fetchQuestions();
  };

  // Auto-refresh questions every 30 seconds to keep the page updated with database changes
  useEffect(() => {
    fetchQuestions();

    const interval = setInterval(() => {
      fetchQuestions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [currentPage, selectedCategory, selectedSubtopic, selectedSource, debouncedSearchTerm, sortOrder]);

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

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
  });

  const toggleAnswer = (questionId: string) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const toggleDetails = (questionId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-black';
      case 'medium': return 'bg-yellow-100 text-black';
      case 'hard': return 'bg-red-100 text-black';
      default: return 'bg-gray-100 text-black';
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
 
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Normalization helpers to fix display issues ---
  // Helper to clean a single option text
  const cleanOptionText = (text: string): string => {
    const cleaned = cleanText(unescapeUnicode(String(text)));
    // Only strip leading labels when followed by punctuation (to avoid removing math like "A = 5")
    return stripLeadingLabel(cleaned);
  };

  // Handle various string formats that contain multiple options
  const normalizeOptionsString = (text: string): string[] => {
    // Early exit for empty
    const cleaned = text.trim();
    if (!cleaned) return [];

    // Try to split on newlines first (most common format)
    let parts = cleaned.split(/\\n|\n/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map(cleanOptionText);
    }

    // Try to split on letter-parenthesis: "A) First B) Second"
    parts = cleaned.split(/(?=[A-D][).:])/i).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map(cleanOptionText);
    }

    // Try semicolon split: "First; Second; Third; Fourth"
    parts = cleaned.split(/[;|]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts;
    }

    // Single option - pass through
    return [cleaned];
  };

  // Decode common HTML entities and normalize whitespace while preserving newlines
  const decodeEntities = (text: string) => {
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return (doc.documentElement.textContent ?? '').toString();
    } catch {
      try {
        const el = document.createElement('div');
        el.innerHTML = text;
        return el.textContent ?? text;
      } catch {
        return text;
      }
    }
  };

  // Unescape common JSON-style escape sequences (e.g., \u2212, \\n)
  const unescapeUnicode = (text: string) => {
    return text
      // turn double backslashes into single
      .replace(/\\\\/g, '\\')
      // decode \uXXXX sequences
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // decode newline and tab
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  };

  // Remove leading/trailing quotes; preserve line breaks; collapse only spaces/tabs
  const cleanText = (text: string) => {
    const t = text.replace(/^\s*["']|["']\s*$/g, '');
    const decoded = decodeEntities(unescapeUnicode(t));
    return decoded
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .trim();
  };

  // Try to parse a JSON array string: '["A","B","C","D"]' -> string[]
  const parseArrayString = (input: string): string[] | null => {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x));
      }
    } catch {
      // not JSON; fall through
    }
    return null;
  };

  // Strip leading label like "A) ", "B. ", "C: " to prevent duplicated letter labels in UI
  const stripLeadingLabel = (text: string): string =>
    text.replace(/^\s*[A-Da-d](?:\)|\.|:|-)\s+/, '');

  // Normalize options when backend returns JSON-string element or mixed/empty slots
  const normalizeOptions = (options: string[]): string[] => {
    // Handle non-array input
    if (!Array.isArray(options)) {
      if (typeof options === 'string') {
        return normalizeOptionsString(options);
      }
      return [];
    }

    // Filter out empty/undefined/null elements
    options = options.filter(o => o != null && String(o).trim() !== '');
    if (options.length === 0) return [];

    // Case 1: Try to find a JSON array in any position
    for (const opt of options) {
      if (typeof opt === 'string' && opt.trim().startsWith('[')) {
        const parsed = parseArrayString(opt);
        if (parsed?.length) return parsed.map(cleanOptionText);
      }
    }

    // Case 2: Each element might be a full option or need splitting
    const allOptions: string[] = [];
    for (const opt of options) {
      if (!opt) continue;
      const cleaned = String(opt).trim();
      // Check if this element contains multiple options
      if (cleaned.includes('\n') || /[A-D][).:]/i.test(cleaned)) {
        allOptions.push(...normalizeOptionsString(cleaned));
      } else {
        allOptions.push(cleanOptionText(cleaned));
      }
    }

    // Dedupe and ensure we have options
    const unique = Array.from(new Set(allOptions.filter(Boolean)));
    return unique.length ? unique : [];
  };

  // If options are missing or couldn't be parsed, try to recover from question text, explanation, or review comments
  const normalizeOptionsWithContext = (options: string[] | unknown, questionText?: string, explanation?: string, reviewComments?: string): string[] => {
    let opts = Array.isArray(options) ? options : (typeof options === 'string' ? normalizeOptionsString(options) : []);
    opts = normalizeOptions(opts as string[]);
    if (opts.length > 0) return opts;

    // Try to extract from reviewComments first (often contains raw choices when imported)
    if (reviewComments && typeof reviewComments === 'string') {
      const fromComments = normalizeOptionsString(reviewComments);
      if (fromComments.length >= 2) return fromComments.map(cleanOptionText);
    }

    // Then try explanation
    if (explanation && typeof explanation === 'string') {
      const fromExplanation = normalizeOptionsString(explanation);
      if (fromExplanation.length >= 2) return fromExplanation.map(cleanOptionText);
    }

    // Finally try the question text itself
    if (questionText && typeof questionText === 'string') {
      const fromQuestion = normalizeOptionsString(questionText);
      if (fromQuestion.length >= 2) return fromQuestion.map(cleanOptionText);
    }

    // Fallback: always return at least one placeholder if everything else fails
    return ["(No options found)"];
  };


  const normalizeCorrectAnswer = (val: unknown, optionsLen: number): number => {
    // Accept 0-based, 1-based, or letter inputs like "A", "B", "C", "D"
    if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        if (val >= 0 && val < optionsLen) return val;       // 0-based
        if (val >= 1 && val <= optionsLen) return val - 1;  // 1-based
      }
      return -1;
    }
    const s = String(val).trim();
    // Letter mapping
    if (/^[A-Da-d]$/.test(s)) {
      return s.toUpperCase().charCodeAt(0) - 65;
    }
    // Try to parse a number
    const idx = parseInt(s, 10);
    if (Number.isInteger(idx)) {
      if (idx >= 0 && idx < optionsLen) return idx;
      if (idx >= 1 && idx <= optionsLen) return idx - 1;
    }
    return -1;
  };

  const normalizeWrongExplanations = (
    wrong: WrongAnswerExplanations | undefined
  ): WrongAnswerExplanations | undefined => {
    if (!wrong) return wrong;
    if (Array.isArray(wrong)) {
      return wrong.map((v) => (typeof v === 'string' ? cleanText(v) : String(v)));
    }
    if (typeof wrong === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(wrong as Record<string, unknown>)) {
        out[k] = typeof v === 'string' ? cleanText(v) : String(v);
      }
      return out;
    }
    return wrong;
  };

  const getWrongExplanation = (wrong: WrongAnswerExplanations | undefined, index: number): string | null => {
    if (!wrong) return null;

    // Array form: string[] aligned by index
    if (Array.isArray(wrong)) {
      const val = wrong[index];
      return typeof val === 'string' ? cleanText(val) : null;
    }

    // Object forms: Record<number, string> | Record<string, string>
    if (typeof wrong === 'object') {
      // Numeric key
      if (Object.prototype.hasOwnProperty.call(wrong, index)) {
        const byNumKey = (wrong as Record<number, string>)[index];
        if (typeof byNumKey === 'string') return cleanText(byNumKey);
      }

      // String index key "0", "1", ...
      const idxKey = String(index);
      if (Object.prototype.hasOwnProperty.call(wrong, idxKey)) {
        const byStrIdxKey = (wrong as Record<string, string>)[idxKey];
        if (typeof byStrIdxKey === 'string') return cleanText(byStrIdxKey);
      }

      // Letter key "A", "B", ...
      const letterKey = String.fromCharCode(65 + index);
      if (Object.prototype.hasOwnProperty.call(wrong, letterKey)) {
        const byLetter = (wrong as Record<string, string>)[letterKey];
        if (typeof byLetter === 'string') return cleanText(byLetter);
      }
    }

    return null;
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-2">Question Review</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReadableMode((v) => !v)}
            className="flex items-center gap-2"
            aria-label="Toggle readable text size"
          >
            {readableMode ? 'Standard Text' : 'Readable Text'}
          </Button>
        </div>
        <p className="text-gray-600">Browse and review all questions in the database</p>
        {loading && !isDatabaseUnavailable && (
          <div className="mt-2 text-sm text-gray-500" aria-live="polite">Updating results…</div>
        )}
      </div>

      {/* Database Unavailable Error Banner */}
      {isDatabaseUnavailable && (
        <Card className="mb-6 border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  Database Temporarily Unavailable
                </h3>
                <p className="text-orange-800 mb-4">
                  {error || 'We are experiencing connectivity issues with the database. Please try again in a moment.'}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRetry}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading ? 'Retrying...' : 'Retry Now'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDatabaseUnavailable(false);
                      setError(null);
                    }}
                    className="border-orange-300 text-orange-900 hover:bg-orange-100"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Error Banner */}
      {error && !isDatabaseUnavailable && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Error Loading Questions
                </h3>
                <p className="text-red-800 mb-4">
                  {error}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRetry}
                    disabled={loading}
                    variant="outline"
                    className="border-red-300 text-red-900 hover:bg-red-100"
                  >
                    {loading ? 'Retrying...' : 'Try Again'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setError(null)}
                    className="border-red-300 text-red-900 hover:bg-red-100"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  placeholder="Search question, passage, category, subtopic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
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
              <Select value={selectedSubtopic} onValueChange={(v) => setSelectedSubtopic(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All subtopics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subtopics</SelectItem>
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
              <Select value={selectedSource} onValueChange={(v) => setSelectedSource(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {filters?.sources.map((source: string) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sort by date</label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest first</SelectItem>
                  <SelectItem value="asc">Oldest first</SelectItem>
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
          sortedQuestions.map((question) => (
            <Card key={question.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="uppercase">{question.moduleType}</Badge>
                      <Badge variant="outline">{question.category}</Badge>
                      {question.subtopicRef?.topic?.name && (
                        <Badge variant="outline" className="text-xs">
                          {question.subtopicRef.topic.name}
                        </Badge>
                      )}
                      {(question.subtopicRef?.name || question.subtopic) && (
                        <Badge variant="secondary">
                          {question.subtopicRef?.name || question.subtopic}
                        </Badge>
                      )}
                      {question.source && (
                        <Badge variant="outline" className="text-xs">
                          {question.source}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Created: {formatDate(question.createdAt)} • Est. Time: {formatTime(question.timeEstimate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDetails(question.id)}
                      className="flex items-center gap-2"
                    >
                      {showDetails[question.id] ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Passage */}
                {question.passage && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-400 mb-2">Passage</h4>
                    <div className={`text-blue-400 whitespace-pre-wrap break-words ${readableMode ? 'text-[1.125rem] md:text-[1.25rem] font-serif leading-8 tracking-normal' : 'text-base md:text-lg leading-7 tracking-normal'} max-w-3xl`}>
                      <MathRenderer block={true}>{question.passage}</MathRenderer>
                    </div>
                  </div>
                )}

                {/* Question */}
                <div>
                  <h4 className="text-base font-semibold mb-2">Question Prompt</h4>
                  <div className={`text-blue-400 whitespace-pre-wrap break-words ${readableMode ? 'text-[1.25rem] md:text-[1.5rem] font-serif leading-8 tracking-normal' : 'text-lg md:text-xl leading-7 tracking-normal'} max-w-3xl`}>
                    <MathRenderer>{question.question}</MathRenderer>
                  </div>
                </div>

                {/* Visual: Chart or Image */}
                {(question.chartData || question.imageUrl) && (
                  <div className="bg-gray-50 p-4 rounded-lg text-blue-400">
                    <h4 className="font-semibold text-blue-400 mb-2">{question.chartData ? 'Diagram' : 'Image'}</h4>
                    {question.imageUrl && question.imageUrl.startsWith('data:image/svg+xml;base64,') ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded text-sm text-black">
                        ⚠️ This diagram contains Vega specification data that cannot be displayed as an image.
                        <br />
                        <span className="text-xs">The diagram generation system needs to be updated to render actual images.</span>
                      </div>
                    ) : (
                      <ChartRenderer
                        chartData={(question.chartData ?? { type: 'image' }) as ChartData}
                        imageUrl={question.imageUrl || undefined}
                        imageAlt={question.imageAlt || 'Question diagram'}
                        className="max-w-full"
                      />
                    )}
                    {!question.chartData && question.imageAlt && (
                      <p className="text-xs text-gray-600 mt-1">Alt text: {question.imageAlt}</p>
                    )}
                  </div>
                )}

                {/* Answer Options */}
                <div>
                  <h4 className="text-base font-semibold mb-2">Answer Choices</h4>
                  {question.options && question.options.length > 0 ? (
                     <>
                       {question.options.length < 4 && (
                         <div className="mb-3 p-4 rounded-lg border bg-yellow-50 text-black">
                           Warning: This question has fewer than 4 options ({question.options.length} found).
                           The options may not have parsed correctly.
                         </div>
                       )}
                       <ol className="space-y-2" role="list" aria-label="Answer choices">
                         {question.options.map((option, index) => (
                           <li
                            key={index}
                            role="listitem"
                            className={`p-4 rounded-lg border text-blue-400 ${
                              showAnswers[question.id] && index === question.correctAnswer
                                ? 'bg-white border-green-600 ring-2 ring-green-500'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <div className="flex items-start">
                              <span
                                className={`inline-flex items-center justify-center rounded-full font-bold mr-3 border ${
                                  showAnswers[question.id] && index === question.correctAnswer
                                    ? 'bg-green-50 border-green-600 text-green-700'
                                    : 'bg-gray-100 border-gray-300 text-blue-600'
                                } ${readableMode ? 'w-9 h-9 text-lg' : 'w-7 h-7 text-base'}`}
                                aria-hidden="true"
                              >
                                {String.fromCharCode(65 + index)}
                              </span>
                              <div
                                className={`flex-1 whitespace-pre-wrap break-words ${
                                  readableMode ? 'text-base md:text-lg font-serif leading-7 tracking-normal' : 'leading-6 tracking-normal'
                                } max-w-3xl`}
                              >
                                <MathRenderer>{option}</MathRenderer>
                              </div>
                              {showAnswers[question.id] && index === question.correctAnswer && (
                                <Badge className="ml-3 bg-green-100 text-black border border-green-300">Correct</Badge>
                              )}
                            </div>
                            {showAnswers[question.id] &&
                              index !== question.correctAnswer &&
                              getWrongExplanation(question.wrongAnswerExplanations, index) && (
                                <div className="mt-2 text-sm text-black whitespace-pre-wrap font-serif leading-7 tracking-normal max-w-3xl">
                                  <span className="font-medium">Why incorrect:</span>{' '}
                                  <MathRenderer>
                                    {getWrongExplanation(question.wrongAnswerExplanations, index) as string}
                                  </MathRenderer>
                                </div>
                              )}
                          </li>
                         ))}
                       </ol>
                     </>
                  ) : (
                     <div className="p-4 rounded-lg border bg-yellow-50 text-black">
                      Error: No valid answer choices could be parsed for this question.
                      This may indicate a data format issue or a problem with option formatting.
                     </div>
                  )}
                </div>

                {/* Explanation */}
                {showAnswers[question.id] && (
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-semibold text-black mb-2">Explanation</h4>
                    <div className="mb-2 text-sm text-black flex items-center gap-2">
                      <span className="font-medium">Correct Answer:</span>
                      {question.correctAnswer >= 0 ? (
                        <>
                          <Badge className="bg-green-100 text-black border border-green-300">
                            {String.fromCharCode(65 + question.correctAnswer)}
                          </Badge>
                          {question.options?.[question.correctAnswer] && (
                            <span className="ml-1 text-gray-700">
                              <MathRenderer>{question.options[question.correctAnswer]}</MathRenderer>
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 border border-gray-300">—</Badge>
                      )}
                    </div>
                    <div className={`text-black whitespace-pre-wrap ${readableMode ? 'text-base md:text-lg font-serif leading-7 tracking-normal' : 'leading-6 tracking-normal'} max-w-3xl`}>
                      <MathRenderer block={true}>{question.explanation}</MathRenderer>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {question.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {showDetails[question.id] && (
                  <div className="bg-gray-50 p-4 rounded-lg border text-black">
                    <h4 className="font-semibold mb-2">Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Module:</span> <span className="font-medium">{question.moduleType}</span></div>
                      <div><span className="text-gray-500">Topic:</span> <span className="font-medium">{question.subtopicRef?.topic?.name || '—'}</span></div>
                      <div><span className="text-gray-500">Subtopic:</span> <span className="font-medium">{question.subtopicRef?.name || question.subtopic || '—'}</span></div>
                      <div><span className="text-gray-500">Review Status:</span> <span className="font-medium">{question.reviewStatus || '—'}</span></div>
                      <div><span className="text-gray-500">Reviewed By:</span> <span className="font-medium">{question.reviewedBy || '—'}</span></div>
                      <div><span className="text-gray-500">Reviewed At:</span> <span className="font-medium">{question.reviewedAt ? formatDate(question.reviewedAt) : '—'}</span></div>
                      <div className="md:col-span-2"><span className="text-gray-500">Review Comments:</span> <span className="font-medium">{question.reviewComments || '—'}</span></div>
                      <div><span className="text-gray-500">ID:</span> <span className="font-mono text-xs">{question.id}</span></div>
                      <div><span className="text-gray-500">Created:</span> <span className="font-medium">{formatDate(question.createdAt)}</span></div>
                      <div><span className="text-gray-500">Updated:</span> <span className="font-medium">{question.updatedAt ? formatDate(question.updatedAt) : '—'}</span></div>
                      <div><span className="text-gray-500">Time Estimate:</span> <span className="font-medium">{formatTime(question.timeEstimate)}</span></div>
                    </div>
                  </div>
                )}
                
                {/* Review Form - Always Visible */}
                <div>
                  {status === 'loading' ? (
                    <div className="text-center p-4 text-gray-500">
                      Loading authentication status...
                    </div>
                  ) : !session ? (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300 text-black">
                      <p className="font-semibold mb-2">Sign in required</p>
                      <p className="text-sm mb-3">You must be signed in to submit a review.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signIn()}
                      >
                        Sign In
                      </Button>
                    </div>
                  ) : (
                    <QuestionReviewForm 
                      questionId={question.id}
                      hasDiagramInQuestion={!!(question.imageUrl || question.chartData)}
                      onSubmitSuccess={() => {
                        // Optionally refresh or show success message
                        console.log('Review submitted for question:', question.id);
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-gray-600">
          {pagination ? `Showing ${pagination.offset + 1}-${pagination.offset + sortedQuestions.length} of ${pagination.total} questions` : `Showing ${sortedQuestions.length} questions`}
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
            disabled={!pagination?.hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


