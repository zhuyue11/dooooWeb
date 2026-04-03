import { useParams } from 'react-router-dom';
import { StubPage } from '../StubPage';
export function TargetDetailPage() {
  const { targetId } = useParams();
  return <StubPage title="Target Detail" description={`Target ${targetId}`} />;
}
