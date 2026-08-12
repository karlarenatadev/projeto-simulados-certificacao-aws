const fs = require('fs');
let html = fs.readFileSync('src/frontend/pages/laboratorios.html', 'utf8');

const scriptRegex = /<script type=\"module\">[\s\S]*?<\/script>/;
const newScript = `<script type="module">
  import { initShell } from "./js/shell.js";
  import { authGuard } from "./js/core/authGuard.js";
  import { initLaboratorios } from "./js/modules/laboratorios.js";

  document.addEventListener("DOMContentLoaded", async () => {
    const session = authGuard();
    if (!session) return;
    const user = session.user;
    initShell(user);

    await initLaboratorios();
  });
</script>`;

html = html.replace(scriptRegex, newScript);

fs.writeFileSync('src/frontend/pages/laboratorios.html', html, 'utf8');
console.log('Script updated successfully');
