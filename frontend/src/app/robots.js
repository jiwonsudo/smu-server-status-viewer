export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://smu-server-status-viewer.vercel.app/sitemap.xml',
  };
}
