const clients = new Set();

export function liveEvents(_req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  clients.add(res);
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 25_000);
  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

export function announceRun() {
  for (const client of clients) {
    client.write('event: run-completed\ndata: {}\n\n');
  }
}
