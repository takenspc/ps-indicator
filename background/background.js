'use strict';

/*
 *
 */
class DataStore {
    constructor(data) {
        this.url2entry = new Map();

        for (const specEntry of data) {
            if (specEntry.url === '') {
                continue;
            }

            this.url2entry.set(specEntry.url, specEntry);
        }
    }

    query(url) {
        return this.url2entry.get(url);
    }
}



/*
 *
 */
class TabHandler {
    constructor(store) {
        this.store = store;
        this.activeTabId = null;
        chrome.tabs.onActivated.addListener(this.onActivated.bind(this));
        chrome.tabs.onUpdated.addListener(this.onUpdated.bind(this));
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    }

    onActivated(activeInfo, windowId) {
        const tabId = activeInfo.tabId;
        chrome.tabs.get(tabId, (tab) => {
            this.activeTabId = tabId;

            const url = tab.url;
            this.updateURL(url);
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
        this.updateURL(url);
    }

    normalizeURL(url) {
        const urlObject = new URL(url);
        urlObject.hash = '';
        return urlObject.href;
    }

    updateURL(url) {
        const normalizedURL = this.normalizeURL(url);
        this.updateBrowserAction(normalizedURL);
    }

    updateBrowserAction(url) {
        const data = this.query(url);
        chrome.browserAction.setBadgeText({
            text: (data ? '' + data.fragments.length : ''),
            tabId: this.activeTabId,
        });
    }

    query(url) {
        return this.store.query(url);
    }

    onMessage(message) {
        // console.log(message);
        const type = message.type;
        if (type === 'query') {
            const url = message.url;
            const normalizedURL = this.normalizeURL(url);

            // console.log('recieving query', url);

            const data = this.query(normalizedURL);

            // console.log('sending response', url);
            chrome.runtime.sendMessage({
                type: 'response',
                url: url,
                data: data,
            });
        }
    }

}

(function() {
    function readJSON(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'json';

            xhr.onload = (data) => {
                resolve(xhr.response);
            };

            xhr.onerror = (err) => {
                reject(err);
            };
            
            xhr.open('GET', url);
            xhr.send();
        });
    }

    const jsonURL = chrome.runtime.getURL('data/data.json');
    readJSON(jsonURL).then((data) => {
        const dataStore = new DataStore(data);
        new TabHandler(dataStore);
    }).catch((err) => {
        console.log(err);
    });
})();
