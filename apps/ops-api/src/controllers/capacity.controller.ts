// Capacity controller: handles HTTP request/response for capacity plans, saturation, and reports.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isErr, newId } from "@veritas/core";
import {
  InMemoryMetricSource,
  MetricSampleSchema,
  CapacityModelSchema,
  forecastUtilization,
  samplesToUtilization,
  averageUtilization,
  classifyUtilization,
  DEFAULT_THRESHOLD,
} from "@veritas/capacity";
import type { MetricSample } from "@veritas/capacity";
import { sendOk, sendCreated } from "../http/responder.js";

const AddSamplesBodySchema = z.object({
  samples: z.array(MetricSampleSchema).min(1),
});

const PlanBodySchema = z.object({
  model: CapacityModelSchema,
  windowMs: z.number().int().positive().default(3_600_000),
  forecastHorizonMs: z.number().int().positive().default(1_800_000),
});

export class CapacityController {
  /** Accumulated metric samples for this process. */
  private readonly sampleStore: MetricSample[] = [];

  private makeSource(): InMemoryMetricSource {
    return new InMemoryMetricSource([...this.sampleStore]);
  }

  async addSamples(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { samples } = AddSamplesBodySchema.parse(req.body);
      for (const s of samples) {
        this.sampleStore.push(s);
      }
      sendCreated(res, { accepted: samples.length });
    } catch (e) { next(e); }
  }

  async plan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { model, windowMs, forecastHorizonMs } = PlanBodySchema.parse(req.body);
      const resourceNames = model.resources.map((r) => r.name as string);
      const rawSamples = await this.makeSource().fetchSamples(resourceNames);

      const utilResult = samplesToUtilization(rawSamples);
      if (isErr(utilResult)) { next(utilResult.error); return; }

      const points = utilResult.value;
      const avgUtil = averageUtilization(points);

      const forecastResult = forecastUtilization(points, forecastHorizonMs);
      const forecasts = isErr(forecastResult) ? [] : forecastResult.value;

      const ratios = Object.values(avgUtil);
      const worst = ratios.length > 0 ? Math.max(...ratios) : 0;
      const threshold = model.resources[0]?.threshold ?? DEFAULT_THRESHOLD;
      const overallTier = classifyUtilization(worst, threshold);

      const nowMs = Date.now();
      const plan = {
        planId: newId("plan"),
        modelId: model.id,
        generatedAt: new Date().toISOString(),
        window: {
          startIso: new Date(nowMs - windowMs).toISOString(),
          endIso: new Date(nowMs).toISOString(),
          granularityMs: Math.floor(windowMs / 60),
        },
        utilizationByResource: avgUtil,
        forecasts,
        overallTier,
      };

      sendOk(res, plan);
    } catch (e) { next(e); }
  }

  async saturation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resourceNames = typeof req.query["resources"] === "string"
        ? req.query["resources"].split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const rawSamples = await this.makeSource().fetchSamples(
        resourceNames.length > 0 ? resourceNames : [],
      );

      const utilResult = samplesToUtilization(rawSamples);
      if (isErr(utilResult)) { next(utilResult.error); return; }

      const points = utilResult.value;
      const nowIso = new Date().toISOString();
      const threshold = DEFAULT_THRESHOLD;

      const byResource = new Map<string, typeof points[number][]>();
      for (const p of points) {
        const existing = byResource.get(p.resourceName) ?? [];
        byResource.set(p.resourceName, [...existing, p]);
      }

      const saturation = Array.from(byResource.entries()).map(([resourceName, pts]) => {
        const sorted = [...pts].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
        const latest = sorted[sorted.length - 1];
        const ratio = latest?.ratio ?? 0;
        const tier = classifyUtilization(ratio, threshold);
        const status: "normal" | "warning" | "critical" =
          tier === "critical" ? "critical" : tier === "elevated" ? "warning" : "normal";
        const ratios = sorted.map((p) => p.ratio);
        const first = ratios[0] ?? 0;
        const last = ratios[ratios.length - 1] ?? 0;
        const delta = last - first;
        const trend: "increasing" | "stable" | "decreasing" =
          delta > 0.05 ? "increasing" : delta < -0.05 ? "decreasing" : "stable";
        return { resourceName, status, ratio, trend, detectedAt: nowIso };
      });

      sendOk(res, { saturation, generatedAt: nowIso });
    } catch (e) { next(e); }
  }

  async forecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const horizonMs = req.query["horizonMs"] ? Number(req.query["horizonMs"]) : 1_800_000;
      const resourceNames = typeof req.query["resources"] === "string"
        ? req.query["resources"].split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const rawSamples = await this.makeSource().fetchSamples(
        resourceNames.length > 0 ? resourceNames : [],
      );

      const utilResult = samplesToUtilization(rawSamples);
      if (isErr(utilResult)) { next(utilResult.error); return; }

      const forecastResult = forecastUtilization(utilResult.value, horizonMs);
      if (isErr(forecastResult)) { next(forecastResult.error); return; }

      sendOk(res, { forecasts: forecastResult.value, generatedAt: new Date().toISOString() });
    } catch (e) { next(e); }
  }
}
