import { floorToThreadPageUrl, gbkArrayBufferToString, getFloors, getPIdVerify, sleep } from "./utils.js";
import { Local } from "./local.js";
import { utf8ToGBKBuffer } from "./iconv-lite-entry.js";


/**
 * 状态枚举，表示任务的不同阶段。
 * @readonly
 * @enum {number}
 */
export const STATE = {
    PAUSED: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    FAILED: 3,
    WAIT_MORE_POST: 4,
};


export const runningStates = [STATE.IN_PROGRESS, STATE.WAIT_MORE_POST];

/**
 * 根据状态返回描述文本
 * @param {STATE} state - 当前状态
 * @returns {string} 状态的描述
 */
export function getStateText(state) {
    switch (state) {
        case STATE.PAUSED: return "已暂停";
        case STATE.IN_PROGRESS: return "进行中";
        case STATE.COMPLETED: return "已完成";
        case STATE.FAILED: return "失败";
        case STATE.WAIT_MORE_POST: return "等待更多回复";
    }
}

/**
 * 评分任务
 * @class Task
 * 
 * @property {number} id 任务ID。
 * @property {number} tId 帖子ID。
 * @property {string} title 帖子标题。
 * @property {number} point 评分的数值。
 * @property {string} cid 评分的类型，威望为rvrc，派派币为money，鲜花为flower。
 * @property {string} content 评分内容。
 * @property {number} start 评分起始楼层。
 * @property {number} end 评分结束楼层。
 * @property {number} progress 当前评分进度（楼层）。
 * @property {STATE} state 任务状态。
 * @property {string|null} error 错误信息（如有）。
 * @property {Array<string|number>} skipUId 已评分用户ID列表。
 * @property {number} lastCheckTime [等待更多回复]状态下的最后检查时间
 * @property {number} lastFloor 最后处理的回复楼层数
 * 
 * @method toJson 返回任务的JSON表示。
 * @method static fromJson 从JSON对象创建Task实例。
 * @method toString 返回任务的JSON字符串表示。
 * @method toMsg 返回任务的可读消息文本。
 * 
 * @constructor
 * @param {number|string} tId 帖子ID。
 * @param {string} title 帖子标题。
 * @param {number} point 评分的数值。
 * @param {string} cid 评分的类型，威望为rvrc，派派币为money，鲜花为flower。
 * @param {string} content 评分内容。
 * @param {number} start 评分起始楼层。
 * @param {number} end 评分结束楼层。
 * @param {STATE} state 任务状态。
 * @param {boolean} ifmsg 是否发送评分通知。
 * @param {number} [progress] 当前评分进度（楼层），默认与start相同。
 * @param {string|null} [error=null] 错误信息（如有）。
 * @param {Array<string|number>} [skipUId=[]] 已评分用户ID列表。
 * @param {number} [lastCheckTime] [等待更多回复]状态下的最后检查时间
 * @param {number} [lastFloor] 最后处理的回复楼层数
 */
export class Task {

    constructor({ id, tId, title, point, cid, content, start, end,
        state, ifmsg, skipUId = [], progress, error = null, lastCheckTime, lastFloor }) {
        this.id = id ?? Date.now();
        this.tId = tId;
        this.title = title;
        this.point = point;
        this.cid = cid;
        this.content = content;
        this.start = start;
        this.end = end;
        this.ifmsg = ifmsg;
        this.skipUId = skipUId;
        this.progress = progress ?? 0;
        this.state = state;
        this.error = error;
        this.lastCheckTime = lastCheckTime;
        this.lastFloor = lastFloor ?? start;
    }

    toJson() {
        const data = {
            id: this.id,
            tId: this.tId,
            t: this.title,
            point: this.point,
            cid: this.cid,
            c: this.content,
            s: this.start,
            e: this.end,
            i: this.ifmsg,
            p: this.progress,
            state: this.state,
            u: this.skipUId,
            lt: this.lastCheckTime,
            lf: this.lastFloor,
        };
        if (this.error) {
            data.error = this.error;
        }
        return data;
    }

    static fromJson(json) {
        return new Task(
            {
                id: json.id,
                tId: json.tId,
                title: json.t,
                point: json.point,
                cid: json.cid,
                content: json.c,
                start: json.s,
                end: json.e,
                ifmsg: json.i,
                skipUId: json.u ?? [],
                state: json.state ?? 1,
                error: json.error ?? null,
                progress: json.p,
                lastCheckTime: json.lt,
                lastFloor: json.lf,
            }
        );
    }

    toString() {
        return JSON.stringify(this.toJson());
    }

    toMsg() {
        var text = `帖子id: ${this.tId}, 状态: ${STATE[this.state]}\n`;
        if (this.error) text += `错误: ${this.error}`;
        if (this.state === STATE.COMPLETED) text += `已完成评分从${this.start}到${this.end}`;
        if (this.state === STATE.IN_PROGRESS) text += `当前进度第${this.progress}楼`;
        return text;
    }

    async startRating() {
        if (this.isCompleted()) {
            this.state = STATE.COMPLETED; // 任务完成
            await this.save();
            await Local.taskLog(this, ['completed']);
            return;
        }
        const oldState = this.state;

        // 开始
        this.state = STATE.IN_PROGRESS;
        this.lastCheckTime = Date.now();

        // 楼层转为帖子带页数的URL
        const url = await floorToThreadPageUrl(this.tId, this.lastFloor);

        // 如果转化失败代表没有更多回复了
        if (!url) {
            // console.log('状态改变', this.state, oldState);
            this.state = STATE.WAIT_MORE_POST;
            if (oldState !== STATE.WAIT_MORE_POST) {
                await Local.taskLog(this, ['wait_more_post']);
            }
            return;
        }

        // console.log('楼层转页数url的结果', `${this.lastFloor} => ${url}`);

        const skip = [...(await Local.get(this.cid) || []), ...this.skipUId];
        const content = utf8ToGBKStr(this.content);

        // 读取、分析页面，返回回复的楼层和用户ID
        const floors = await getFloors(url);
        /// 一楼一楼派送
        for (let index = 0; index < floors.length; index++) {
            const { floor, uId, pId } = floors[index];
            this.lastFloor = floor + 1;
            if (floor < this.start) {
                Local.taskLog(this, ['skip', 'f', floor]);
                // 小于起始楼层跳过
                continue;
            }
            if (skip.includes(uId)) {
                Local.taskLog(this, ['skip', 'u', floor, uId]);
                // 已评分用户跳过
                continue;
            }
            if (this.isCompleted()) {
                break;
            }
            let res;
            while (true) {
                if (this.cid === 'flower') {
                    res = await sendFlower(this.tId, pId, this.point, content); // 送花
                } else {
                    res = await sendMoney(this.tId, pId, this.cid, this.ifmsg, this.point, content); // 评分
                }
                if (res.includes('success	')) {
                    this.progress += 1;
                    this.skipUId.push(uId);
                    await Local.taskLog(this, ['success', floor, pId, uId]);
                    await this.save();
                    await sleep(200); // 每次等待
                    break;
                }
                await sleep(200); // 每次等待
            }
        }
        if (this.isCompleted()) {
            this.state = STATE.COMPLETED;
            await Local.taskLog(this, ['completed']);
        }
        await this.save();
    }

    /**
     * 
     * @returns {Promise<void>}
     */
    save() {
        return Local.saveTask(this);
    }

    isCompleted() {
        return this.end > 0 && this.progress >= this.end;
    }
}


/**
 * 送鲜花
 * @param {number} tId 
 * @param {number|string} pId 
 * @param {number} point
 * @param {string} content 
 * @returns {Promise<string>}
 */
export async function sendFlower(tId, pId, point, content = '') {
    console.log('sendFlower', { tId, pid: pId, point });

    const params = new URLSearchParams();
    params.append('tid', tId);
    params.append('pid', pId);
    params.append('step', 2);
    params.append('nums', point);
    params.append('gdcode', '');
    params.append('a', 'flower');
    const res = await fetch('https://www.paipai.fm/hack/feggpro/require/ajax.php?action=mmcegg', {
        method: 'POST',
        body: `${params.toString()}&messages=${content}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).then(res => res.arrayBuffer()).then(gbkArrayBufferToString);
    // console.log('送花结果', res);
    return res;
}

/**
 * 
 * @param {number} tId 
 * @param {number|string} pId 
 * @param {string} cid 
 * @param {boolean} ifmsg 
 * @param {number} point 
 * @param {string} [content]
 * @returns {Promise<string>}
 */
export async function sendMoney(tId, pId, cid, ifmsg, point, content = '') {
    // 获取pid的verify
    const pidVerify = await getPIdVerify(tId, pId);

    const params = new URLSearchParams();
    params.append('verify', pidVerify);
    params.append('tid', tId);
    params.append('parentselid', pId);
    params.append('step', 1);
    params.append('cid[]', cid); // 评分类型，威望为rvrc，派派币为money
    params.append('selid[]', pId);
    params.append('addpoint[]', point);
    params.append('ifmsg', ifmsg ? 1 : 0); // 消息通知，0不通知，1通知
    const res = await fetch(`https://www.paipai.fm/operate.php?action=showping&ajax=1`, {
        method: 'POST',
        body: `${params.toString()}&atc_content=${content}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
        .then(response => response.arrayBuffer())
        .then(gbkArrayBufferToString);
    // console.log('评分响应', res);
    return res;
}


function utf8ToGBKStr(text) {
    const buf = utf8ToGBKBuffer(text);
    return Array.from(buf, b => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
}