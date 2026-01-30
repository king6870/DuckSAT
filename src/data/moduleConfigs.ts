import { ModuleConfig } from '@/types/test'

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    id: 1,
    type: 'reading-writing',
    duration: 32, // 32 minutes
    questionCount: 27, // 27 questions
    title: 'Reading and Writing - Module 1',
    description: 'This module tests your reading comprehension, grammar, and writing skills. You have 32 minutes to complete 27 questions.',
    icon: '📚',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 2,
    type: 'reading-writing',
    duration: 32, // 32 minutes
    questionCount: 27, // 27 questions
    title: 'Reading and Writing - Module 2',
    description: 'This module adapts to your Module 1 performance with appropriate difficulty questions. You have 32 minutes to complete 27 questions.',
    icon: '📖',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: 3,
    type: 'math',
    duration: 35, // 35 minutes
    questionCount: 22, // 22 questions
    title: 'Math - Module 1',
    description: 'This module covers algebra, geometry, statistics, and advanced math topics. You have 35 minutes to complete 22 questions.',
    icon: '🔢',
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 4,
    type: 'math',
    duration: 35, // 35 minutes
    questionCount: 22, // 22 questions
    title: 'Math - Module 2',
    description: 'This module adapts to your Module 3 performance with appropriate difficulty questions. You have 35 minutes to complete 22 questions.',
    icon: '🧮',
    color: 'from-emerald-500 to-teal-600'
  }
]

export const getModuleConfig = (moduleId: number): ModuleConfig | undefined => {
  return MODULE_CONFIGS.find(config => config.id === moduleId)
}

export const getTotalTestTime = (): number => {
  return MODULE_CONFIGS.reduce((total, config) => total + config.duration, 0)
}

export const getTotalQuestions = (): number => {
  return MODULE_CONFIGS.reduce((total, config) => total + config.questionCount, 0)
}

export const getModulesByType = (type: 'reading-writing' | 'math'): ModuleConfig[] => {
  return MODULE_CONFIGS.filter(config => config.type === type)
}

export const getReadingWritingModules = (): ModuleConfig[] => {
  return getModulesByType('reading-writing')
}

export const getMathModules = (): ModuleConfig[] => {
  return getModulesByType('math')
}
