(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
      return;
    }
    fn();
  }

  function bindAction(element, action) {
    if (!element || typeof action !== "function") return;

    const run = event => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };

    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.removeAttribute("for");
    element.addEventListener("click", run, true);
    element.addEventListener("touchend", run, true);
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") run(event);
    });
  }

  ready(function () {
    const screenshotInput = document.querySelector("#screenshotInput");
    const screenshotControl = document.querySelector(".file-label");

    if (screenshotInput && screenshotControl) {
      screenshotInput.classList.add("screenshot-input");
      screenshotControl.setAttribute("role", "button");
      screenshotControl.setAttribute("tabindex", "0");

      const openPicker = event => {
        event.preventDefault();
        event.stopPropagation();
        screenshotInput.click();
      };

      screenshotControl.addEventListener("click", openPicker, true);
      screenshotControl.addEventListener("touchend", openPicker, true);
      screenshotControl.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") openPicker(event);
      });
    }

    bindAction(document.querySelector("#scanLink"), window.scan);
    bindAction(document.querySelector("#zapLink"), window.zap);
    bindAction(document.querySelector("#notScamLink"), window.markNotScam);
  });
})();
