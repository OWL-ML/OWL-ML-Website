import type { AstroIntegration } from 'astro';
import { loadAndValidate, formatProblems } from './validate.ts';

/**
 * Runs the content checks before every build, so a typo in a member id or theme id fails the
 * build with a readable message instead of reaching the site. In `astro dev` problems are
 * printed but the server keeps running.
 */
export function contentValidation(): AstroIntegration {
  return {
    name: 'owl-content-validation',
    hooks: {
      'astro:config:setup': async ({ command, logger }) => {
        if (command === 'preview') return;
        const { problems } = await loadAndValidate();
        if (!problems.length) {
          logger.info('content OK');
          return;
        }
        const message = `Content check failed (${problems.length} problem(s)):\n\n${formatProblems(problems)}\n`;
        if (command === 'dev') logger.error(message);
        else throw new Error(message);
      },
    },
  };
}
