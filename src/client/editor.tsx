import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorScreen } from './editor/EditorScreen';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <EditorScreen />
  </StrictMode>
);
