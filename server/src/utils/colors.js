/**
 * Avatar / cursor colors palette as per Blueprint Section 5.1 & 8.5
 */
export const AVATAR_PALETTE = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

/**
 * Returns a random hex color from the palette
 */
export function getRandomColor() {
  const index = Math.floor(Math.random() * AVATAR_PALETTE.length);
  return AVATAR_PALETTE[index];
}
