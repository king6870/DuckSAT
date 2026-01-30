"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star, User, Calendar, BookOpen, AlertCircle, Clock } from 'lucide-react'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

interface Review {
    id: string
    rating: number
    description: string | null
    hasDiagram: boolean
    createdAt: string
    user: {
        name: string | null
        email: string | null
        image: string | null
    }
    question: {
        question: string
        category: string
        difficulty: string
        moduleType: string
    }
}

interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

export default function AdminReviewsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [reviews, setReviews] = useState<Review[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const searchTimeout = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
        } else if (session?.user?.email && !ADMIN_EMAILS.includes(session.user.email)) {
            router.push('/')
        } else if (session?.user?.email) {
            fetchReviews(currentPage, search)
        }
    }, [session, status, currentPage, search, router])

    const fetchReviews = async (page: number, searchTerm = '') => {
        try {
            setLoading(true)
            const url = `/api/admin/reviews?page=${page}&limit=20${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch reviews')
            const data = await res.json()
            setReviews(data.reviews)
            setPagination(data.pagination)
        } catch (err) {
            setError('Failed to load reviews')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }
    // Debounced search input
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            setSearch(searchInput)
            setCurrentPage(1)
        }, 300)
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current)
        }
    }, [searchInput])

    // Calculate stats
    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0'
    const totalIssues = reviews.filter(r => r.hasDiagram).length

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Review Dashboard</h1>
                            <p className="mt-1 text-gray-500">Monitor and analyze user feedback</p>
                        </div>
                        <button
                            onClick={() => router.push('/admin/questions')}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-sm"
                        >
                            Review Questions
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Results Summary */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex-1 flex items-center gap-2">
                        <label htmlFor="review-search" className="sr-only">Search reviews</label>
                        <input
                            id="review-search"
                            type="text"
                            className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search reviews..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            aria-label="Search reviews"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                className="ml-1 px-2 py-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div className="text-gray-600 text-sm text-right">
                        {pagination && pagination.total > 0 ? (
                            <span>
                                Showing {(pagination.page - 1) * pagination.limit + 1}
                                –{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                            </span>
                        ) : (
                            <span>No results found</span>
                        )}
                    </div>
                </div>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Reviews</p>
                                <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-50 rounded-xl">
                                <Star className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                                <p className="text-2xl font-bold text-gray-900">{averageRating}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 rounded-xl">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Reported Issues</p>
                                <p className="text-2xl font-bold text-gray-900">{totalIssues}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {reviews.length === 0 && (
                        <div className="text-center text-gray-500 py-12">No results found.</div>
                    )}
                    {reviews.map((review) => (
                        // ...existing code for review card...
                        <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* User Info */}
                                <div className="md:w-1/4 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
                                    <div className="flex items-center gap-3">
                                        {review.user.image ? (
                                            <img className="h-10 w-10 rounded-full ring-2 ring-gray-50" src={review.user.image} alt="" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-gray-500" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-900">{review.user.name || 'Anonymous'}</p>
                                            <p className="text-sm text-gray-500">{review.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="h-4 w-4" />
                                        {new Date(review.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>

                                {/* Review Content */}
                                <div className="md:w-3/4 flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                                                />
                                            ))}
                                            <span className="ml-2 font-medium text-gray-700">{review.rating}.0</span>
                                        </div>
                                        {review.hasDiagram && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                Diagram Issue
                                            </span>
                                        )}
                                    </div>

                                    {review.description && (
                                        <div className="bg-gray-50 rounded-xl p-4 text-gray-700 leading-relaxed">
                                            &quot;{review.description}&quot;
                                        </div>
                                    )}

                                    {/* Question Context */}
                                    <div className="mt-auto pt-4 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Question Context</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                {review.question.moduleType}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
                                                {review.question.category}
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${review.question.difficulty === 'easy' ? 'bg-green-50 text-green-700' :
                                                review.question.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                                                    'bg-red-50 text-red-700'
                                                }`}>
                                                {review.question.difficulty}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2 font-mono bg-gray-50 p-2 rounded">
                                            {review.question.question.substring(0, 150)}...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 font-medium text-gray-700 bg-white shadow-sm"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 flex items-center text-gray-600 font-medium">
                            Page {currentPage} of {pagination.pages}
                        </span>
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                const page = Number((e.target as any).elements.jumpTo.value)
                                if (!isNaN(page) && page >= 1 && page <= pagination.pages) setCurrentPage(page)
                            }}
                            className="flex items-center gap-1"
                            aria-label="Jump to page"
                        >
                            <label htmlFor="jumpTo" className="sr-only">Jump to page</label>
                            <input
                                id="jumpTo"
                                name="jumpTo"
                                type="number"
                                min={1}
                                max={pagination.pages}
                                defaultValue={currentPage}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                aria-label="Jump to page"
                            />
                            <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded-lg font-medium ml-1">Go</button>
                        </form>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={currentPage === pagination.pages}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 font-medium text-gray-700 bg-white shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
