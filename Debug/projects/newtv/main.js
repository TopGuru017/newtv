(function () {
    function setStatus() {
        var el = document.getElementById("js-status");
        if (!el) return;
        var t = new Date().toLocaleTimeString();
        el.textContent = "JavaScript: OK — loaded at " + t;
        el.classList.add("app__status--ok");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setStatus);
    } else {
        setStatus();
    }
})();
