const ROUTES = [
  'auth/login',
  'auth/register',
  'property/search',
  'property/detail',
  'booking/create',
  'booking/list',
  'review/create',
  'support/tickets',
];

const DEVICES = ['desktop', 'mobile', 'tablet'];
const OS = ['macOS', 'Windows', 'iOS', 'Android', 'Linux'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const REFERRERS = ['https://google.com', 'https://bing.com', 'https://twitter.com', '', 'https://reddit.com'];

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

const randomStatus = () => {
  const roll = Math.random();
  if (roll < 0.78) return 200;
  if (roll < 0.86) return 302;
  if (roll < 0.96) return 404;
  return 500;
};

export const generateMockAnalyticsData = ({
  rows = 500,
  days = 7,
} = {}) => {
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;

  return Array.from({ length: rows }).map((_, index) => {
    const occurredAt = new Date(start + Math.random() * (now - start));
    const routeGroup = randomItem(ROUTES);
    const durationMs = Math.max(Math.round(30 + Math.random() * 1200), 10);
    const occurrences = 1 + Math.floor(Math.random() * 8);
    const statusCode = randomStatus();
    const deviceType = randomItem(DEVICES);
    const osName = randomItem(OS);
    const browserName = randomItem(BROWSERS);

    return {
      _id: `mock-${index + 1}`,
      occurredAt: occurredAt.toISOString(),
      bucketStart: new Date(Math.floor(occurredAt.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)).toISOString(),
      occurrences,
      durationMs,
      totalDurationMs: durationMs * occurrences,
      visitorId: `visitor-${1 + Math.floor(Math.random() * 100)}`,
      method: 'GET',
      path: `/api/${routeGroup}`,
      routeGroup,
      statusCode,
      deviceType,
      osName,
      browserName,
      referrer: randomItem(REFERRERS),
      bodyMeta: { path: routeGroup },
    };
  });
};
