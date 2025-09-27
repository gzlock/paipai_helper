export class TaskWorer {
    constructor() {
        this.worker = new Worker(chrome.runtime.getURL('taskWorker.js'));
     }
}