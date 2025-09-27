import { Task } from '../task.js';


test('task test', () => {
    const task = new Task({ tId: 123, title: 'Test Task', point: 5, cid: 'rvrc', content: 'Good job', start: 1, end: 10, state: 0, ifmsg: true });
    expect(task.tId).toBe(123);
    expect(task.title).toBe('Test Task');
})