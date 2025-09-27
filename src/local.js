import { STATE, Task, runningStates } from "./task.js";
import { floorUrl } from "./utils.js";

export class Local {
    /**
     * 读取
     * @param {Array<string>|string} keys
     * @returns {Promise<any>}
     */
    static get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                if (Array.isArray(keys)) {
                    resolve(result); // 返回对象 { key1: val1, key2: val2 }
                } else {
                    resolve(result[keys]); // 返回单个值
                }
            });
        });
    }

    /**
     * 存储
     * @param {string} name
     * @param {*} value
     * @returns {Promise<void>}
     */
    static async set(name, value) {
        // console.log('Local.set', name, value);
        if (!name || !value) {
            throw new Error(`Local.set 报错, ${name} ${value}`);
        }
        return new Promise((resolve) => {
            chrome.storage.local.set({ [name]: value }, () => {
                resolve();
            });
        });
    }

    /**
     * 删除
     * @param {Array<string>|string} keys
     * @returns {Promise<void>}
     */
    static async remove(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(keys, () => {
                resolve();
            });
        });
    }

    static async addListItem(key, val) {
        const list = await Local.get(key) || [];
        const index = list.indexOf(val);
        if (index == -1) {
            list.push(val);
            return Local.set(key, list);
        }
    }
    static async removeListItem(key, val) {
        const list = await Local.get(key) || [];
        const index = list.indexOf(val);
        console.log('删除', list, key, val, index);
        if (index != -1) {
            list.splice(index, 1);
            return Local.set(key, list);
        }
    }

    /**
     * 获取任务列表
     * @returns {Promise<Object<number,Task>>}
     */
    static async getTasks() {
        let tasks = await Local.get('tasks') || {};
        const result = {};
        for (const id in tasks) {
            result[id] = Task.fromJson(tasks[id]);
        }
        return result;
    }
    /**
     * 获取指定的tid的任务
     * @param {number} id 
     * @returns {Promise<Task|null>}
     */
    static async getTask(id) {
        const tasks = await Local.get('tasks') || {};
        if (tasks[id]) {
            return Task.fromJson(tasks[id]);
        }
        return null;
    }
    static async removeTask(id) {
        const tasks = await Local.get('tasks') || {};
        /** @type {Task} */
        const task = tasks[id]
        if (task) {
            Local.taskLog(task, ['delete']);
            delete tasks[id];
            return Local.set('tasks', tasks);
        }
    }
    static async createTask(task) {
        const tasks = await Local.get('tasks') || {};
        tasks[task.id] = task.toJson();
        Local.taskLog(task, ['create']);
        return Local.set('tasks', tasks);
    }

    /**
     * 
     * @param {Task} task 
     * @returns 
     */
    static async saveTask(task) {
        const tasks = await Local.get('tasks') || {};
        if (tasks[task.id]) {
            tasks[task.id] = task.toJson();
            return Local.set('tasks', tasks);
        }
    }
    /**
     * 是否有指定帖子id的任务正在运行
     * @param {number} tId 
     * @returns {Promise<boolean>}
     */
    static async hasRunningTask(tId) {
        const tasks = await Local.get('tasks') || {};
        for (const id in tasks) {
            const t = tasks[id];
            if (t.tId === tId && runningStates.includes(t.state)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 
     * @param {number} id 
     * @returns {Promice<boolean>}
     */
    static async hasTask(id) {
        const tasks = await Local.get('tasks') || {};
        return !!tasks[id];
    }

    static async log(str) {
        const logs = await Local.get('logs') || [];
        logs.push([Date.now(), str]);
        // 保留最新的500条日志
        if (logs.length > 500) {
            logs.splice(-500);
        }
        await Local.set('logs', logs);
    }

    /**
     * 记录日志
     * @param {Task} task
     * @param {Array<any>} args 
     */
    static async taskLog(task, args) {
        let url = `https://www.paipai.fm/r${task.tId}`;
        const link = `<a href="${url}" target="_blank">${task.title}</a>`;
        let content = '';
        const type = args[0];
        switch (type) {
            case 'create':
                content = `创建任务: ${link}`;
                break;
            case 'delete':
                content = `删除任务: ${link}`;
                break;
            case 'pause':
                content = `暂停任务: ${link}`;
                break;
            case 'continue':
                content = `继续执行任务: ${link}`;
                break;
            case 'success':
                content = `任务 ${link}, 成功给 ${floorToLink(task.tId, args[1])} 派 ${task.point} ${cidToName(task.cid)}`;
                break;
            case 'completed':
                content = `完成任务 ${link}`;
                break;
            case 'skip':
                const skipType = args[1];
                content = `任务 ${link} 跳过了${floorToLink(task.tId, args[2])}，`;
                if (skipType === 'f') {
                    content += `因为当前楼层：${args[2]} 小于起始楼层：${task.start}`;
                } else if (skipType === 'u') {
                    content += `因为${uIdToLink(args[3])}在全局忽略名单或已经派过了`;
                }
                break;
            case 'wait_more_post':
                content = `任务 ${link} 转为[等待更多回复]状态`;
                break;
            case 'check_more_post':
                content = `任务 ${link} 检查有没有更多回复`;
                break;
        }
        return Local.log(content);
    }

    static async isWorking() {
        return Local.get('working') ?? false;
    }
}

function floorToLink(tid, floor) {
    return `<a href="${floorUrl(tid, floor)}" target="_blank">楼层：${floor}</a>`;
}

function uIdToLink(uId) {
    return `<a href="https://www.paipai.fm/u.php?uid=${uId}" target="_blank">用户ID：${uId}</a>`;
}

function cidToName(cid) {
    switch (cid) {
        case 'money':
            return '个派派币';
        case 'rvrc':
            return '个威望';
        case 'flower':
            return '朵鲜花';
    }
}