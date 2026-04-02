import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Play } from './pages/Play';
import { Editor } from './pages/Editor';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<Play />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
