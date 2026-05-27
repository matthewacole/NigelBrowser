import { GameSimulationRunner } from './src/ai/GameSimulationRunner';
import type { Player } from './src/types/Player';
import { createPlayer } from './src/types/Player';

// Helper to create a player
function makePlayer(name: string, type: 'human' | 'computer', difficulty: import('./src/types/Player').Difficulty | null): Player {
  return createPlayer(name, type, difficulty);
}

// Helper to run a single game and return tile usage percentage
async function runGame(players: Player[]): Promise<{ completed: boolean; tileUsagePercent: number; finalBagCount: number }> {
  const runner = new GameSimulationRunner({
    onComplete: (report) => {
      // We don't need to do anything special on complete
    },
    onError: (error) => {
      console.error('Simulation error:', error);
    }
  });

  // Run the game at instant speed to avoid delays
  const report = await runner.runGame(players, 'instant');
   
  // Get the final state from the runner
  const finalState = runner.currentState;
  const initialBagCount = 98; // Standard Scrabble bag size
  const finalBagCount = finalState.game.bag.count;
  const tilesUsed = initialBagCount - finalBagCount;
  const tileUsagePercent = (tilesUsed / initialBagCount) * 100;
   
  const completed = finalState.game.phase !== 'playing';
   
  return { completed, tileUsagePercent, finalBagCount };
}

// Define the 15 matchups
const matchups: { name: string; players: Player[] }[] = [];

// Group 1: All 4 Players the Same (3 matchups)
matchups.push({ name: '4 Beginner', players: Array.from({length: 4}, (_, i) => makePlayer(`Beginner ${i+1}`, 'computer', 'beginner')) });
matchups.push({ name: '4 Intermediate', players: Array.from({length: 4}, (_, i) => makePlayer(`Intermediate ${i+1}`, 'computer', 'intermediate')) });
matchups.push({ name: '4 Expert', players: Array.from({length: 4}, (_, i) => makePlayer(`Expert ${i+1}`, 'computer', 'expert')) });

// Group 2: 3 of One Level, 1 of Another (6 matchups)
matchups.push({ name: '3 Beginner + 1 Intermediate', players: [
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Beginner 2', 'computer', 'beginner'),
  makePlayer('Beginner 3', 'computer', 'beginner'),
  makePlayer('Intermediate 1', 'computer', 'intermediate')
]});
matchups.push({ name: '3 Beginner + 1 Expert', players: [
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Beginner 2', 'computer', 'beginner'),
  makePlayer('Beginner 3', 'computer', 'beginner'),
  makePlayer('Expert 1', 'computer', 'expert')
]});
matchups.push({ name: '3 Intermediate + 1 Beginner', players: [
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Intermediate 2', 'computer', 'intermediate'),
  makePlayer('Intermediate 3', 'computer', 'intermediate'),
  makePlayer('Beginner 1', 'computer', 'beginner')
]});
matchups.push({ name: '3 Intermediate + 1 Expert', players: [
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Intermediate 2', 'computer', 'intermediate'),
  makePlayer('Intermediate 3', 'computer', 'intermediate'),
  makePlayer('Expert 1', 'computer', 'expert')
]});
matchups.push({ name: '3 Expert + 1 Beginner', players: [
  makePlayer('Expert 1', 'computer', 'expert'),
  makePlayer('Expert 2', 'computer', 'expert'),
  makePlayer('Expert 3', 'computer', 'expert'),
  makePlayer('Beginner 1', 'computer', 'beginner')
]});
matchups.push({ name: '3 Expert + 1 Intermediate', players: [
  makePlayer('Expert 1', 'computer', 'expert'),
  makePlayer('Expert 2', 'computer', 'expert'),
  makePlayer('Expert 3', 'computer', 'expert'),
  makePlayer('Intermediate 1', 'computer', 'intermediate')
]});

// Group 3: 2 of One Level, 2 of Another (3 matchups)
matchups.push({ name: '2 Beginner + 2 Intermediate', players: [
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Beginner 2', 'computer', 'beginner'),
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Intermediate 2', 'computer', 'intermediate')
]});
matchups.push({ name: '2 Beginner + 2 Expert', players: [
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Beginner 2', 'computer', 'beginner'),
  makePlayer('Expert 1', 'computer', 'expert'),
  makePlayer('Expert 2', 'computer', 'expert')
]});
matchups.push({ name: '2 Intermediate + 2 Expert', players: [
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Intermediate 2', 'computer', 'intermediate'),
  makePlayer('Expert 1', 'computer', 'expert'),
  makePlayer('Expert 2', 'computer', 'expert')
]});

// Group 4: 2 of One Level, 1 of Each Other Level (3 matchups)
matchups.push({ name: '2 Beginner + 1 Intermediate + 1 Expert', players: [
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Beginner 2', 'computer', 'beginner'),
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Expert 1', 'computer', 'expert')
]});
matchups.push({ name: '2 Intermediate + 1 Beginner + 1 Expert', players: [
  makePlayer('Intermediate 1', 'computer', 'intermediate'),
  makePlayer('Intermediate 2', 'computer', 'intermediate'),
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Expert 1', 'computer', 'expert')
]});
matchups.push({ name: '2 Expert + 1 Beginner + 1 Intermediate', players: [
  makePlayer('Expert 1', 'computer', 'expert'),
  makePlayer('Expert 2', 'computer', 'expert'),
  makePlayer('Beginner 1', 'computer', 'beginner'),
  makePlayer('Intermediate 1', 'computer', 'intermediate')
]});

// Run each matchup 2 times to account for randomness
async function testMatchup(matchup: { name: string; players: Player[] }, runNumber: number) {
  console.log(`\n--- Testing ${matchup.name} (Run ${runNumber}) ---`);
  const { completed, tileUsagePercent, finalBagCount } = await runGame(matchup.players);
  
  console.log(`Completed: ${completed}`);
  console.log(`Tiles used: ${98 - finalBagCount}/98 (${tileUsagePercent.toFixed(2)}%)`);
  console.log(`Final bag count: ${finalBagCount}`);
  
  const success = completed && tileUsagePercent >= 85;
  console.log(`Success (>=85% tiles used and completed): ${success}`);
  
  if (!success) {
    console.warn(`FAILED: ${matchup.name} run ${runNumber} did not meet criteria.`);
  }
  
  return success;
}

async function runAllTests() {
  console.log('Starting AI vs AI difficulty engine validation...');
  console.log('Target: Each game must use at least 85% of the tiles (>=83.3 tiles, so 84+ tiles used)');
  
  let allPassed = true;
  
  for (const matchup of matchups) {
    // Run each matchup twice
    const run1Pass = await testMatchup(matchup, 1);
    const run2Pass = await testMatchup(matchup, 2);
    
    const matchupPassed = run1Pass && run2Pass;
    if (!matchupPassed) {
      allPassed = false;
      console.log(`\n❌ MATCHUP FAILED: ${matchup.name}`);
    } else {
      console.log(`\n✅ MATCHUP PASSED: ${matchup.name}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL MATCHUPS PASSED! The difficulty engine meets the 85% tile usage target.');
  } else {
    console.log('❌ SOME MATCHUPS FAILED. Please review the output above and adjust the difficulty engine.');
  }
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run the tests
runAllTests().then(success => {
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Unexpected error during testing:', err);
  process.exit(1);
});