export default function sitemap() {
  return [
    {
      url: 'https://smu-server-status-viewer.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
  ];
}
