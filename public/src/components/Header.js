import React from 'react';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">
          <span className="icon">🚀</span>
          Benching Machine
        </h1>
        <p className="header-subtitle">
          Performance Benchmarking: JavaScript • Rust • WebAssembly
        </p>
      </div>
    </header>
  );
}

export default Header;
