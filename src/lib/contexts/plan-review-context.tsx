import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PlanReviewModal } from '@/components/targets/PlanReviewModal';
import type { PlanExecutionCompleted } from '@/types/target';

interface PlanReviewContextValue {
  showPlanReview: (data: PlanExecutionCompleted) => void;
}

const PlanReviewContext = createContext<PlanReviewContextValue | null>(null);

export function PlanReviewProvider({ children }: { children: ReactNode }) {
  const [reviewData, setReviewData] = useState<PlanExecutionCompleted | null>(null);

  const showPlanReview = useCallback((data: PlanExecutionCompleted) => {
    setReviewData(data);
  }, []);

  return (
    <PlanReviewContext.Provider value={{ showPlanReview }}>
      {children}
      {reviewData && (
        <PlanReviewModal
          open
          onClose={() => setReviewData(null)}
          planId={reviewData.planId}
          planName={reviewData.planName}
          existingReview={reviewData.existingReview}
        />
      )}
    </PlanReviewContext.Provider>
  );
}

export function usePlanReview() {
  const ctx = useContext(PlanReviewContext);
  if (!ctx) throw new Error('usePlanReview must be used within PlanReviewProvider');
  return ctx;
}
