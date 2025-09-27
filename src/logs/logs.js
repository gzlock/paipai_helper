import { Local } from "../local.js";
import { Task } from "../task.js";
import { sleep } from "../utils.js";

let lastTime = 0;
document.addEventListener('DOMContentLoaded', () => {
    const $list = document.getElementById('log-list');
    const $cleanBtn = document.getElementById('clear-logs-btn');
    $cleanBtn.addEventListener('click', async () => {
        if (!confirm('确定要清空日志吗？')) return;
        await Local.set('logs', []);
        $list.innerHTML = '';
        renderLogs($list);
    });
    renderLogs($list);
});

/**
 * 渲染日志列表
 * @param {HTMLElement} $list 
 */
async function renderLogs($list) {
    /** @type {Array<LogEntry>} */
    const logs = await Local.get('logs') || [];
    const tasks = await Local.getTasks();
    document.getElementById('count').textContent = logs.length;
    logs.forEach(log => {
        const [time, content] = log;
        if (time <= lastTime) return; // 只渲染最新的日志
        const date = new Date(time);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const $li = document.createElement('li');
        $li.className = 'new';
        $li.innerHTML = `<span class="time">${timeStr}</span><span class="content">${content}</span>`;
        $list.appendChild($li);
    });
    lastTime = logs.length ? logs[logs.length - 1][0] : lastTime;
    $list.scrollTop = $list.scrollHeight;
    await sleep(1000);
    renderLogs($list);
}