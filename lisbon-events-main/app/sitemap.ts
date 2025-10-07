
import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base='https://example.com';
  return [
    { url:`${base}/`, changeFrequency:'daily', priority:0.8 },
    { url:`${base}/events`, changeFrequency:'hourly', priority:0.9 },
    { url:`${base}/submit`, changeFrequency:'weekly', priority:0.6 },
    { url:`${base}/blog`, changeFrequency:'weekly', priority:0.5 },
    { url:`${base}/about`, changeFrequency:'yearly', priority:0.3 },
    { url:`${base}/privacy`, changeFrequency:'yearly', priority:0.3 },
    { url:`${base}/advertise`, changeFrequency:'monthly', priority:0.4 }
  ];
}