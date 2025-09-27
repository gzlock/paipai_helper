import { Local } from '../local.js';
import { Task } from '../task.js';
import { getTitleFromTabId } from '../utils.js';


document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const title = await getTitleFromTabId(tab.id);
    const url = tab.url;

    const myUId = await getMyUId(tab.id);

    console.log('我的id', myUId);


    const $point = document.getElementById('rating-input');
    const $content = document.getElementById('rating-content');
    const $btnSubmit = document.getElementById('rating-submit');
    const $msg = document.getElementById('rating-msg');
    const $tasksMsg = document.getElementById('tasks-msg');
    const $start = document.getElementById('rating-start');
    const $end = document.getElementById('rating-end');
    const $cid = document.getElementById('cid');
    const $ifmsg = document.getElementById('ifmsg');
    const $debug = document.getElementById('debug');

    $tasksMsg.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('dash/index.html')
        });
    });

    const tId = getThreadIdFromUrl(url);

    if (tId) {
        document.getElementById('thread-title').textContent = title;
        $btnSubmit.disabled = false;
    } else {
        $btnSubmit.disabled = true;
    }

    setInterval(async () => {
        const tasks = await Local.getTasks();
        const keys = Object.keys(tasks);
        if (keys.length == 0) {
            $tasksMsg.textContent = '当前没有全局任务, 点击查看列表';
        } else {
            const runningId = [];
            for (const id in tasks) {
                const t = tasks[id];
                if (t.state === 1) {
                    runningId.push(id);
                }
            }
            $tasksMsg.textContent = `正在评分中的任务数量: ${runningId.length}, 点击查看列表`;
        }
    }, 500);

    $btnSubmit.addEventListener('click', async () => {
        const hasTask = await Local.hasRunningTask(tId);
        if (hasTask) {
            if (!confirm('已经有相同帖子ID的任务在运行，是否继续添加？')) return;
        }
        if (!myUId) return showMessage('获取用户ID失败，请检查是否登录', 2000, true);

        const point = parseInt($point.value);
        const content = $content.value;
        const start = parseInt($start.value);
        const end = parseInt($end.value);
        if (!point || isNaN(point)) {
            return showMessage('请填写评分', 1500, true);
        }
        if (point < 1) {
            return showMessage('评分不能小于1', 1500, true);
        }

        if (start < 0) {
            return showMessage('开始楼层不能小于0', 2000, true);
        }
        const task = new Task({
            tId,
            title,
            point: point,
            content,
            cid: $cid.value,
            start,
            end,
            ifmsg: $ifmsg.checked,
            skipUId: [myUId],
        });
        await Local.createTask(task);
        showMessage('任务已添加到全局列表', 2000);
    });

    let timeOutHide
    function showMessage(text, ms = 1500, isError = false) {
        clearTimeout(timeOutHide);
        $msg.textContent = text;
        $msg.style.display = 'block';
        $msg.style.color = isError ? 'red' : 'green';
        if (ms > 0) {
            timeOutHide = setTimeout(() => {
                $msg.style.display = 'none';
            }, ms);
        }
    }
});

const rules = [
    /www\.paipai\.fm\/r(\d+)/,
    /www\.paipai\.fm\/read\.php\?tid=(\d+)/
];

/**
 * 从网址获取帖子ID
 * @param {string} url 
 * @returns {number}
 */
function getThreadIdFromUrl(url) {
    for (const rule of rules) {
        const match = url.match(rule);
        if (match) {
            return parseInt(match[1]);
        }
    }
    return null;
}


/**
 * 获取本人账号ID
 * @param {*} tabId 
 * @returns {Promise<number|null>}
 */
async function getMyUId(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            return document.querySelector('#menu_userinfomore span.red').textContent;
        }
    }).then((results) => {
        if (results && results[0] && results[0].result) {
            return parseInt(results[0].result);
        }
        return null;
    });
}