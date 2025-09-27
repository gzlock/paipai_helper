import { Local } from "../local.js";

const money = 'money'; // 派派币
const rvrc = 'rvrc'; // 威望
const flower = 'flower'; // 威望

const ui = [];
document.addEventListener('DOMContentLoaded', async () => {
    const $addMoneyUId = document.getElementById('add_money_uid');
    const $addRvrcUId = document.getElementById('add_rvrc_uid');
    const $addFlowerUId = document.getElementById('add_flower_uid');

    // 派派币列表
    const $skipMoneyList = document.getElementById('skip_money_list');

    // 威望列表
    const $skipRvrcList = document.getElementById('skip_rvrc_list');

    // 鲜花列表
    const $skipFlowerList = document.getElementById('skip_flower_list');

    ui.push(...[
        [money, $skipMoneyList],
        [rvrc, $skipRvrcList],
        [flower, $skipFlowerList],
    ])
    updateUI(ui);

    bindAddButton(money, $addMoneyUId, '派派币');
    bindAddButton(rvrc, $addRvrcUId, '威望');
    bindAddButton(flower, $addFlowerUId, '鲜花');

    bindDeleteButton(money, $skipMoneyList);
    bindDeleteButton(rvrc, $skipRvrcList);
    bindDeleteButton(flower, $skipFlowerList);
});


function bindAddButton(key, $btn, keyword) {
    $btn.addEventListener('click', async () => {
        const val = prompt(`填写要跳过【${keyword}】的用户ID`);
        const uid = parseInt(val);
        if (isVaildId(uid)) {
            await Local.addListItem(key, uid);
            updateUI(ui);
        } else {
            alert(`${val} 不是有效的用户ID，无法添加`);
        }
    });
}

function bindDeleteButton(key, $list) {
    $list.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const uid = parseInt(e.target.getAttribute('uid'));
            if (confirm(`确定删除该用户ID ${uid}？`)) {
                await Local.removeListItem(key, uid);
                updateUI(ui);
            }
        }
    });
}

/**
 * 更新UI列表
 */
async function updateUI(params) {
    async function addItem(key, $list) {
        $list.replaceChildren();
        const list = await Local.get(key) || [];
        if (list.length == 0) {
            $list.textContent = '暂无数据';
            return;
        }
        list.forEach(uid => {
            const link = document.createElement('a');
            link.href = `https://www.paipai.fm/u.php?uid=${uid}`;
            link.textContent = uid.toString();
            link.target = "_blank";
            link.title = '点击打开用户资料页面';
            const span = document.createElement('span');
            span.appendChild(link);
            const btn = document.createElement('button');
            btn.textContent = 'X';
            btn.className = 'delete-btn';
            btn.setAttribute('uid', uid);
            span.appendChild(btn);
            $list.appendChild(span);
        });
    }

    for (let i in params) {
        addItem(params[i][0], params[i][1]);
    }
}


function isVaildId(id) {
    const val = parseInt(id);
    return Number.isInteger(val) && val > 0;
}