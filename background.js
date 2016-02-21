'use strict';

/*
 *
 */
class TabHandler {
    constructor() {
        this.activeTabId = null;
        this.activeTabURL = null;
        chrome.tabs.onActivated.addListener(this.onActivated.bind(this));
        chrome.tabs.onUpdated.addListener(this.onUpdated.bind(this));
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    }

    onActivated(activeInfo, windowId) {
        const tabId = activeInfo.tabId;
        chrome.tabs.get(tabId, (tab) => {
            this.activeTabId = tabId;

            const url = tab.url;
            this.activeTabURL = url;
            console.log('activated', tabId, url);
            this.updateBrowserAction.bind(this)(tabId, url);
        });
    }

    onUpdated(tabId, changeInfo) {
        if (this.activeTabId !== tabId) {
            return;
        }

        if (!changeInfo.url) {
            return;
        }

        const url = changeInfo.url;
        this.activeTabURL = url;
        console.log('updated', tabId, url);
        this.updateBrowserAction.bind(this)(tabId, url);
    }

    updateBrowserAction(tabId, url) {
        const data = this.query(url);
        chrome.browserAction.setBadgeText({
            text: '' + data.length,
            tabId: tabId,
        });
    }

    query(url) {
        const data = [
            { id: 0, title: "asm.js", url: "http://asmjs.org/spec/latest/", indicators: "Firefox" },
            { id: 1, title: "Background Sync API", url: "https://wicg.github.io/BackgroundSync/spec/", indicators: "Chrome" },
        ];
        return data;
    }

    onMessage(message) {
        console.log(message);
        const type = message.type;
        if (type === 'query') {
            const url = message.url;
            console.log('recieving query', url);

            const data = this.query(url);

            console.log('sending response', url);
            chrome.runtime.sendMessage({
                type: 'response',
                url: url,
                data: data,
            });
        }
    }

}

const handler = new TabHandler();
