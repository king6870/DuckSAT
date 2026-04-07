export const PRICING = {
  monthly: {
    price: 25,
    stripePlan: 'monthly' as const,
  },
  yearly: {
    price: 250,
    savings: 50,
    perMonth: 20.83,
    stripePlan: 'yearly' as const,
  },
  competitors: {
    privateTutor: 100,
    onlineCourse: 400,
  },
} as const

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const SALE = {
  get name() {
    return `${MONTH_NAMES[new Date().getMonth()]} Sale`
  },
  getEndDate: () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  },
}
