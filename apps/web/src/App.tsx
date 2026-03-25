import { Routes, Route, Navigate } from 'react-router-dom';
import { ProjectsPage } from '@/features/project/ProjectsPage';
import { ProjectDetailPage } from '@/features/project/ProjectDetailPage';
import { FeatureDetailPage } from '@/features/feature/FeatureDetailPage';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/features/:featureId" element={<FeatureDetailPage />} />
      </Routes>
      <Toaster />
    </div>
  );
}
