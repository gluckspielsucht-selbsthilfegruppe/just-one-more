import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/dm-serif-display/400.css';
import './styles.css';
import './themes.css';
import './hands.css';
import './motion.css';
import './hackathon-theme.css';
import App from './App';
import { readCachedAppearance } from './appearance';

document.documentElement.dataset.appearance = readCachedAppearance();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="crash">
        <h1>Let’s reshuffle.</h1>
        <p>Something interrupted the table. Your game is saved on the server.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reconnect to your table
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
