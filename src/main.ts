import './assets/css/global.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './app.vue';

const app = createApp(App);

// Global error handler for uncaught Vue errors
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error Handler]', err);
  console.error('Component:', instance);
  console.error('Error Info:', info);

  // In production, you could send this to an error tracking service
  // For now, we'll just log it to the console
};

// Global warning handler (development only)
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('[Vue Warning]', msg);
    console.warn('Component:', instance);
    console.warn('Trace:', trace);
  };
}

app.use(createPinia());
app.mount('#app');

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  event.preventDefault(); // Prevent default browser error handling
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('[Uncaught Error]', event.error || event.message);
});
