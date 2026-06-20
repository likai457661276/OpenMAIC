import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly logo: Locator;
  readonly textarea: Locator;
  readonly enterButton: Locator;
  readonly interactiveModeToggle: Locator;
  readonly vocationalModeToggle: Locator;
  readonly speechButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.getByLabel('宾果AI智慧课堂');
    this.textarea = page.locator('textarea');
    this.enterButton = page
      .getByRole('button', { name: /enter/i })
      .or(page.locator('button:has-text("进入课堂")'));
    this.interactiveModeToggle = page.getByRole('switch', { name: /interactive mode|深度交互/i });
    this.vocationalModeToggle = page.getByRole('switch', { name: '职教任务' });
    this.speechButton = page.getByRole('button', {
      name: /start listening|voice input|语音输入/i,
    });
  }

  async goto() {
    await this.page.goto('/bingo-agent-class');
  }

  async fillRequirement(text: string) {
    await this.textarea.fill(text);
  }

  async submit() {
    await this.enterButton.click();
  }
}
