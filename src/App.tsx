import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Play } from './pages/Play';
import { Editor } from './pages/Editor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<Play />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
