'use strict';

const BLANK_URL = '';

/*
 *
 */
class DataStore {
    constructor(data) {
        this.ONE_DAY = 24 * 3600 * 1000;
        this.KEY = 'PLATEOSTATUS';
        this.URL = 'https://plateostatus.herokuapp.com/data/data.json';
        this.FALLBACK_URL = chrome.runtime.getURL('data/data.json');

        this.datetime = 0;
        this.url2entry = new Map();

        chrome.alarms.create({ delayInMinutes: 1, periodInMinutes: 60 });
        chrome.alarms.onAlarm.addListener(this.downloadIfNeeded.bind(this));
    }


    /**
     * @returns {Promise<any>}
     */
    init() {
        return this.getData().then((data) => {
            return this.updateData(data);
        });
    }


    /**
     * @private
     * @param {any} data
     * @returns {void}
     */
    updateData(data) {
        this.datetime = data.datetime;

        this.url2entry = new Map();
        for (const url of Object.keys(data.urls)) {
            if (url === BLANK_URL) {
                continue;
            }

            this.url2entry.set(url, data.urls[url]);
        }
    }


    /**
     * @private
     * @returns {Promise<any>}
     */
    getData() {
        return this.getStorageData().then((data) => {
            return data;
        }).catch((err) => {
            console.error(err);
            return this.getJSONData(this.FALLBACK_URL);
        });
    }

    /**
     * @private
     * @returns {Promise<any>}
     */
    getStorageData() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (data) => {
                if (data.datetime && data.urls) {
                    resolve(data);
                    return;
                }

                reject(new Error('Recieve unexpected data from chrome.storage.local'));
            });
        });
    }

    /**
     * @private
     * @returns {Promise<any>}
     */
    setStorageData(data) {
        return new Promise((resolve, rejct) => {
            chrome.storage.local.set(data, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * @private
     * @returns {Promise<any>}
     */
    getJSONData(url) {
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


    /**
     * @private
     * @returns {void}
     */
    downloadIfNeeded() {
        if (Date.now() - this.datetime > this.ONE_DAY) {
            this.getJSONData(this.URL).then((data) => {
                this.updateData(data);
                this.setStorageData(data);
            }).catch((err) => {
                throw err;
            });
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
        chrome.tabs.getCurrent(this.updateTabInfo.bind(this));
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
        chrome.tabs.get(activeInfo.tabId, this.updateTabInfo.bind(this));
    }

    /**
     * @param {any} tab
     * @returns {void}
     */
    updateTabInfo(tab) {
        if (!tab) {
            this.updateBrowserAction(BLANK_URL);
            return;
        }

        this.activeTabId = tab.id;
        const url = tab.url;
        this.updateURL(url);
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
    const dataStore = new DataStore();
    dataStore.init().then(() => {
        new TabHandler(dataStore);
    }).catch((err) => {
        throw err;
    });
})();
