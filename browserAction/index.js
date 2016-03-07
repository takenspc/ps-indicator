'use strict';
function getURL() {
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({
            active: true,
            currentWindow: true,
        }, function (tabs) {
            const tab = tabs[0];
            const url = tab.url;
            resolve(url);
        });
    });
}

function queryData(url) {
    return new Promise(function (resolve, reject) {
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

(function () {
    getURL().then((url) => {
        return queryData(url);
    }).then((specEntry) => {
        new Vue({
            el: '#indicator',
            data: {
                specEntry: specEntry,
                engines: ['chromium', 'edge'],
            },
        });
    }).catch((err) => {
        alert(err);
    });

})();
