import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { submitPlanReview } from '@/lib/api';
import type { PlanReview } from '@/types/target';

interface PlanReviewModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  existingReview: PlanReview | null;
}

const MAX_STARS = 5;

export function PlanReviewModal({
  open,
  onClose,
  planId,
  planName,
  existingReview,
}: PlanReviewModalProps) {
  const { t } = useTranslation();
  const [score, setScore] = useState<number>(existingReview?.score ?? 0);
  const [note, setNote] = useState<string>(existingReview?.note ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isUpdating = !!existingReview;
  const canSubmit = score >= 1 && score <= MAX_STARS && !submitting;

  useEffect(() => {
    if (open) {
      setScore(existingReview?.score ?? 0);
      setNote(existingReview?.note ?? '');
      setSubmitting(false);
    }
  }, [open, existingReview?.id, existingReview?.score, existingReview?.note]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitPlanReview(planId, score, note.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to submit plan review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 animate-backdrop-in"
      onClick={onClose}
      data-testid="plan-review-modal"
    >
      <div
        className="mx-6 w-full max-w-sm rounded-(--radius-modal) bg-surface p-(--spacing-card) shadow-(--shadow-modal) animate-review-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          {/* Trophy icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon name="emoji_events" size={28} color="var(--color-primary)" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-foreground">
            {t('tasks.planReview.congratsTitle', 'Plan Complete!')}
          </h3>

          {/* Subtitle */}
          <p className="mt-1.5 text-center text-sm leading-5 text-muted-foreground">
            {t('tasks.planReview.congratsSubtitle', 'How was "{{planName}}"?', { planName })}
          </p>

          {/* Prompt label */}
          <span className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isUpdating
              ? t('tasks.planReview.updatePrompt', 'Update your rating')
              : t('tasks.planReview.ratePrompt', 'Rate this plan')}
          </span>

          {/* Stars */}
          <div className="mt-2.5 flex gap-1" data-testid="plan-review-stars">
            {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                className="p-0.5 transition-transform hover:scale-110"
                aria-label={t('tasks.planReview.starLabel', 'Rate {{star}} stars', { star })}
                data-testid={`star-${star}`}
              >
                <Icon
                  name="star"
                  size={38}
                  filled={star <= score}
                  color={star <= score ? 'var(--color-primary)' : 'var(--color-muted-foreground)'}
                />
              </button>
            ))}
          </div>

          {/* Note textarea */}
          <textarea
            className="mt-4 w-full resize-none rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder={t('tasks.planReview.notePlaceholder', 'Share what worked (optional)') as string}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={submitting}
            data-testid="plan-review-note"
          />

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-4 flex w-full items-center justify-center rounded-(--radius-btn) bg-primary py-3 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            data-testid="plan-review-submit"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              isUpdating
                ? t('tasks.planReview.updateButton', 'Update Review')
                : t('tasks.planReview.submitButton', 'Submit Review')
            )}
          </button>

          {/* Skip button */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="mt-2 w-full py-2.5 text-sm font-medium text-muted-foreground transition-opacity hover:opacity-70"
            data-testid="plan-review-skip"
          >
            {t('tasks.planReview.skipButton', 'Skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
