import { ANALYTICS_ALL_OPTION, toStatusCategory } from '../types/analytics';

const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toCount = (event) => {
  const count = Number(event?.occurrences);
  return Number.isFinite(count) && count > 0 ? count : 1;
};

const toDuration = (event) => {
  const count = Math.max(toCount(event), 1);
  const totalDurationMs = Number(event?.totalDurationMs);
  if (Number.isFinite(totalDurationMs) && totalDurationMs > 0) {
    return totalDurationMs / count;
  }

  const durationMs = Number(event?.durationMs);
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
};

export const getRouteValue = (event) => {
  const bodyPath = String(event?.bodyMeta?.path || '').trim();
  if (bodyPath) return bodyPath;

  const routeGroup = String(event?.routeGroup || '').trim();
  if (routeGroup) return routeGroup;

  return String(event?.path || 'unknown');
};

export const getBucketKey = (event, bucketMinutes = 15) => {
  const source = toDate(event?.bucketStart) || toDate(event?.occurredAt);
  if (!source) return null;
  const step = bucketMinutes * 60 * 1000;
  const bucketTime = Math.floor(source.getTime() / step) * step;
  return new Date(bucketTime).toISOString();
};

export const groupByRoute = (events = []) => {
  const routeMap = new Map();

  events.forEach((event) => {
    const route = getRouteValue(event);
    const count = toCount(event);
    const current = routeMap.get(route) || { route, occurrences: 0, avgDurationMs: 0, _durationSum: 0 };
    current.occurrences += count;
    current._durationSum += toDuration(event) * count;
    current.avgDurationMs = current.occurrences > 0
      ? Math.round(current._durationSum / current.occurrences)
      : 0;
    routeMap.set(route, current);
  });

  return Array.from(routeMap.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .map((item) => ({ route: item.route, occurrences: item.occurrences, avgDurationMs: item.avgDurationMs }));
};

export const buildHeatmapMatrix = (events = [], options = {}) => {
  const bucketMinutes = options.bucketMinutes || 15;
  const maxRoutes = options.maxRoutes || 12;
  const routesByTraffic = groupByRoute(events).slice(0, maxRoutes).map((item) => item.route);
  const routeSet = new Set(routesByTraffic);

  const cellMap = new Map();
  const bucketSet = new Set();

  events.forEach((event) => {
    const route = getRouteValue(event);
    if (!routeSet.has(route)) return;
    const bucketKey = getBucketKey(event, bucketMinutes);
    if (!bucketKey) return;

    const count = toCount(event);
    const cellKey = `${bucketKey}::${route}`;
    cellMap.set(cellKey, (cellMap.get(cellKey) || 0) + count);
    bucketSet.add(bucketKey);
  });

  const buckets = Array.from(bucketSet).sort((a, b) => new Date(a) - new Date(b));
  const matrixRows = routesByTraffic.map((route) => {
    const values = buckets.map((bucket) => cellMap.get(`${bucket}::${route}`) || 0);
    return { route, values };
  });

  const maxValue = Math.max(
    ...matrixRows.flatMap((row) => row.values),
    1
  );

  return { buckets, rows: matrixRows, maxValue };
};

const quantile = (sortedValues, q) => {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
};

export const computeLatencyDistribution = (events = [], maxRoutes = 10) => {
  const groups = new Map();

  events.forEach((event) => {
    const route = getRouteValue(event);
    const count = toCount(event);
    const duration = toDuration(event);
    const list = groups.get(route) || [];

    for (let i = 0; i < Math.min(count, 25); i += 1) {
      list.push(duration);
    }

    groups.set(route, list);
  });

  return Array.from(groups.entries())
    .map(([route, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      if (!sorted.length) return null;

      const min = sorted[0];
      const q1 = quantile(sorted, 0.25);
      const median = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      const max = sorted[sorted.length - 1];

      return {
        route,
        count: sorted.length,
        min: Math.round(min),
        q1: Math.round(q1),
        median: Math.round(median),
        q3: Math.round(q3),
        max: Math.round(max),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxRoutes);
};

const cleanReferrer = (referrer) => {
  const text = String(referrer || '').trim();
  if (!text) return 'direct';
  try {
    const url = new URL(text);
    return url.hostname || 'direct';
  } catch {
    return text.slice(0, 40);
  }
};

export const buildRequestFlowSankey = (events = [], maxLinks = 40) => {
  const ordered = [...events]
    .map((event) => ({
      ...event,
      _when: toDate(event.occurredAt || event.bucketStart),
      _route: getRouteValue(event),
      _referrer: cleanReferrer(event.referrer),
      _count: toCount(event),
    }))
    .filter((event) => event._when)
    .sort((a, b) => a._when - b._when);

  const byVisitor = new Map();
  ordered.forEach((event) => {
    const visitor = String(event.visitorId || `anon-${event._referrer}`);
    const list = byVisitor.get(visitor) || [];
    list.push(event);
    byVisitor.set(visitor, list);
  });

  const linkMap = new Map();

  const addLink = (source, target, value) => {
    const key = `${source}::${target}`;
    linkMap.set(key, (linkMap.get(key) || 0) + Math.max(value, 1));
  };

  byVisitor.forEach((sequence) => {
    sequence.forEach((event, index) => {
      const count = event._count;
      addLink(`ref:${event._referrer}`, `route:${event._route}`, count);

      const next = sequence[index + 1];
      if (next) {
        addLink(`route:${event._route}`, `next:${next._route}`, Math.max(Math.round((count + next._count) / 2), 1));
      }
    });
  });

  const links = Array.from(linkMap.entries())
    .map(([key, value]) => {
      const [source, target] = key.split('::');
      return { source, target, value: Math.round(value) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, maxLinks);

  const nodeNames = Array.from(new Set(links.flatMap((link) => [link.source, link.target])));
  const indexByName = new Map(nodeNames.map((name, index) => [name, index]));

  return {
    nodes: nodeNames.map((name) => ({ name: name.replace(/^ref:|^route:|^next:/, '') })),
    links: links.map((link) => ({
      source: indexByName.get(link.source),
      target: indexByName.get(link.target),
      value: link.value,
    })),
  };
};

export const buildLatencyScatter = (events = [], maxRoutes = 12) => {
  const topRoutes = groupByRoute(events).slice(0, maxRoutes).map((item) => item.route);
  const routeIndex = new Map(topRoutes.map((route, index) => [route, index]));

  const points = events
    .map((event) => {
      const route = getRouteValue(event);
      if (!routeIndex.has(route)) return null;
      const statusCategory = toStatusCategory(event.statusCode);
      return {
        route,
        routeIndex: routeIndex.get(route),
        durationMs: Math.round(toDuration(event)),
        occurrences: toCount(event),
        statusCategory,
      };
    })
    .filter(Boolean);

  const grouped = {
    '2xx': [],
    '3xx': [],
    '4xx': [],
    '5xx': [],
    other: [],
  };

  points.forEach((point) => {
    grouped[point.statusCategory] = grouped[point.statusCategory] || [];
    grouped[point.statusCategory].push(point);
  });

  return { routes: topRoutes, grouped };
};

export const computeDeviceBreakdown = (events = []) => {
  const nested = new Map();

  events.forEach((event) => {
    const deviceType = String(event.deviceType || 'unknown');
    const osName = String(event.osName || 'Unknown');
    const browserName = String(event.browserName || 'Unknown');
    const count = toCount(event);

    if (!nested.has(deviceType)) nested.set(deviceType, new Map());
    const osMap = nested.get(deviceType);
    if (!osMap.has(osName)) osMap.set(osName, new Map());
    const browserMap = osMap.get(osName);

    browserMap.set(browserName, (browserMap.get(browserName) || 0) + count);
  });

  const deviceData = [];
  const osData = [];
  const browserData = [];

  nested.forEach((osMap, deviceType) => {
    let deviceTotal = 0;

    osMap.forEach((browserMap, osName) => {
      let osTotal = 0;
      browserMap.forEach((value, browserName) => {
        osTotal += value;
        browserData.push({
          name: `${deviceType} / ${osName} / ${browserName}`,
          value,
          deviceType,
          osName,
          browserName,
        });
      });

      deviceTotal += osTotal;
      osData.push({
        name: `${deviceType} / ${osName}`,
        value: osTotal,
        deviceType,
        osName,
      });
    });

    deviceData.push({ name: deviceType, value: deviceTotal, deviceType });
  });

  return {
    deviceData: deviceData.sort((a, b) => b.value - a.value),
    osData: osData.sort((a, b) => b.value - a.value),
    browserData: browserData.sort((a, b) => b.value - a.value),
  };
};

export const applyAnalyticsFilters = (events = [], filters = {}) => {
  const routeFilter = filters.route || ANALYTICS_ALL_OPTION;
  const statusFilter = filters.statusCategory || ANALYTICS_ALL_OPTION;
  const deviceFilter = filters.deviceType || ANALYTICS_ALL_OPTION;

  return events.filter((event) => {
    const route = getRouteValue(event);
    const statusCategory = toStatusCategory(event.statusCode);
    const deviceType = String(event.deviceType || 'unknown');

    if (routeFilter !== ANALYTICS_ALL_OPTION && route !== routeFilter) return false;
    if (statusFilter !== ANALYTICS_ALL_OPTION && statusCategory !== statusFilter) return false;
    if (deviceFilter !== ANALYTICS_ALL_OPTION && deviceType !== deviceFilter) return false;

    return true;
  });
};

export const buildFilterOptions = (events = []) => {
  const routes = new Set();
  const deviceTypes = new Set();

  events.forEach((event) => {
    routes.add(getRouteValue(event));
    deviceTypes.add(String(event.deviceType || 'unknown'));
  });

  return {
    routes: [ANALYTICS_ALL_OPTION, ...Array.from(routes).sort((a, b) => a.localeCompare(b))],
    deviceTypes: [ANALYTICS_ALL_OPTION, ...Array.from(deviceTypes).sort((a, b) => a.localeCompare(b))],
  };
};
