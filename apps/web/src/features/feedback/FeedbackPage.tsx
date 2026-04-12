import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List } from 'lucide-react';
import { AppFeedbackDialog } from './components/AppFeedbackDialog';
import { RecentFeedbackList } from './components/RecentFeedbackList';

export function FeedbackPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <List size={18} className="text-primary" />
            <h1 className="text-3xl font-bold">Feedback</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Global feedback across the app. The list is windowed for large volumes.
          </p>
        </div>
        <AppFeedbackDialog pageTitle="Feedback" contextLabel="Feedback Page" />
      </div>

      <RecentFeedbackList viewportHeight={720} />
    </div>
  );
}
