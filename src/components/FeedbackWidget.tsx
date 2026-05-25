'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import FeedbackStars from './FeedbackStars';

// ─── localStorage keys ───────────────────────────────────────────────────────
const LS = {
  submitted:       'ducksat_feedback_submitted',
  sessionId:       'ducksat_feedback_session_id',
  firstVisit:      'ducksat_feedback_first_visit',
  nextPopup:       'ducksat_feedback_next_popup',
  manuallyOpened:  'ducksat_feedback_manually_opened',
} as const;

// ─── helpers ─────────────────────────────────────────────────────────────────
function safeLS(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

function getOrCreateSessionId(): string {
  const ls = safeLS();
  if (!ls) return '';
  let id = ls.getItem(LS.sessionId);
  if (!id) {
    id = crypto.randomUUID();
    ls.setItem(LS.sessionId, id);
  }
  return id;
}

type ModalKind = 'button' | 'popup';

// ─── ModalContent — module-level so React never remounts it on re-renders ──────
interface ModalContentProps {
  showSuccess: boolean;
  alreadySubmitted: boolean;
  openModal: ModalKind | null;
  rating: number;
  setRating: (r: number) => void;
  reviewText: string;
  setReviewText: (t: string) => void;
  submitting: boolean;
  submitError: string;
  onSubmit: () => void;
  onDismissPopup: () => void;
}

function ModalContent({
  showSuccess,
  alreadySubmitted,
  openModal,
  rating,
  setRating,
  reviewText,
  setReviewText,
  submitting,
  submitError,
  onSubmit,
  onDismissPopup,
}: ModalContentProps) {
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Thank you! 🎉</h2>
        <p className="text-sm text-gray-500 text-center">Your feedback means a lot to us.</p>
      </div>
    );
  }

  return (
    <>
      {alreadySubmitted && openModal === 'button' && (
        <p className="text-xs text-indigo-600 italic mb-3">
          ✓ You&apos;ve submitted feedback before — feel free to add another!
        </p>
      )}
      <h2 id="feedback-modal-title" className="text-xl font-bold text-gray-900 mb-1">
        How&apos;s your experience?
      </h2>
      <p className="text-sm text-gray-500 mb-6">Your feedback helps us improve.</p>

      <FeedbackStars value={rating} onChange={setRating} disabled={submitting} />

      <div className="mt-5">
        <textarea
          id="feedback-review"
          aria-label="Write your review"
          aria-describedby="char-counter"
          placeholder="Tell us what you think... (optional)"
          maxLength={500}
          rows={4}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          disabled={submitting}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          style={{ maxHeight: 200 }}
        />
        <p
          id="char-counter"
          aria-live="polite"
          className={`text-right text-xs mt-1 ${reviewText.length >= 450 ? 'text-red-500' : 'text-gray-400'}`}
        >
          {reviewText.length} / 500
        </p>
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-500 mt-2">{submitError}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={rating === 0 || submitting}
        className="mt-4 w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </button>

      {openModal === 'popup' && (
        <button
          onClick={onDismissPopup}
          className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 underline cursor-pointer"
        >
          Maybe later
        </button>
      )}
    </>
  );
}

// ─── component ───────────────────────────────────────────────────────────────
export default function FeedbackWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // form state
  const [rating, setRating]         = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // modal state
  const [openModal, setOpenModal] = useState<ModalKind | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // whether the user has already submitted a review
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // used to return focus to the button when modal closes
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isFeedbackSuppressed = pathname === '/practice-test'
    || pathname.startsWith('/practice/')
    || pathname.startsWith('/group-study/');

  // ── on mount: check submission status & init popup timer ──────────────────
  useEffect(() => {
    if (isFeedbackSuppressed) return;

    const ls = safeLS();
    if (!ls) return; // graceful degradation: no localStorage → no popups

    // Ensure firstVisit is set
    if (!ls.getItem(LS.firstVisit)) {
      ls.setItem(LS.firstVisit, new Date().toISOString());
    }

    const sessionId = getOrCreateSessionId();
    const isAuthed  = !!session?.user?.id;
    const lsSubmitted = ls.getItem(LS.submitted) === 'true';

    // Optimistically reflect localStorage for immediate UI — may be corrected by DB
    if (lsSubmitted) setAlreadySubmitted(true);

    // Anonymous users: localStorage is authoritative — no need to wait for DB
    if (!isAuthed && lsSubmitted) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    function startPopupInterval() {
      const firstVisit = new Date(ls!.getItem(LS.firstVisit)!).getTime();
      const manuallyOpened = ls!.getItem(LS.manuallyOpened) === 'true';
      if (!ls!.getItem(LS.nextPopup)) {
        const fiveMin = firstVisit + 5 * 60 * 1000;
        if (manuallyOpened && Date.now() < fiveMin) {
          ls!.setItem(LS.nextPopup, new Date(firstVisit + 25 * 60 * 1000).toISOString());
        } else {
          ls!.setItem(LS.nextPopup, new Date(fiveMin).toISOString());
        }
      }
      intervalId = setInterval(() => {
        if (safeLS()?.getItem(LS.submitted) === 'true') {
          clearInterval(intervalId!);
          return;
        }
        const next = ls!.getItem(LS.nextPopup);
        if (next && Date.now() >= new Date(next).getTime()) {
          clearInterval(intervalId!);
          setOpenModal('popup');
        }
      }, 30_000);
    }

    // DB check — authoritative for auth users (bidirectional sync), secondary for anon
    const url = isAuthed
      ? '/api/feedback/status'
      : `/api/feedback/status?sessionId=${encodeURIComponent(sessionId)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data: { submitted: boolean }) => {
        if (cancelled) return;
        if (data.submitted) {
          ls.setItem(LS.submitted, 'true');
          setAlreadySubmitted(true);
          if (intervalId !== null) clearInterval(intervalId);
        } else if (isAuthed && lsSubmitted) {
          // DB says not submitted — localStorage was stale; correct it
          ls.removeItem(LS.submitted);
          setAlreadySubmitted(false);
          startPopupInterval();
        }
      })
      .catch(() => { /* non-fatal */ });

    // Start popup interval immediately unless we're waiting for DB to un-stale an auth flag
    if (!lsSubmitted) {
      startPopupInterval();
    }
    // If lsSubmitted && isAuthed: startPopupInterval() fires inside .then() only if DB says false

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [session?.user?.id, isFeedbackSuppressed]); // re-run if auth state changes

  useEffect(() => {
    if (!isFeedbackSuppressed) return;

    setOpenModal(null);
    setShowSuccess(false);
    setSubmitError('');
  }, [isFeedbackSuppressed]);

  // ── focus trap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openModal) return;

    // Collect all focusable elements inside the modal
    const modal = document.getElementById('feedback-modal-box');
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    first?.focus();

    function trapTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && openModal === 'button') closeModal();
      // Escape intentionally does NOT close auto-popup (per spec)
    }

    document.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', trapTab);
      document.removeEventListener('keydown', onEscape);
    };
  }, [openModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── actions ───────────────────────────────────────────────────────────────
  function resetForm() {
    setRating(0);
    setReviewText('');
    setSubmitError('');
  }

  function closeModal() {
    setOpenModal(null);
    setShowSuccess(false);
    resetForm();
    setTimeout(() => buttonRef.current?.focus(), 50);
  }

  function openButtonModal() {
    const ls = safeLS();
    if (ls) {
      const firstVisit = ls.getItem(LS.firstVisit);
      if (firstVisit) {
        const fiveMin = new Date(firstVisit).getTime() + 5 * 60 * 1000;
        if (Date.now() < fiveMin) {
          // Within first 5 minutes — mark manually opened
          ls.setItem(LS.manuallyOpened, 'true');
          // Move popup to +25min from first visit (if not already past that)
          const nextPopup25 = new Date(new Date(firstVisit).getTime() + 25 * 60 * 1000);
          const existing = ls.getItem(LS.nextPopup);
          if (!existing || new Date(existing) < nextPopup25) {
            ls.setItem(LS.nextPopup, nextPopup25.toISOString());
          }
        }
      }
    }
    setOpenModal('button');
  }

  function dismissPopup() {
    const ls = safeLS();
    if (ls) {
      const next = new Date(Date.now() + 20 * 60 * 1000);
      ls.setItem(LS.nextPopup, next.toISOString());
    }
    closeModal();
  }

  async function handleSubmit() {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    const sessionId = getOrCreateSessionId();
    const pageUrl   = window.location.pathname;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review: reviewText || undefined, sessionId, pageUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'server_error');
      }

      // Success — suppress future popups, show success state, then reset form
      safeLS()?.setItem(LS.submitted, 'true');
      safeLS()?.removeItem(LS.nextPopup);
      setAlreadySubmitted(true);
      setShowSuccess(true);

      // Auto-close after 2 seconds; form resets in closeModal()
      setTimeout(() => closeModal(), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'server_error';
      setSubmitError(
        msg === 'review_too_long'
          ? 'Your review is too long (max 500 characters).'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isOpen = openModal !== null;

  if (isFeedbackSuppressed) {
    return null;
  }

  return (
    <>
      {/* ── Floating button ───────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        onClick={openButtonModal}
        aria-label="Open feedback form"
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        {/* star icon */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Feedback
      </button>

      {/* ── Modal overlay ─────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop — click to close button modal only */}
          <div
            className="fixed inset-0 bg-black/50 z-[10000]"
            aria-hidden="true"
            onClick={openModal === 'button' ? closeModal : undefined}
          />

          {/* Modal box */}
          <div
            id="feedback-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative pointer-events-auto">
              {/* Close × */}
              <button
                onClick={openModal === 'popup' ? dismissPopup : closeModal}
                aria-label="Close feedback"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                ×
              </button>

              <ModalContent
                showSuccess={showSuccess}
                alreadySubmitted={alreadySubmitted}
                openModal={openModal}
                rating={rating}
                setRating={setRating}
                reviewText={reviewText}
                setReviewText={setReviewText}
                submitting={submitting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onDismissPopup={dismissPopup}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
