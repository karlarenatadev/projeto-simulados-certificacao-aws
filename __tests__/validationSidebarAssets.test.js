import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const validationHtml = readFileSync(
  new URL('../src/frontend/validation/valid.html', import.meta.url),
  'utf8',
);
const validationUi = readFileSync(
  new URL('../src/frontend/validation/js/validationUI.js', import.meta.url),
  'utf8',
);

describe('Validation sidebar asset contract', () => {
  test('uses the shared Font Awesome CDN and valid source paths', () => {
    expect(validationHtml).toContain(
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    );
    expect(validationHtml).toContain('href="../css/style.css"');
    expect(validationHtml).toContain("'../../js/shell.js'");
    expect(validationHtml).not.toContain('validation/index.html');
    expect(validationHtml).toContain('<script type="module" src="js/validationUI.js"></script>');
    expect(validationUi).not.toContain('admin-access-section');
    expect(validationUi).not.toContain('applyAdminHash');
    expect(validationUi).not.toContain('access-list');
  });
});
