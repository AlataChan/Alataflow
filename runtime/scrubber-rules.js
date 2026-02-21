function shannonEntropy(str) {
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  return Object.values(freq).reduce((e, f) => {
    const p = f / str.length;
    return e - p * Math.log2(p);
  }, 0);
}

const RULES = [
  {
    name: 'api-key',
    test: (text) => /(sk-[a-zA-Z0-9]{20,}|Bearer [a-zA-Z0-9+/=]{20,})/.test(text),
  },
  {
    name: 'private-key',
    test: (text) => /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/.test(text),
  },
  {
    name: 'password-field',
    test: (text) => /password\s*[:=]\s*\S{8,}/i.test(text),
  },
  {
    name: 'high-entropy',
    test: (text) => {
      const tokens = text.split(/\s+/).filter(t => t.length > 20);
      return tokens.some(t => shannonEntropy(t) > 4.5);
    },
  },
];

export function scanForSensitiveContent(text) {
  if (text.trimStart().startsWith('[SAFE]')) {
    return { hit: false };
  }
  for (const rule of RULES) {
    if (rule.test(text)) {
      return { hit: true, rule: rule.name };
    }
  }
  return { hit: false };
}
