interface AppleIntelligenceBorderProps {
  isBingoMode?: boolean;
}

export function AppleIntelligenceBorder({ isBingoMode = false }: AppleIntelligenceBorderProps) {
  return (
    <div
      className={`ai-border ${isBingoMode ? 'bingo-mode' : ''}`}
      data-bingo={isBingoMode ? 'true' : undefined}
    />
  );
}
