import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import DevBenchPage from './pages/DevBenchPage';
import UserBenchPage from './pages/UserBenchPage';
import { useHashRoute } from './hooks/useHashRoute';
import { usePersistentBenchmarkData } from './hooks/usePersistentBenchmarkData';

function App() {
  const [benchmarkData, setBenchmarkData] = usePersistentBenchmarkData();
  const [isRunning, setIsRunning] = useState(false);
  const [route, navigate] = useHashRoute('/dev');

  const isDev = route === '/dev' || route === '';
  const isUser = route === '/user';

  return (
    <div className="App">
      <Header />

      {/* Top navigation: Dev ↔ User */}
      <nav className="top-nav" aria-label="Application mode">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${isDev ? 'active' : ''}`}
            onClick={() => navigate('/dev')}
            aria-current={isDev ? 'page' : undefined}
          >
            <span className="nav-tab-icon">🛠️</span>
            <span className="nav-tab-title">Dev Mode</span>
            <span className="nav-tab-desc">
              Run live benchmarks, inspect compiler charts, and export baselines.
            </span>
          </button>

          <button
            className={`nav-tab ${isUser ? 'active' : ''}`}
            onClick={() => navigate('/user')}
            aria-current={isUser ? 'page' : undefined}
          >
            <span className="nav-tab-icon">🔬</span>
            <span className="nav-tab-title">User Mode</span>
            <span className="nav-tab-desc">
              Playback saved baselines, compare hardware profiles, and explore results.
            </span>
          </button>
        </div>
      </nav>

      <main className="main-container">
        {isDev ? (
          <DevBenchPage
            benchmarkData={benchmarkData}
            setBenchmarkData={setBenchmarkData}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
          />
        ) : (
          <UserBenchPage benchmarkData={benchmarkData} />
        )}
      </main>
    </div>
  );
}

export default App;
