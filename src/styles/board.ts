const BOARD_PADDING = 32;
const MIN_CELL_SIZE = 22;
const MAX_CELL_SIZE = 44;
const BOARD_SIZE = 15;

export function getBoardSquareSize(viewportWidth: number): number {
  const available = viewportWidth - BOARD_PADDING * 2;
  const cellFromWidth = Math.floor(available / BOARD_SIZE);
  return Math.max(MIN_CELL_SIZE, Math.min(cellFromWidth, MAX_CELL_SIZE));
}

export const boardSquareSize = MAX_CELL_SIZE;
