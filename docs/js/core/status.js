const statusElement = document.getElementById("status");

export function showStatus(message, type = "loading") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
}

export function installGlobalErrorHandlers() {
    window.addEventListener("error", (event) => {
        showStatus(`Game error: ${event.message}`, "error");
        console.error(event.error || event.message);
    });

    window.addEventListener("unhandledrejection", (event) => {
        showStatus(`Game error: ${String(event.reason)}`, "error");
        console.error(event.reason);
    });
}
