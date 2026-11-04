import React from 'react';
import ReactDOM from 'react-dom/client';
import esriConfig from '@arcgis/core/config';
import App from './App';
import './index.css';

esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);