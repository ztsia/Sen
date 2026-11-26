import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

// The ten slowest tests of a run, printed at its end, so a test that grows slow is seen and fixed (25 Nov).
export default class Slowest implements Reporter {
  private times: { title: string; ms: number }[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.times.push({ title: `${test.parent.project()?.name ?? ''} › ${test.title}`, ms: result.duration });
  }

  onEnd() {
    if (this.times.length === 0) return;
    const top = [...this.times].sort((a, b) => b.ms - a.ms).slice(0, 10);
    console.log('\nThe ten slowest tests:');
    for (const t of top) console.log(`  ${(t.ms / 1000).toFixed(1).padStart(6)} s  ${t.title}`);
  }

  printsToStdio() {
    return false;
  }
}
