'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, CheckCircle, GraduationCap, Target, BarChart3, BookOpen, Sparkles } from 'lucide-react'

const GRADE_LEVELS = [
  { value: 'freshman', label: 'Freshman (9th)' },
  { value: 'sophomore', label: 'Sophomore (10th)' },
  { value: 'junior', label: 'Junior (11th)' },
  { value: 'senior', label: 'Senior (12th)' },
  { value: 'graduate', label: 'Already Graduated' },
]

const PREP_APPS = [
  'Khan Academy',
  'Bluebook',
  'Princeton Review',
  'Kaplan',
  'Magoosh',
  'Barron\'s',
  'UWorld',
  'PrepScholar',
]

const READING_WRITING_CATEGORIES = [
  { value: 'reading-comprehension', label: 'Reading Comprehension' },
  { value: 'grammar', label: 'Grammar & Usage' },
  { value: 'vocabulary', label: 'Vocabulary in Context' },
  { value: 'writing-skills', label: 'Writing & Rhetoric' },
]

const MATH_CATEGORIES = [
  { value: 'algebra', label: 'Algebra' },
  { value: 'advanced-math', label: 'Advanced Math' },
  { value: 'geometry', label: 'Geometry & Trigonometry' },
  { value: 'statistics', label: 'Problem Solving & Data Analysis' },
]

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [gradeLevel, setGradeLevel] = useState('')
  const [highestSATScore, setHighestSATScore] = useState('')
  const [bluebookTestsTaken, setBluebookTestsTaken] = useState('')
  const [otherPrepApps, setOtherPrepApps] = useState<string[]>([])
  const [customApp, setCustomApp] = useState('')
  const [strongCategories, setStrongCategories] = useState<string[]>([])
  const [weakCategories, setWeakCategories] = useState<string[]>([])
  const [targetScore, setTargetScore] = useState('')

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const toggleCategory = (cat: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(cat) ? list.filter(c => c !== cat) : [...list, cat])
  }

  const toggleApp = (app: string) => {
    setOtherPrepApps(prev => prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app])
  }

  const addCustomApp = () => {
    const trimmed = customApp.trim()
    if (trimmed && !otherPrepApps.includes(trimmed)) {
      setOtherPrepApps(prev => [...prev, trimmed])
      setCustomApp('')
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel,
          highestSATScore: highestSATScore || null,
          bluebookTestsTaken: bluebookTestsTaken || null,
          otherPrepApps,
          strongCategories,
          weakCategories,
          targetScore: targetScore || null,
        }),
      })
      if (res.ok) {
        router.push('/')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: null,
          highestSATScore: null,
          bluebookTestsTaken: null,
          otherPrepApps: [],
          strongCategories: [],
          weakCategories: [],
          targetScore: null,
        }),
      })
      if (res.ok) {
        router.push('/')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">Welcome to DuckSAT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Let&apos;s personalize your experience
          </h1>
          <p className="text-gray-600">
            Hi {session.user?.name?.split(' ')[0]}! Tell us a bit about yourself so we can help you reach your goals.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 min-h-[400px] flex flex-col">
          {/* Step 1: Grade Level & Background */}
          {step === 1 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">About You</h2>
                  <p className="text-sm text-gray-500">Tell us where you are in your academic journey</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">What grade are you in?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GRADE_LEVELS.map(g => (
                      <button
                        key={g.value}
                        onClick={() => setGradeLevel(g.value)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          gradeLevel === g.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What&apos;s your highest SAT score so far?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Leave blank if you haven&apos;t taken the SAT yet</p>
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    step="10"
                    value={highestSATScore}
                    onChange={e => setHighestSATScore(e.target.value)}
                    placeholder="e.g., 1200"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-colors text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Test Experience */}
          {step === 2 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Test Experience</h2>
                  <p className="text-sm text-gray-500">Help us understand your prep background</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    How many Bluebook practice tests have you taken?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['0', '1-2', '3-5', '6+'].map((opt, i) => (
                      <button
                        key={opt}
                        onClick={() => setBluebookTestsTaken(String(i))}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          bluebookTestsTaken === String(i)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Which other SAT prep apps have you used?
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PREP_APPS.map(app => (
                      <button
                        key={app}
                        onClick={() => toggleApp(app)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          otherPrepApps.includes(app)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customApp}
                      onChange={e => setCustomApp(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomApp()}
                      placeholder="Other app..."
                      className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-0 outline-none transition-colors text-sm text-gray-900 placeholder-gray-400"
                    />
                    <Button variant="outline" size="sm" onClick={addCustomApp} disabled={!customApp.trim()}>
                      Add
                    </Button>
                  </div>
                  {otherPrepApps.filter(a => !PREP_APPS.includes(a)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {otherPrepApps.filter(a => !PREP_APPS.includes(a)).map(app => (
                        <span
                          key={app}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {app}
                          <button onClick={() => toggleApp(app)} className="text-blue-400 hover:text-blue-600 ml-1">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Strengths */}
          {step === 3 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Strengths</h2>
                  <p className="text-sm text-gray-500">Which question types do you feel confident about?</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Reading & Writing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {READING_WRITING_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleCategory(c.value, strongCategories, setStrongCategories)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          strongCategories.includes(c.value)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {strongCategories.includes(c.value) && <CheckCircle className="w-4 h-4 inline mr-2" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Math</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MATH_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleCategory(c.value, strongCategories, setStrongCategories)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          strongCategories.includes(c.value)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {strongCategories.includes(c.value) && <CheckCircle className="w-4 h-4 inline mr-2" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Weaknesses */}
          {step === 4 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Areas to Improve</h2>
                  <p className="text-sm text-gray-500">Which question types do you want to focus on?</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Reading & Writing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {READING_WRITING_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleCategory(c.value, weakCategories, setWeakCategories)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          weakCategories.includes(c.value)
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {weakCategories.includes(c.value) && <Target className="w-4 h-4 inline mr-2" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Math</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MATH_CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleCategory(c.value, weakCategories, setWeakCategories)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          weakCategories.includes(c.value)
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {weakCategories.includes(c.value) && <Target className="w-4 h-4 inline mr-2" />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Target Score */}
          {step === 5 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Goal</h2>
                  <p className="text-sm text-gray-500">What SAT score are you aiming for?</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Target SAT Score</label>
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    step="10"
                    value={targetScore}
                    onChange={e => setTargetScore(e.target.value)}
                    placeholder="e.g., 1400"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-colors text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-2">SAT scores range from 400 to 1600</p>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Profile Summary</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    {gradeLevel && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Grade</span>
                        <span className="font-medium">{GRADE_LEVELS.find(g => g.value === gradeLevel)?.label}</span>
                      </div>
                    )}
                    {highestSATScore && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Score</span>
                        <span className="font-medium">{highestSATScore}</span>
                      </div>
                    )}
                    {targetScore && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target Score</span>
                        <span className="font-medium text-indigo-600">{targetScore}</span>
                      </div>
                    )}
                    {strongCategories.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Strengths</span>
                        <span className="font-medium text-green-600">{strongCategories.length} areas</span>
                      </div>
                    )}
                    {weakCategories.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Focus Areas</span>
                        <span className="font-medium text-orange-600">{weakCategories.length} areas</span>
                      </div>
                    )}
                    {otherPrepApps.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Other Apps</span>
                        <span className="font-medium">{otherPrepApps.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <div>
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
            <div>
              {step < TOTAL_STEPS ? (
                <Button variant="primary" onClick={() => setStep(s => s + 1)}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
