import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AIProviderFactory } from '../ai/ai-provider.factory';

@Injectable()
export class DocumentVersionService {
  private readonly logger = new Logger(DocumentVersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
  ) {}

  /**
   * Generate an AI diff summary for a changelog entry.
   * Runs asynchronously — call without await from publish flow.
   * Updates FeatureChangelog.changeSummary when done.
   */
  async generateChangeSummary(
    changelogId: string,
    previousContent: string,
    newContent: string,
  ): Promise<void> {
    try {
      const provider = this.aiFactory.getProvider();
      const diff = await provider.summarizeDocumentChanges(previousContent, newContent);

      const summaryText = this.formatSummary(diff);

      await this.prisma.featureChangelog.update({
        where: { id: changelogId },
        data: { changeSummary: summaryText },
      });

      this.logger.log(`[DocumentVersion] Changelog ${changelogId} summary generated.`);
    } catch (err) {
      this.logger.error(`[DocumentVersion] Failed to generate changelog ${changelogId}: ${(err as Error).message}`);
      // Write an error placeholder so the frontend knows AI failed (not still pending)
      await this.prisma.featureChangelog.update({
        where: { id: changelogId },
        data: { changeSummary: '_AI summary unavailable._' },
      }).catch(() => {});
    }
  }

  private formatSummary(diff: { summary: string; added: string[]; removed: string[]; modified: string[] }): string {
    const lines: string[] = [`**${diff.summary}**`];

    if (diff.added.length > 0) {
      lines.push('\n**Added:**');
      diff.added.forEach((item) => lines.push(`- ${item}`));
    }
    if (diff.removed.length > 0) {
      lines.push('\n**Removed:**');
      diff.removed.forEach((item) => lines.push(`- ${item}`));
    }
    if (diff.modified.length > 0) {
      lines.push('\n**Modified:**');
      diff.modified.forEach((item) => lines.push(`- ${item}`));
    }

    return lines.join('\n');
  }
}
