import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './src/pages/Dashboard';
import UnderwritingList from './src/pages/UnderwritingList';
import UnderwritingDetail from './src/pages/UnderwritingDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/list/:status" element={<UnderwritingList />} />
        <Route path="/detail/:id" element={<UnderwritingDetail />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;