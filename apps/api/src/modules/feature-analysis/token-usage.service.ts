import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { TokenUsageSummary } from '../ai/ai-provider.abstract';

export interface StepTokenUsage {
  step: number;
  section: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  model: string;
  createdAt: Date;
}

export interface FeatureTokenUsageResult {
  steps: StepTokenUsage[];
  totals: TokenUsageSummary;
}

export interface FeatureUsageSummary {
  featureId: string;
  featureName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProjectTokenUsageResult {
  features: FeatureUsageSummary[];
  totals: TokenUsageSummary;
}

const FULL_STEP_SENTINEL = '*';

@Injectable()
export class TokenUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async saveStepUsage(
    featureId: string,
    step: number,
    section: string | null,
    usage: TokenUsageSummary,
    provider: string,
    model: string,
  ): Promise<void> {
    const sectionKey = section ?? FULL_STEP_SENTINEL;
    await this.prisma.pipelineTokenUsage.upsert({
      where: { featureId_step_section: { featureId, step, section: sectionKey } },
      update: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        provider,
        model,
      },
      create: {
        featureId,
        step,
        section: sectionKey,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        provider,
        model,
      },
    });
  }

  async getFeatureTokenUsage(featureId: string): Promise<FeatureTokenUsageResult> {
    const rows = await this.prisma.pipelineTokenUsage.findMany({
      where: { featureId },
      orderBy: [{ step: 'asc' }, { createdAt: 'asc' }],
    });

    const steps: StepTokenUsage[] = rows.map((r) => ({
      step: r.step,
      section: r.section === FULL_STEP_SENTINEL ? null : r.section,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      provider: r.provider,
      model: r.model,
      createdAt: r.createdAt,
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        promptTokens: acc.promptTokens + r.promptTokens,
        completionTokens: acc.completionTokens + r.completionTokens,
        totalTokens: acc.totalTokens + r.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );

    return { steps, totals };
  }

  async getProjectTokenUsage(projectId: string): Promise<ProjectTokenUsageResult> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        featureId: string;
        featureName: string;
        promptTokens: bigint;
        completionTokens: bigint;
        totalTokens: bigint;
      }>
    >`
      SELECT
        f.id           AS "featureId",
        f.name         AS "featureName",
        COALESCE(SUM(ptu."promptTokens"), 0)::bigint     AS "promptTokens",
        COALESCE(SUM(ptu."completionTokens"), 0)::bigint AS "completionTokens",
        COALESCE(SUM(ptu."totalTokens"), 0)::bigint      AS "totalTokens"
      FROM "Feature" f
      LEFT JOIN "PipelineTokenUsage" ptu ON ptu."featureId" = f.id
      WHERE f."projectId" = ${projectId}
      GROUP BY f.id, f.name
      ORDER BY SUM(ptu."totalTokens") DESC NULLS LAST, f.name ASC
    `;

    const features: FeatureUsageSummary[] = rows.map((r) => ({
      featureId: r.featureId,
      featureName: r.featureName,
      promptTokens: Number(r.promptTokens),
      completionTokens: Number(r.completionTokens),
      totalTokens: Number(r.totalTokens),
    }));

    const totals = features.reduce(
      (acc, f) => ({
        promptTokens: acc.promptTokens + f.promptTokens,
        completionTokens: acc.completionTokens + f.completionTokens,
        totalTokens: acc.totalTokens + f.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );

    return { features, totals };
  }
}
