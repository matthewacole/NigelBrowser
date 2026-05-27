const DEFAULT_PADDING = 32;
const MOBILE_PADDING = 4;
const MIN_CELL_SIZE = 22;
const MAX_CELL_SIZE = 44;
const BOARD_SIZE = 15;
const SIDEBAR_DESKTOP = 280;
const SIDEBAR_TABLET = 220;

export function getBoardSquareSize(
  viewportWidth: number,
  sidebarWidth: number = 0,
  padding: number = DEFAULT_PADDING
): number {
  const available = viewportWidth - padding * 2 - sidebarWidth;
  const cellFromWidth = Math.floor(available / BOARD_SIZE);
  return Math.max(MIN_CELL_SIZE, Math.min(cellFromWidth, MAX_CELL_SIZE));
}

export function getSidebarWidth(isMobile: boolean, isTablet: boolean): number {
  if (isMobile) return 0;
  if (isTablet) return SIDEBAR_TABLET;
  return SIDEBAR_DESKTOP;
}

export function getBoardPadding(isMobile: boolean): number {
  return isMobile ? MOBILE_PADDING : DEFAULT_PADDING;
}

export const boardSquareSize = MAX_CELL_SIZE;
