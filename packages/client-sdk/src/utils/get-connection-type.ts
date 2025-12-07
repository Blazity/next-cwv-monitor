export const getConnectionType = () => {
  let conn: unknown;
  if ('connection' in navigator) {
    conn = navigator.connection;
  } else if ('mozConnection' in navigator) {
    conn = navigator.mozConnection;
  } else if ('webkitConnection' in navigator) {
    conn = navigator.webkitConnection;
  } else {
    return 'unknown';
  }
  if (typeof conn !== 'object' || !conn) return 'unknown';
  if (!('effectiveType' in conn) || typeof conn.effectiveType !== 'string') return 'unknown';
  return conn.effectiveType;
};
