/** Relative architectural dimensions inferred from the supplied aerial image, not survey data.
 * Y is up; the main entrance faces +Z. Architectural layout data is kept separate from render objects. */
export const parkBuildings = [
  { id: 'workshop-1', x: -64, z: -33, width: 91, depth: 60, height: 12, kind: 'factory' },
  { id: 'workshop-2', x: 45, z: -33, width: 108, depth: 60, height: 12, kind: 'factory' },
  { id: 'workshop-3', x: -64, z: -85, width: 91, depth: 31, height: 11, kind: 'factory' },
  { id: 'workshop-4', x: 45, z: -85, width: 108, depth: 31, height: 11, kind: 'factory' },
  { id: 'office-west', x: -79, z: 78, width: 56, depth: 21, height: 10, kind: 'office' },
  { id: 'office-east', x: 40, z: 78, width: 104, depth: 24, height: 11, kind: 'office' },
  { id: 'research', x: -111, z: 28, width: 14, depth: 32, height: 15, kind: 'office' },
] as const

