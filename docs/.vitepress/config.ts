import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Honeymelon',
  description: 'A professional media converter for macOS Apple Silicon',
  base: '/',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Honeymelon' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Development', link: '/development/contributing' },
      { text: 'Legal', link: '/legal/license-compliance' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'Contributing', link: '/development/contributing' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Honeymelon?', link: '/guide/what-is-honeymelon' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'User Guide',
          items: [
            { text: 'Converting Files', link: '/guide/converting-files' },
            { text: 'Presets & Quality', link: '/guide/presets' },
            { text: 'Batch Processing', link: '/guide/batch-processing' },
            { text: 'Preferences', link: '/guide/preferences' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Supported Formats', link: '/guide/supported-formats' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'Getting Support', link: '/guide/support' },
          ],
        },
        {
          text: 'Legal & Privacy',
          items: [
            { text: 'License Activation', link: '/guide/licensing' },
            { text: 'Privacy Policy', link: '/guide/privacy' },
            { text: 'EULA', link: '/legal/eula' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Conversion Pipeline', link: '/architecture/pipeline' },
            { text: 'FFmpeg Integration', link: '/architecture/ffmpeg' },
            { text: 'State Management', link: '/architecture/state' },
            { text: 'Tech Stack', link: '/architecture/tech-stack' },
            { text: 'Decision Records (ADR)', link: '/architecture/adr' },
          ],
        },
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Contributing', link: '/development/contributing' },
            { text: 'Building from Source', link: '/development/build' },
            { text: 'Testing', link: '/development/testing' },
            { text: 'API Reference', link: '/development/api-reference' },
            { text: 'Working with AI Agents', link: '/development/agents' },
            { text: 'Working with Claude', link: '/development/claude' },
            { text: 'Deployment Checklist', link: '/development/deployment' },
            { text: 'Codebase Enhancement Plan', link: '/development/enhancement-plan' },
            { text: 'Roadmap', link: '/development/roadmap' },
          ],
        },
      ],
      '/legal/': [
        {
          text: 'Legal',
          items: [
            { text: 'License Compliance', link: '/legal/license-compliance' },
            { text: 'EULA', link: '/legal/eula' },
            { text: 'Commercial License', link: '/legal/commercial-license' },
            { text: 'Third Party Notices', link: '/legal/third-party-notices' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/honeymelon-app/honeymelon' }],

    footer: {
      message: 'Built with Tauri, Vue, and Rust',
      copyright: 'Copyright © 2025 Jerome Thayananthajothy',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/honeymelon-app/honeymelon/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
  },
});
