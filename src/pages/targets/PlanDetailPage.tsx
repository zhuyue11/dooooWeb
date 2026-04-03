import { useParams } from 'react-router-dom';
import { StubPage } from '../StubPage';
export function PlanDetailPage() {
  const { planId } = useParams();
  return <StubPage title="Plan Detail" description={`Plan ${planId}`} />;
}
