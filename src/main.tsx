import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import {useAppStore} from './store/useAppStore';
import './index.css';

// Potato mode turns off transform/layout animations app-wide.
function Root() {
  const graphicsMode = useAppStore((s) => s.graphicsMode);
  return (
    <MotionConfig reducedMotion={graphicsMode === 'potato' ? 'always' : 'user'}>
      <App />
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
