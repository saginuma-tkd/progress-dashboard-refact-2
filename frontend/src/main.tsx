import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

// 自分が「旧URL」で開かれているかチェックし、旧URLなら新URLへ強制ワープ！
const OLD_DOMAIN = "progress-dashboard-backend.onrender.com";
const NEW_DOMAIN = "progress-dashboard-refact-2.onrender.com";

if (window.location.hostname === OLD_DOMAIN) {
  // パス（/admin/students 等）もそのまま引き継いで一瞬で転送
  window.location.replace(`https://${NEW_DOMAIN}${window.location.pathname}${window.location.search}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
