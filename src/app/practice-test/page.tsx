"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTestState } from '../../hooks/useTestState';
import TestLauncher from '../../components/test/TestLauncher';
import ModuleStart from '../../components/test/ModuleStart';
import TestAnalytics from '../../components/test/TestAnalytics';
import ReviewPage from '../../components/test/ReviewPage';
import QuestionNavigator from '../../components/test/QuestionNavigator';
import MathRenderer from '../../components/MathRenderer';
import ChartRenderer from '../../components/ChartRenderer';

export default function PracticeTestPage() {
  const router = useRouter();
  const { data: session } = useSession ? useSession() : { data: null };
  const {
    hasStarted,
    moduleStarted,
    currentModule,
    currentQuestion,
    currentQuestionIndex,
    currentModuleQuestions,
    completeModule,
    selectedAnswers,
    selectedAnswer,
    startTest,
    startModule,
    isTransitioning,
    isComplete,
    testResults,
    isBreakTime,
    breakTimeRemaining,
    goToQuestion,
    setShowReview,
    showReview,
    timeRemaining,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    questionsAnswered,
    skipBreak
  } = useTestState(session?.user?.email || '');

  const submitModule = completeModule;
  const currentSelectedAnswer = selectedAnswer;

  // Track answered questions for navigator
  const answeredQuestions = selectedAnswers
    ? selectedAnswers.map((answer, index) => answer !== -1 ? index : -1).filter(index => index !== -1)
    : [];

  // Error state for loading and submission
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !session) {
      router.push('/');
    }
  }, [session, router]);

  // Debug logging
  useEffect(() => {
    console.log('Test State Debug:', {
      hasStarted,
      moduleStarted,
      currentModule: currentModule?.id,
      currentQuestion: currentQuestion?.id,
      currentQuestionPassage: currentQuestion?.passage,
      isTransitioning,
      isComplete
    });
  }, [hasStarted, moduleStarted, currentModule, currentQuestion, isTransitioning, isComplete]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    );
  }

  // Test launcher screen
  if (!hasStarted) {
    return <TestLauncher onStartTest={startTest} />;
  }

  // Break time screen
  if (isBreakTime) {
    const minutes = Math.floor(breakTimeRemaining / 60);
    const seconds = breakTimeRemaining % 60;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="text-6xl mb-6">☕</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Break Time</h2>

          <p className="text-gray-600 mb-6">
            Take a 10-minute break before starting the Math section
          </p>
          <div className="text-4xl font-bold text-blue-600 mb-4">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-500 mb-6">
            The Math section will start automatically when the break ends
          </p>
          <button
            onClick={skipBreak}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Skip Break & Continue
          </button>
        </div>
      </div>
    );
  }

  // Module start screen (before starting each module)
  if (currentModule && hasStarted && !moduleStarted && !isTransitioning) {
    return (
      <ModuleStart
        module={currentModule}
        onStartModule={startModule}
      />
    );
  }

  // Final results screen with analytics
  if (isComplete && testResults) {
    return <TestAnalytics testResults={testResults} />;
  }

  // Fallback completion screen (if no results)
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Test Complete!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Congratulations on completing your SAT practice test!
          </p>
          <button
            onClick={() => router.push('/practice-test')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"
          >
            Take Another Test
          </button>
        </div>
      </div>
    );
  }

  // Main test interface
  if (currentModule && currentQuestion && hasStarted && moduleStarted && !isTransitioning && !isComplete) {
    // Show review page if user clicked review
    if (showReview) {
      return (
        <ReviewPage
          questions={currentModuleQuestions}
          selectedAnswers={selectedAnswers}
          currentModule={currentModule}
          onQuestionClick={(index) => {
            goToQuestion(index);
            setShowReview(false);
          }}
          onSubmit={() => {
            setShowReview(false);
            submitModule();
          }}
          onBackToTest={() => setShowReview(false)}
          timeRemaining={timeRemaining}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            ← Back to Home
          </button>
        </div>
        {/* Question Navigator */}
        <QuestionNavigator
          totalQuestions={currentModule.questionCount}
          currentQuestion={currentQuestionIndex}
          answeredQuestions={answeredQuestions}
          onQuestionClick={goToQuestion}
          onReviewClick={() => setShowReview(true)}
        />

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {currentModule.title}
                </h1>
                <p className="text-gray-600">
                  Question {currentQuestionIndex + 1} of {currentModule.questionCount}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold transition-colors ${
                  timeRemaining <= 300 // 5 minutes
                    ? 'text-red-500 animate-pulse'
                    : timeRemaining <= 600 // 10 minutes
                    ? 'text-orange-500'
                    : 'text-purple-600'
                }`}>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-500">
                  {timeRemaining <= 300 ? '⚠️ Time Running Out!' : 'Time Remaining'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / currentModule.questionCount) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 w-full">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-2 sm:p-8 border border-white/20 w-full">
            <div className="mb-8">
              {/* Always show passage first if it exists */}
              {currentQuestion.passage && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3">
                      📖 Reading Passage
                    </span>
                    <span className="text-blue-700 text-sm font-medium">
                      Read carefully before answering
                    </span>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <div className="text-gray-800 leading-relaxed font-medium bg-white p-4 rounded-lg border border-blue-100">
                      <MathRenderer>{currentQuestion.passage}</MathRenderer>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart/Diagram */}
              {(currentQuestion.imageData || currentQuestion.chartData || currentQuestion.imageUrl) && (
                <div className="mb-6">
                  <ChartRenderer
                    imageData={currentQuestion.imageData}
                    imageMimeType={currentQuestion.imageMimeType}
                    chartData={currentQuestion.chartData}
                    imageUrl={currentQuestion.imageUrl}
                    imageAlt={currentQuestion.imageAlt || 'Question diagram'}
                  />
                </div>
              )}

              <h3 className="text-xl font-semibold mb-6 text-gray-900">
                <MathRenderer>{currentQuestion.question}</MathRenderer>
              </h3>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentSelectedAnswer === index;
                  return (
                    <button
                      key={index}
                      onClick={() => selectAnswer(index)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-100 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center">
                        <span className={`font-semibold mr-3 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-600 group-hover:bg-purple-200 group-hover:text-purple-700'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className={`${isSelected ? 'text-purple-900 font-medium' : 'text-gray-700'}`}>
                          <MathRenderer>{option}</MathRenderer>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 w-full">
              <button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl disabled:opacity-50 hover:bg-gray-300 transition-colors font-medium"
              >
                ← Previous
              </button>

              <div className="text-sm text-gray-500 text-center">
                <div>{currentQuestionIndex + 1} / {currentModule.questionCount}</div>
                <div className="text-xs mt-1">
                  {questionsAnswered} answered
                </div>
              </div>

              {currentQuestionIndex === currentModule.questionCount - 1 ? (
                <button
                  onClick={() => setShowReview(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl hover:shadow-lg transition-all font-medium"
                >
                  Review & Submit →
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:shadow-lg transition-all font-medium"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading and error state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex space-x-2 mb-6" role="status" aria-live="polite" aria-label="Loading">
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce" aria-hidden="true"></div>
        <div className="w-4 h-4 bg-purple-600 rounded-full animate-bounce delay-100" aria-hidden="true"></div>
        <div className="w-4 h-4 bg-pink-600 rounded-full animate-bounce delay-200" aria-hidden="true"></div>
      </div>
      {fetchError && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl text-center max-w-md w-full mb-2" role="alert">
          {fetchError}
          <button
            onClick={() => { setFetchError(null); /* re-trigger fetch/init here */ }}
            className="ml-4 underline text-indigo-700 font-semibold hover:text-indigo-900"
          >
            Retry
          </button>
        </div>
      )}
      {submitError && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl text-center max-w-md w-full mb-2" role="alert">
          {submitError}
        </div>
      )}
    </div>
  );
}
