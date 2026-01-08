import React, { useState, useEffect } from 'react';
import './App.css';
import HallwayVisualization from './components/HallwayVisualization';
import BenchmarkRunner from './components/BenchmarkRunner';
import Header from './components/Header';

function App() {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="App">
      <Header />
      <div className="main-container">
        <BenchmarkRunner 
          setBenchmarkData={setBenchmarkData}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
        />
        <HallwayVisualization 
          benchmarkData={benchmarkData}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}

export default App;
