/**
 * Main entry point for the Honeymelon Vue 3 application.
 *
 * This file initializes and configures the Vue application instance, setting up essential
 * plugins, global error handling, and production optimizations. It serves as the bootstrap
 * script that transforms the static HTML into a dynamic single-page application (SPA).
 *
 * Key responsibilities:
 * - Creates and configures the root Vue application instance
 * - Integrates state management with Pinia store
 * - Sets up internationalization (i18n) for multi-language support
 * - Implements comprehensive error handling for both Vue-specific and global JavaScript errors
 * - Applies production-specific optimizations and security measures
 * - Prevents unwanted text selection in production for a native desktop app feel
 *
 * The application follows a component-based architecture where this main.ts file acts as
 * the orchestrator, mounting the root App component and establishing the foundation for
 * the entire application's lifecycle.
 */

import './assets/css/global.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './app.vue';

import { i18n } from '@/lib/i18n';

/**
 * Create the root Vue application instance.
 *
 * This initializes the Vue app with the root App component, which serves as the
 * entry point for the entire component tree. The app instance will be configured
 * with plugins and mounted to the DOM element with id 'app'.
 */
const app = createApp(App);

// Production performance optimizations
if (import.meta.env.PROD) {
  app.config.performance = false;
}

// Global error handler for uncaught Vue errors
app.config.errorHandler = (_err, _instance, _info) => {
  // console.error('[Global Error Handler]', err);
  // console.error('Component:', instance);
  // console.error('Error Info:', info);
  // In production, you could send this to an error tracking service
  // For now, we'll just log it to the console
};

// Global warning handler (development only)
if (import.meta.env.DEV) {
  app.config.warnHandler = (_msg, _instance, _trace) => {
    // console.warn('[Vue Warning]', msg);
    // console.warn('Component:', instance);
    // console.warn('Trace:', trace);
  };
}

/**
 * Register essential plugins with the Vue application.
 *
 * - Pinia: Provides centralized state management across the application
 * - i18n: Enables internationalization and localization features
 */
app.use(createPinia());
app.use(i18n);

/**
 * Mount the Vue application to the DOM.
 *
 * This final step renders the application into the HTML element with id 'app',
 * starting the Vue lifecycle and making the application interactive.
 */
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

// Context menu is enabled to allow native cut/copy/paste operations

// Prevent text selection drag in production for better desktop feel
if (import.meta.env.PROD) {
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement;
    // Allow selection in input fields and content editable
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    // Prevent selection for UI elements
    if (target.closest('[data-no-select]') || target.closest('button')) {
      e.preventDefault();
    }
  });
}
