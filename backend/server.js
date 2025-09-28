import Fastify from 'fastify';
import cors from '@fastify/cors';
import sqlite3 from 'better-sqlite3';

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

const db = sqlite3('./tournament.db');

// players
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL
  )
`).run();

// matches
db.prepare(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1 TEXT NOT NULL,
    player2 TEXT NOT NULL,
    winner TEXT NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

//settings
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL
  )
`).run();

//queue
db.prepare(`
  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL
  )
`).run();

/** Auto-populate queue if empty */
const queueCount = db.prepare('SELECT COUNT(*) as count FROM queue').get().count;
if (queueCount === 0) {
  const players = db.prepare('SELECT alias FROM players').all();
  const insert = db.prepare('INSERT INTO queue (alias) VALUES (?)');
  const trx = db.transaction(() => {
    for (const { alias } of players) {
      insert.run(alias);
    }
  });
  trx();
  console.log('✅ Queue initialized with all players');
}

/** Players **/

fastify.get('/players', async (_, reply) => {
  try {
    const players = db.prepare('SELECT alias FROM players ORDER BY alias ASC').all();
    console.log(players);
    reply.send(players.map(p => p.alias));
  } catch {
    reply.code(500).send({ error: 'Failed to fetch players' });
  }
});

fastify.post('/players', async (request, reply) => {
  const { alias } = request.body;
  if (!alias || typeof alias !== 'string') {
    return reply.code(400).send({ error: 'Alias is required' });
  }

  try {
    db.prepare('INSERT INTO players (alias) VALUES (?)').run(alias.trim());
    reply.code(201).send({ message: 'Player added' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      reply.code(409).send({ error: 'Alias already exists' });
    } else {
      reply.code(500).send({ error: 'Failed to add player' });
    }
  }
});


fastify.delete('/players', async (_, reply) => {
  try {
    db.prepare('DELETE FROM players').run();
    db.prepare('DELETE FROM queue').run(); // Also clear queue
    reply.send({ message: 'All players deleted' });
  } catch {
    reply.code(500).send({ error: 'Failed to delete players' });
  }
});

/** Matches **/

fastify.get('/matches', async (_, reply) => {
  try {
    const matches = db.prepare('SELECT player1, player2, winner, played_at FROM matches ORDER BY played_at ASC').all();
    reply.send(matches);
  } catch {
    reply.code(500).send({ error: 'Failed to fetch matches' });
  }
});

fastify.post('/matches', async (request, reply) => {
  const { player1, player2, winner } = request.body;
  if (!player1 || !player2 || !winner) {
    return reply.code(400).send({ error: 'player1, player2, and winner are required' });
  }

  const p1 = db.prepare('SELECT 1 FROM players WHERE alias = ?').get(player1);
  const p2 = db.prepare('SELECT 1 FROM players WHERE alias = ?').get(player2);
  const win = db.prepare('SELECT 1 FROM players WHERE alias = ?').get(winner);
  if (!p1 || !p2 || !win) {
    return reply.code(400).send({ error: 'One or more players do not exist' });
  }

  try {
    db.prepare('INSERT INTO matches (player1, player2, winner) VALUES (?, ?, ?)').run(player1, player2, winner);
    reply.code(201).send({ message: 'Match recorded' });
  } catch {
    reply.code(500).send({ error: 'Failed to record match' });
  }
});

fastify.delete('/matches', async (_, reply) => {
  try {
    db.prepare('DELETE FROM matches').run();
    reply.send({ message: 'All matches deleted' });
  } catch {
    reply.code(500).send({ error: 'Failed to delete matches' });
  }
});

/** Queue **/

fastify.get('/queue', async (_, reply) => {
  try {
    const rows = db.prepare('SELECT alias FROM queue ORDER BY id ASC').all();
    reply.send(rows.map(r => r.alias));
  } catch {
    reply.code(500).send({ error: 'Failed to get queue' });
  }
});

fastify.post('/queue', async (request, reply) => {
  const { queue } = request.body;
  if (!Array.isArray(queue)) return reply.code(400).send({ error: 'Queue must be an array of aliases' });

  try {
    const insert = db.prepare('INSERT INTO queue (alias) VALUES (?)');
    const deleteAll = db.prepare('DELETE FROM queue');

    const trx = db.transaction(() => {
      deleteAll.run();
      for (const alias of queue) {
        insert.run(alias);
      }
    });

    trx();
    reply.send({ message: 'Queue updated' });
  } catch {
    reply.code(500).send({ error: 'Failed to update queue' });
  }
});

/** Settings **/

fastify.get('/settings/:username', async (request, reply) => {
  const { username } = request.params;
  try {
    const row = db.prepare('SELECT data FROM settings WHERE username = ?').get(username);
    if (!row) return reply.code(404).send({ error: 'No settings found' });
    reply.send(JSON.parse(row.data));
  } catch {
    reply.code(500).send({ error: 'Failed to fetch settings' });
  }
});

fastify.post('/settings/:username', async (request, reply) => {
  const { username } = request.params;
  const data = request.body;

  try {
    const str = JSON.stringify(data);
    db.prepare(`
      INSERT INTO settings (username, data)
      VALUES (?, ?)
      ON CONFLICT(username) DO UPDATE SET data=excluded.data
    `).run(username, str);
    reply.send({ message: 'Settings saved' });
  } catch {
    reply.code(500).send({ error: 'Failed to save settings' });
  }
});

/** Server Start **/

const start = async () => {
  try {
    await fastify.listen({ port: 3100 });
    console.log('🚀 Server running at http://localhost:3100');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
