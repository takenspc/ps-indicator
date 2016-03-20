'use strict';

class DataStore {
    static getData() {
        return this.getURL().then((url) => {
            return this.queryData(url);
        })
    }

    /**
     * @private
     * @returns {Promise<string>}
     */
    static getURL() {
        return new Promise(function(resolve, reject) {
            chrome.tabs.query({
                active: true,
                currentWindow: true,
            }, function(tabs) {
                const tab = tabs[0];
                const url = tab.url;
                resolve(url);
            });
        });
    }

    /**
     * @private
     * @param {string} url
     */
    static queryData(url) {
        return new Promise(function(resolve, reject) {
            chrome.runtime.onMessage.addListener((message) => {
                const type = message.type;
                if (type === 'response' && message.url === url) {
                    const data = message.data;
                    resolve(data);
                }
            });

            chrome.runtime.sendMessage({
                type: 'query',
                url: url,
            });
        });
    }
}


const Indicator = new Vue({
    el: '#indicator',
    data: {
        url: null,
        fragments: [],
        engines: ['chromium', 'edge'],
    },

    created: function() {
        DataStore.getData().then((specEntry) => {
            console.log(this);
            this.url = specEntry.url;
            this.fragments = specEntry.fragments;
        }).catch((err) => {
            console.error(err);
        });
    },
});
