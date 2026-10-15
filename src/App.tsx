import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { isConfigured } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Study from './pages/Study';
import Quiz from './pages/Quiz';
import Review from './pages/Review';
import MyWords from './pages/MyWords';

export default function App() {
  const { session, loading } = useAuth();

  if (!isConfigured) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="font-display text-2xl mb-3">Supabase 설정이 필요해요</h1>
          <p className="text-ink-soft text-sm leading-relaxed">
            프로젝트 루트에 <code className="bg-paper px-1 rounded">.env</code> 파일을 만들고{' '}
            <code className="bg-paper px-1 rounded">VITE_SUPABASE_URL</code>,{' '}
            <code className="bg-paper px-1 rounded">VITE_SUPABASE_ANON_KEY</code> 를 넣어주세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="font-display text-xl text-ink-mute animate-bob">불러오는 중…</p>
      </div>
    );
  if (!session) return <Login />;

  return (
    <ProgressProvider key={session.user.id}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/review" element={<Review />} />
          <Route path="/words" element={<MyWords />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ProgressProvider>
  );
}
