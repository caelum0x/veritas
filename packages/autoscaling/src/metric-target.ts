// Metric target: tracks desired vs actual metric values for target-tracking policies.
import { z } from 'zod';
import { SignalKindSchema } from './signal.js';

export const MetricTargetSchema = z.object({
  signalKind: SignalKindSchema,
  targetValue: z.number().finite().positive(),
  tolerance: z.number().min(0).max(1).default(0.1),
  resource: z.string().min(1),
});
export type MetricTarget = z.infer<typeof MetricTargetSchema>;

export type MetricTargetAssessment =
  | { action: 'scale_up'; ratio: number }
  | { action: 'scale_down'; ratio: number }
  | { action: 'none' };

export function assessMetricTarget(
  target: MetricTarget,
  currentValue: number,
): MetricTargetAssessment {
  const ratio = currentValue / target.targetValue;
  const lowerBound = 1 - target.tolerance;
  const upperBound = 1 + target.tolerance;

  if (ratio > upperBound) {
    return { action: 'scale_up', ratio };
  }
  if (ratio < lowerBound) {
    return { action: 'scale_down', ratio };
  }
  return { action: 'none' };
}

export function computeDesiredReplicas(
  current: number,
  currentValue: number,
  targetValue: number,
): number {
  if (currentValue <= 0) return current;
  return Math.ceil((currentValue / targetValue) * current);
}
