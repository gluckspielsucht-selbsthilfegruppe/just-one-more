import { createServer } from 'node:http';

export interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge';
  values: { labels?: Record<string, string>; value: number }[];
}

/** Prometheus text exposition format. */
export function renderMetrics(metrics: Metric[]) {
  const lines: string[] = [];
  for (const metric of metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} ${metric.type}`);
    for (const { labels, value } of metric.values) {
      const label = labels
        ? `{${Object.entries(labels)
            .map(([key, text]) => `${key}="${text}"`)
            .join(',')}}`
        : '';
      lines.push(`${metric.name}${label} ${value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/** Serves GET /metrics on its own listener so the public port never exposes it. */
export function createMetricsServer(collect: () => Metric[]) {
  return createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/metrics') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
    res.end(renderMetrics(collect()));
  });
}
