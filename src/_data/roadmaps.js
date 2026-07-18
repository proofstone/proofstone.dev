import { loadRoadmaps } from '../../roadmaps.config.mjs';

// All roadmaps (live + teaser), sorted by declared order. Home uses this.
export default function () {
  return loadRoadmaps().sort((a, b) => a.order - b.order);
}
