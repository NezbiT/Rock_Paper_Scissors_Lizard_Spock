const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level, tag, message, data) {
  if (levels[level] < levels[LOG_LEVEL]) return;
  const ts = new Date().toISOString().slice(11, 19);
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  const line = `[${ts}] [${tag}] ${message}${extra}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (tag, msg, data) => log('debug', tag, msg, data),
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),
};