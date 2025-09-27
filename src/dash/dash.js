import { Local } from '../local.js';
import { getStateText, runningStates, STATE } from '../task.js';
import { Task } from '../task.js';

document.addEventListener('DOMContentLoaded', async () => {
    const $filters = document.querySelector('#task-filters');
    const $tasks = document.querySelector('.tasks');

    [STATE.IN_PROGRESS, STATE.COMPLETED, STATE.PAUSED, STATE.WAIT_MORE_POST, STATE.FAILED].forEach((state, index) => {
        const $span = document.createElement('span');
        const $label = document.createElement('label');
        $label.innerText = getStateText(state);
        const $checkbox = document.createElement('input');
        $checkbox.type = 'checkbox';
        $checkbox.value = state;
        $checkbox.addEventListener('change', async () => {
            renderTasks($tasks, filtersToValues($filters));
        });
        $span.appendChild($label);
        $span.appendChild($checkbox);
        $filters.appendChild($span);
    });

    setInterval(() => {
        renderTasks($tasks, filtersToValues($filters));
    }, 500);

    renderTasks($tasks, filtersToValues($filters));

    $tasks.addEventListener('click', async (e) => {
        if (e.target.tagName.toLowerCase() === 'button') {
            const id = parseInt(e.target.getAttribute('task-id'));
            const action = e.target.getAttribute('task-action');
            const task = await Local.getTask(id);
            if (task) {
                if (action === 'delete') {
                    if (confirm('确定删除该任务吗？')) {
                        await Local.removeTask(id);
                    }
                } else {
                    if (action === 'pause') {
                        task.state = STATE.PAUSED;
                        Local.taskLog(task, ['pause']);
                    } else if (action === 'continue') {
                        task.state = STATE.IN_PROGRESS;
                        Local.taskLog(task, ['continue']);
                    }
                    await task.save();
                    // console.log(task.id, task.state);
                }
                renderTasks($tasks, filtersToValues($filters));
            }
        }
    });
});

function filtersToValues($filters) {
    return Array.from($filters.querySelectorAll('input[type=checkbox]')).filter((cb) => cb.checked).map((cb) => parseInt(cb.value));
}

/**
 * 渲染Task卡片
 * @param {HTMLElement} $tasks
 * @param {Array<number>} filters
 */
async function renderTasks($tasks, filters) {
    /** @type {Array<Task>} */
    const tasks = Object.values(await Local.getTasks());
    $tasks.innerHTML = '';
    tasks.forEach((task) => {
        if (!filters.includes(-1) && filters.indexOf(task.state) == -1) {
            return;
        }
        const $task = document.createElement('div');
        $task.setAttribute('task-id', task.id);
        $task.setAttribute('title', `任务ID:${task.id}`);
        $tasks.appendChild($task);

        const end = task.end == 0 ? '无限楼' : task.end;

        $task.innerHTML = `<div><span>帖子</span><span><a href="https://www.paipai.fm/r${task.tId}" target="_blank" title="${task.title}">${task.title}</span></div>`;
        $task.innerHTML += `<div><span>状态</span><span>${getStateText(task.state)}</span></div>`;
        $task.innerHTML += `<div><span>评分</span><span>${task.point} ${task.cid}</span></div>`;
        $task.innerHTML += `<div><span>内容</span><span>${task.content}</span></div>`;
        $task.innerHTML += `<div><span>进度</span><span>${task.progress} / ${end}</span></div>`;
        // $task.innerHTML += `<div><span>已跳过用户数</span><span>${task.skipUId.length}</span></div>`;

        const $actions = document.createElement('div');
        $actions.className = 'actions';
        $actions.innerHTML = '<span>操作</span>';
        $task.appendChild($actions);
        const $actionsSpan = document.createElement('span');
        $actions.appendChild($actionsSpan);
        // console.log('任务状态', task.id, task.state);

        if (runningStates.includes(task.state)) {
            const $btn = document.createElement('button');
            $btn.className = 'pause-btn';
            $btn.innerText = '暂停';
            $btn.setAttribute('task-id', task.id);
            $btn.setAttribute('task-action', 'pause');
            $actionsSpan.appendChild($btn);
        } else if (task.state == STATE.PAUSED) {
            const $btn = document.createElement('button');
            $btn.className = 'continue-btn';
            $btn.innerText = '继续执行';
            $btn.setAttribute('task-id', task.id);
            $btn.setAttribute('task-action', 'continue');
            $actionsSpan.appendChild($btn);
        }
        const $btn = document.createElement('button');
        $btn.className = 'delete-btn';
        $btn.innerText = '删除';
        $btn.setAttribute('task-id', task.id);
        $btn.setAttribute('task-action', 'delete');
        $actionsSpan.appendChild($btn);
    });
}