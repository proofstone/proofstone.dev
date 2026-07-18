import { loadRoadmaps } from '../../roadmaps.config.mjs';

// Only live roadmaps that actually have fetched content. Pagination + sitemap use this.
export default function () {
  return loadRoadmaps()
    .filter((r) => r.status === 'live' && r.hasContent)
    .sort((a, b) => a.order - b.order);
}
