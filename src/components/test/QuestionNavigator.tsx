"use client"

interface QuestionNavigatorProps {
  totalQuestions: number
  currentQuestion: number
  answeredQuestions: number[];
  onQuestionClick: (index: number) => void
  onReviewClick: () => void
}

export default function QuestionNavigator({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onQuestionClick,
  onReviewClick
}: QuestionNavigatorProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap mr-2">
              Questions:
            </span>
            {Array.from({ length: totalQuestions }, (_, i) => {
              const isAnswered = answeredQuestions.includes(i)
              const isCurrent = i === currentQuestion
              
              return (
                <button
                  key={i}
                  onClick={() => onQuestionClick(i)}
                  className={`
                    min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm
                    transition-all duration-200 border-2
                    ${isCurrent
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-md scale-110'
                      : isAnswered
                      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }
                  `}
                  title={isAnswered ? `Question ${i + 1} (Answered)` : `Question ${i + 1} (Unanswered)`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={onReviewClick}
            className="whitespace-nowrap px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>📋</span>
            <span>Review</span>
          </button>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-300"></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-gray-100 border-2 border-gray-300"></div>
            <span>Unanswered</span>
          </div>
        </div>
      </div>
    </div>
  )
}
