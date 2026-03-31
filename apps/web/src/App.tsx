import { Routes, Route, Navigate } from 'react-router-dom';
import { ProjectsPage } from '@/features/project/ProjectsPage';
import { ProjectDetailPage } from '@/features/project/ProjectDetailPage';
import { FeatureDetailPage } from '@/features/feature/FeatureDetailPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { UserManagementPage } from '@/features/user/UserManagementPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/projects/:projectId/features/:featureId" element={<FeatureDetailPage />} />
          <Route path="/users" element={<UserManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
      <Toaster />
    </div>
  );
}
