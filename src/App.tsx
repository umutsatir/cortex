import { MotionConfig } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';

export default function App() {
  // Respect "Reduce motion" in macOS accessibility settings.
  return (
    <MotionConfig reducedMotion="user">
      <AppShell />
    </MotionConfig>
  );
}
