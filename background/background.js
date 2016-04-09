'use strict';

/*
 *
 */
class DataStore {
    constructor(data) {
        this.url2entry = new Map();

        for (const url of Object.keys(data.urls)) {
            if (url === '') {
                continue;
            }

            this.url2entry.set(url, data.urls[url]);
        }
    }

    /**
     * @param {string} url
     * @returns {any}
     */
    query(url) {
        return this.url2entry.get(url);
    }
}


/*
 *
 */
class TabHandler {
    /**
     * @param {DataStore} store
     */
    constructor(store) {
        this.store = store;
        this.activeTabId = null;
        chrome.tabs.onActivated.addListener(this.onActivated.bind(this));
        chrome.tabs.onUpdated.addListener(this.onUpdated.bind(this));
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    }

    /**
     * @param {any} activeInfo
     * @param {number} windowId
     * @returns {void}
     */
    onActivated(activeInfo, windowId) {
        const tabId = activeInfo.tabId;
        chrome.tabs.get(tabId, (tab) => {
            this.activeTabId = tabId;

            const url = tab.url;
            this.updateURL(url);
        });
    }

    /**
     * @param {number} tabId
     * @param {any} changeId
     * @returns {void}
     */
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

    /**
     * @param {string} url
     * @returns {string}
     */
    normalizeURL(url) {
        const urlObject = new URL(url);
        urlObject.hash = '';
        return urlObject.href;
    }

    /**
     * @param {string} url
     * @returns {void}
     */
    updateURL(url) {
        const normalizedURL = this.normalizeURL(url);
        this.updateBrowserAction(normalizedURL);
    }

    /**
     * @param {string} url
     * @returns {void}
     */
    updateBrowserAction(url) {
        const data = this.query(url);

        if (data && Object.keys(data.fragments).length > 0) {
            chrome.browserAction.enable();
        } else {
            chrome.browserAction.disable();
        }

        chrome.browserAction.setBadgeText({
            text: (data ? '' +  Object.keys(data.fragments).length : ''),
            tabId: this.activeTabId,
        });
    }

    /**
     * @param {string} url
     * @returns {any}
     */
    query(url) {
        return this.store.query(url);
    }

    /**
     * @param {any} message
     * @returns {void}
     */
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
        console.log(err.stack);
    });
})();
