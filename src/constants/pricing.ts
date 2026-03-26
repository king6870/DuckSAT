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

export const SALE = {
  name: 'March Sale',
  getEndDate: () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  },
} as const
