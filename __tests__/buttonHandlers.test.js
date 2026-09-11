import { readFileSync } from 'node:fs';

const sprintHtml = readFileSync(
  new URL('../src/frontend/pages/study-sprint.html', import.meta.url),
  'utf8',
);
const appSource = readFileSync(
  new URL('../src/frontend/js/app.js', import.meta.url),
  'utf8',
);

describe('primary button handlers', () => {
  test.each([
    ['sprint-start-btn', 'startMicroSprint', sprintHtml],
  ])('%s uses one module listener without legacy onclick', (id, handler, pageHtml) => {
    const buttonPattern = new RegExp(
      `<button[^>]*id="${id}"[^>]*>`,
      's',
    );
    const button = pageHtml.match(buttonPattern)?.[0];
    const binding = `bindClick("${id}", ${handler});`;

    expect(button).toBeDefined();
    expect(button).not.toContain('onclick=');
    expect(appSource.split(binding)).toHaveLength(2);
  });
});
