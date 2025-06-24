import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+
import App from './app'; // Use lowercase to match the actual file name
import './index.css'; // Import your CSS

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);