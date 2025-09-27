import { Task, STATE } from './task.js';
import { Local } from './local.js';
import { sleep } from './utils.js';


// Service worker for MV3
// 当标签页激活或更新时，检查 URL 是否匹配并设置或移除 action popup

const rules = [
    /(?:www\.)?paipai\.fm\/r\d+/,
    /(?:www\.)?paipai\.fm\/read\.php\?tid=\d+/
];

const host = 'www.paipai.fm'


/**
 * 匹配popup页面
 * @param {*} url 
 * @return {boolean}
 */
const matchUrl = (url) => {
    // return host == new URL(url).host
    return rules.some((r) => r.test(url));
};

async function updateActionForTab(tab, url) {
    if (matchUrl(url)) {
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: './side_panel/index.html',
            enabled: true
        });
    } else {
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: false
        });
    }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        updateActionForTab(tab, tab.url);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        updateActionForTab(tab, changeInfo.url);
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
        updateActionForTab(tab, tab.url);
    }
});

// chrome.sidePanel
//     .setPanelBehavior({ openPanelOnActionClick: true })
//     .catch((error) => console.error(error));

chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url && matchUrl(tab.url)) {
        chrome.sidePanel.open({ tabId: tab.id });
    } else {
        chrome.runtime.openOptionsPage();
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    const type = message.type;
    console.log('Received message in background:', message);
    sendResponse({ success: true });
});

// 在 background.js 中设置定时器
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('longTask', {
        periodInMinutes: 1 // 每分钟触发一次
    });
});

// 响应定时器事件
chrome.alarms.onAlarm.addListener(async alarm => {
    // console.log('触发定时器');
    Local.log('触发定时器保活service worker');
});
worker();
async function worker() {
    // console.log('执行周期任务');

    /**
     * @type {Array<Task>}
     */
    const tasks = Object.values(await Local.getTasks());
    // 先寻找正在评分的任务
    let task = tasks.find(task => task.state === STATE.IN_PROGRESS);
    if (task) {
        // console.log('找到工作中的任务', task.id);
    }
    else {
        // 再寻找等待更多回复的任务
        const _tasks = tasks
            .filter(task => task.state === STATE.WAIT_MORE_POST)
            // 找出更老的任务
            .sort((a, b) => a.lastCheckTime - b.lastCheckTime);
        task = _tasks[0];
        if (task) {
            // console.log('找到等待更多回复的任务', task.id);
            // Local.taskLog(task, ['check_more_post']);
        }
    }
    if (task) {
        await Local.set('working', task.id);
        console.log(`正在处理任务:${task.id}, ${task.title}`);
        await task.startRating();
        await task.save();
        await Local.remove('working');
        await sleep(2000);
    } else {
        await sleep(5000);
    }
    worker();
}