import { parseHTML } from './linkedom-entry.js';



export function gbkArrayBufferToString(buffer) {
    const decoder = new TextDecoder('gbk'); // 使用 GBK 解码器
    return decoder.decode(buffer);
}

/**
 * 回复楼层转换为对应的帖子分页url
 * @param {number} tid 
 * @param {number} floor 
 * @returns 
 */
export async function floorToThreadPageUrl(tid, floor = 1) {
    if (floor < 0) throw new Error('楼层不能小于0');
    const url = floorUrl(tid, floor);
    const html = await fetch(url).then(res => res.arrayBuffer()).then(gbkArrayBufferToString);
    const regex = /url=([^']+)/;
    const match = html.match(regex);
    return match ? `https://www.paipai.fm/${match[1].replace(/&displayMode=\d+/, '')}` : null;
}

export function floorUrl(tid, floor = 1) {
    return `https://www.paipai.fm/job.php?action=tofloor&floor=${floor}&tid=${tid}`;
}

/**
 * 暂停指定时间的异步函数。
 * @param {number} ms - 要暂停的时间，单位为毫秒。
 * @returns {Promise<void>} 一个在指定时间后解决的 Promise。
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 
 * @param {*} tId 
 * @param {Array} pId 
 * @returns 
 */
export async function getPIdVerify(tId, pId) {
    const form = new FormData();
    form.append('tid', tId);
    form.append('hideUid', '');
    form.append('floor', '');
    form.append('selid[]', pId);

    return fetch(
        `https://www.paipai.fm/operate.php?action=showping&ajax=1`,
        {
            method: 'POST',
            body: form,
        },
    )
        .then(response => response.arrayBuffer())
        .then(gbkArrayBufferToString)
        .then(html => {
            // 处理 HTML 内容
            const match = html.match(/verify" value="([^"]+)/);
            return match ? match[1] : null;
        })
}


/**
 * 获取指定标签页的标题。
 * 
 * @param {*} tabId 
 * @return {Promise<string>}
 */
export function getTitleFromTabId(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => document.getElementById('subject_tpc').textContent.trim(),
    }).then((results) => results[0]?.result);
}


/**
 * 获取指定标签页的用户ID。
 * 
 * @param {*} tabId 
 * @return {Promise<string>}
 */
export function getUIdFromTabId(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId },
        function: () => document.getElementById('menu_userinfomore').querySelector('ul li span').textContent.trim(),
    }).then(results => results[0]?.result);
}


/**
 * @typedef {Object} PostInfo
 * @property {string} uId - 用户 ID
 * @property {number} floor - 楼层编号
 * @property {string} pId - 回复的ID
 */

/**
 * @typedef {Array<PostInfo>} FloorList
 */

/**
 * 获取用户 ID 与楼层、帖子 ID 的映射
 *  
 * @param {string} url  - 页面地址
 * @returns {Promise<FloorList>}
 */
export async function getFloors(url) {
    const html = await fetch(url).then(res => res.arrayBuffer()).then(gbkArrayBufferToString);
    const { document } = parseHTML(html);
    const threads = document.querySelectorAll('div.read_t');
    const res = [];
    for (let index = 0; index < threads.length; index++) {
        const $thread = threads[index];

        let pId = $thread.id.split('_')[1].trim();
        if (pId !== 'tpc') {
            pId = parseInt(pId);
        }

        let uId = $thread.querySelector('.add_home');
        uId = parseInt(uId.href.split('uid=')[1].trim());


        let floor = $thread.querySelector('span.fr a:last-of-type').textContent;
        if (floor.endsWith('楼')) {
            floor = parseInt(floor.slice(0, -1));
        } else if (floor === '楼主') {
            floor = 0;
        } else if (floor === '沙发') {
            floor = 1;
        } else if (floor === '板凳') {
            floor = 2;
        } else if (floor === '地板') {
            floor = 3;
        }
        res.push({ uId, floor, pId });
    }
    return res;
}