// Parses Netlify's _headers format into { '/path': { Header: 'value' } }.
// Shared by vite.config.js (local preview) and the tests, so the policy we
// test locally is exactly the one Netlify serves.
export function parseHeadersFile(text) {
  const rules = {}
  let current = null
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = line.trim()
      rules[current] = {}
    } else if (current) {
      const i = line.indexOf(':')
      rules[current][line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  return rules
}
