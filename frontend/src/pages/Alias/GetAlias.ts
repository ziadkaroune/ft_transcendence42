type Player = { alias: string };
type AliasList = string[];
type Match = { player1: string; player2: string; winner: string };

// ----- API calls -----
export async function fetchAliasQueue(): Promise<Player[]> {          /// get players;
  const res = await fetch('http://localhost:3100/players');
  if (!res.ok) throw new Error('Failed to fetch alias queue');
  return res.json();
}

export async function saveAliasQueueToDB(queue: AliasList): Promise<void> { /// save players
  const res = await fetch('http://localhost:3100/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue }),  // Important: wrap queue in an object
  });
  if (!res.ok) throw new Error('Failed to save alias queue');
}

export async function fetchMatchHistory(): Promise<Match[]> {           /// get match history
  const res = await fetch('http://localhost:3100/matches');
  if (!res.ok) throw new Error('Failed to fetch match history');
  return res.json();
}

export async function resetTournamentDB(): Promise<void> {                  //// reset players
  const res = await fetch('http://localhost:3100/players', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to reset tournament');
}