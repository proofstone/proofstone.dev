import { loadRoadmaps } from '../../roadmaps.config.mjs';

// Directions whose content is written but still private, pending an external
// practitioner review. Shown on the home page as honest status cards — they have
// no repo field, so there is nothing to link and nothing to leak.
export default function () {
  return loadRoadmaps()
    .filter((r) => r.status === 'review')
    .sort((a, b) => a.order - b.order);
}
