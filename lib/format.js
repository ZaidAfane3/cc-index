export function humanAge(mtimeMs) {
  const diffSec = Math.max(0, (Date.now() - mtimeMs) / 1000);
  const units = [
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];
  for (const [label, secs] of units) {
    if (diffSec >= secs) return `${Math.floor(diffSec / secs)}${label} ago`;
  }
  return "just now";
}

export function truncate(str, max) {
  const clean = str.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export function formatDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatLine(s, wide) {
  if (wide) {
    return `${humanAge(s.lastMessageMs).padEnd(9)} ${formatDate(s.birthtimeMs).padEnd(11)} ${s.id.slice(0, 8)}  ${truncate(s.name, 45).padEnd(46)} ${s.entrypoint.padEnd(14)} ${s.cwd || "(unknown dir)"}`;
  }
  return `${humanAge(s.lastMessageMs).padEnd(9)} ${s.id}  ${s.name}`;
}
