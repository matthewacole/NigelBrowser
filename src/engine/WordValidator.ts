export class WordValidator {
  private wordSet: Set<string> | null = null;

  get isLoaded(): boolean {
    return this.wordSet !== null;
  }

  loadWords(words: string[]): void {
    this.wordSet = new Set(words.map(w => w.toUpperCase().trim()).filter(w => w.length > 0));
  }

  isValidWord(word: string): boolean {
    if (!this.wordSet) return true;
    return this.wordSet.has(word.toUpperCase());
  }

  validateWords(words: string[]): { valid: boolean; invalidWords: string[] } {
    if (!this.wordSet) return { valid: true, invalidWords: [] };
    const invalid = words.filter(w => !this.wordSet!.has(w.toUpperCase()));
    return { valid: invalid.length === 0, invalidWords: invalid };
  }
}

export const wordValidator = new WordValidator();
