if ("serviceWorker" in globalThis.navigator) {
  globalThis.addEventListener("load", () => {
    globalThis.navigator.serviceWorker.register("./sw.js").catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Erro ao registrar o Service Worker:", error);
    });
  });
}
