import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExamsPage } from './pages/ExamsPage';
import { ExamEditorPage } from './pages/ExamEditorPage';
import { CreateExamPage } from './pages/CreateExamPage';
import { ResultsPage, ResultDetailPage } from './pages/ResultsPage';
import { StudentsPage } from './pages/StudentsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ExamLandingPage } from './pages/public/ExamLandingPage';
import { ExamTakePage } from './pages/public/ExamTakePage';
import { ResultPage } from './pages/public/ResultPage';
import { PublicLeaderboardPage } from './pages/public/PublicLeaderboardPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Exam Routes */}
      <Route path="/exam/:slug" element={<PublicRoute><ExamLandingPage /></PublicRoute>} />
      <Route path="/exam/:slug/take/:attemptId" element={<PublicRoute><ExamTakePage /></PublicRoute>} />
      <Route path="/exam/:slug/result/:attemptId" element={<PublicRoute><ResultPage /></PublicRoute>} />
      <Route path="/exam/:slug/leaderboard" element={<PublicRoute><PublicLeaderboardPage /></PublicRoute>} />
      
      {/* For backward compatibility */}
      <Route path="/exam/:slug/result/:attemptId" element={<PublicRoute><ResultPage /></PublicRoute>} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
      <Route path="/admin/exams/new" element={<ProtectedRoute><CreateExamPage /></ProtectedRoute>} />
      <Route path="/admin/exams/:examId" element={<ProtectedRoute><ExamEditorPage /></ProtectedRoute>} />
      <Route path="/admin/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/admin/results/:attemptId" element={<ProtectedRoute><ResultDetailPage /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/admin/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />

      {/* Legacy redirects */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/exams" element={<Navigate to="/admin/exams" replace />} />
      <Route path="/exams/:examId" element={<Navigate to="/admin/exams" replace />} />
      <Route path="/students" element={<Navigate to="/admin/students" replace />} />
      <Route path="/results" element={<Navigate to="/admin/results" replace />} />
      <Route path="/leaderboard" element={<Navigate to="/admin/leaderboard" replace />} />

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
