#!/usr/bin/env python3
"""Validate all words formed in a Nigel game log against TWL06 dictionary.

Usage:
    python3 validate_game_words.py <path_to_debug_log.json>
"""

import json
import sys
import os
from typing import List, Optional, Set, Tuple, Dict


def load_twl06(path: str) -> Set[str]:
    """Load TWL06 dictionary, return set of uppercase words."""
    words = set()
    with open(path) as f:
        for line in f:
            w = line.strip().upper()
            if w:
                words.add(w)
    return words


def reconstruct_board(entries: List[dict]) -> List[List[Optional[str]]]:
    """Walk log entries and return the final board state."""
    board: List[List[Optional[str]]] = [[None] * 15 for _ in range(15)]
    for e in entries:
        if e['category'] != 'PLACE':
            continue
        d = e['data']
        board[d['row']][d['col']] = d['letter']
    return board


def scan_words_on_board(board: List[List[Optional[str]]]) -> List[Tuple[str, int, int, int, int, str]]:
    """Scan all contiguous runs of 2+ letters in rows and columns.

    Returns list of (word, row_start, col_start, row_end, col_end, orientation).
    """
    found = []
    # Horizontal
    for r in range(15):
        c = 0
        while c < 15:
            if board[r][c] is not None:
                start_c = c
                letters = []
                while c < 15 and board[r][c] is not None:
                    letters.append(board[r][c])
                    c += 1
                word = ''.join(letters)
                if len(word) >= 2:
                    found.append((word, r, start_c, r, c - 1, 'H'))
            else:
                c += 1
    # Vertical
    for c in range(15):
        r = 0
        while r < 15:
            if board[r][c] is not None:
                start_r = r
                letters = []
                while r < 15 and board[r][c] is not None:
                    letters.append(board[r][c])
                    r += 1
                word = ''.join(letters)
                if len(word) >= 2:
                    found.append((word, start_r, c, r - 1, c, 'V'))
            else:
                r += 1
    return found


def validate_game(log_path: str, twl_path: str) -> List[dict]:
    """Main validation: walk log, reconstruct board after each commit, validate words."""
    with open(log_path) as f:
        data = json.load(f)
    entries = data['log_entries']

    twl = load_twl06(twl_path)
    print(f'Loaded {len(twl)} TWL06 words')

    board = [[None] * 15 for _ in range(15)]

    # Check if this is a new-format log where PLACEs come after COMMIT
    # Strategy: walk sequentially. When hitting COMMIT for (turn, player),
    # look ahead for PLACEs with same (turn, player) in the NEXT entries
    # that are between this COMMIT and the next non-PLACE entry.

    results = []
    i = 0
    total_commits = 0
    invalid_found = 0

    while i < len(entries):
        e = entries[i]
        cat = e['category']

        if cat == 'PLACE':
            d = e['data']
            board[d['row']][d['col']] = d['letter']
            i += 1
            continue

        if cat == 'COMMIT':
            tn = e['turnNumber']
            pn = e['playerName']
            claimed_words_str = e.get('data', {}).get('words', '')
            claimed_words = set(w.strip().upper() for w in claimed_words_str.split(',') if w.strip())

            # Look ahead for PLACEs belonging to this COMMIT
            # (they appear after COMMIT in the log)
            j = i + 1
            commit_places = []
            while j < len(entries):
                nxt = entries[j]
                if nxt['category'] == 'PLACE' and nxt['turnNumber'] == tn and nxt['playerName'] == pn:
                    commit_places.append(nxt)
                    j += 1
                elif nxt['category'] in ('COMMIT', 'DRAW', 'AI', 'EXCHANGE', 'PASS', 'BINGO', 'ERROR', 'VALIDATE', 'PLAY', 'REMOVE', 'RECALL', 'REPORT', 'STATE', 'DRAG', 'FORFEIT') and nxt['turnNumber'] == tn and nxt['playerName'] == pn:
                    j += 1
                else:
                    break

            # Apply the PLACEs to board
            for ce in commit_places:
                d = ce['data']
                board[d['row']][d['col']] = d['letter']

            total_commits += 1

            # Scan board for all contiguous words
            board_words = scan_words_on_board(board)
            board_word_set = set(w[0] for w in board_words)

            # Validate each word against TWL
            invalid_words = []
            for w, r1, c1, r2, c2, orient in board_words:
                if w not in twl:
                    invalid_words.append((w, r1, c1, r2, c2, orient))

            # Check if any claimed words are NOT on the board
            claimed_not_on_board = claimed_words - board_word_set

            # Check if any words on board are NOT claimed
            on_board_not_claimed = board_word_set - claimed_words

            result = {
                'turn': tn,
                'player': pn,
                'claimed': claimed_words,
                'board_words': board_word_set,
                'invalid': invalid_words,
                'claimed_not_on_board': claimed_not_on_board,
                'on_board_not_claimed': on_board_not_claimed,
            }
            results.append(result)

            if invalid_words:
                invalid_found += len(invalid_words)
                for w, r1, c1, r2, c2, orient in invalid_words:
                    print(f'  INVALID: turn T{tn} {pn:15s} word="{w}" at row={r1}-{r2} col={c1}-{c2} {orient}')

            if on_board_not_claimed:
                for w in sorted(on_board_not_claimed):
                    claimed_str = ', '.join(sorted(claimed_words)) if claimed_words else '(none)'
                    print(f'  UNCLAIMED: turn T{tn} {pn:15s} word="{w}" on board but engine claimed [{claimed_str}]')

            # Skip past the entries we already consumed
            # (commit_places start right after i, and we may have skipped some)
            i = j
            continue

        i += 1

    print(f'\nTotal commits: {total_commits}')
    print(f'Total invalid words found: {invalid_found}')
    return results


def main():
    log_path = sys.argv[1] if len(sys.argv) > 1 else '/Users/matthewcole/Documents/nigel-debug-log-2026-05-27 new.json'
    twl_path = sys.argv[2] if len(sys.argv) > 2 else '/Volumes/SKEPTA/NigelBrowser/src/assets/twl06.txt'

    if not os.path.exists(log_path):
        print(f'Error: log file not found: {log_path}')
        sys.exit(1)
    if not os.path.exists(twl_path):
        print(f'Error: dictionary not found: {twl_path}')
        sys.exit(1)

    print(f'Log: {log_path}')
    print(f'Dict: {twl_path}')
    print()

    results = validate_game(log_path, twl_path)

    # Summary
    all_invalid = []
    for r in results:
        for w, r1, c1, r2, c2, orient in r['invalid']:
            all_invalid.append((r['turn'], r['player'], w, r1, c1, r2, c2, orient))

    if all_invalid:
        print(f'\n{"="*60}')
        print(f'{len(all_invalid)} INVALID WORD(S) DETECTED')
        print(f'{"="*60}')
        for turn, player, word, r1, c1, r2, c2, orient in sorted(all_invalid):
            print(f'  T{turn:2d} {player:15s} "{word}" at ({r1},{c1})-({r2},{c2}) {orient}')
    else:
        print(f'\nAll words are valid!')

    # Exit with error code if any invalid words found
    return 1 if all_invalid else 0


if __name__ == '__main__':
    sys.exit(main())
