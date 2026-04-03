import { useParams } from 'react-router-dom';
import { StubPage } from '../StubPage';
export function GroupDetailPage() {
  const { groupId } = useParams();
  return <StubPage title="Group Detail" description={`Group ${groupId}`} />;
}
