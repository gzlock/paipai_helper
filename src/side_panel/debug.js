document.addEventListener('DOMContentLoaded', () => {
    const reloadBtn = document.getElementById('reload')
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        })
    }
})