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

const Entry = Vue.extend({
    data: () => {
        return {
            entry: null,
            onMouse: false,
            onFocus: false,
        };
    },
    
    props: ['entry'],

    methods: {
        open: function(event) {
            // `this` is vn
            if (event.type === 'mouseenter') {
                this.onMouse = true;
            } else {
                this.onFocus = true;
            }

            const entry = this.$els.entry;
            entry.classList.remove('closed');
        },

        close: function(event) {
            // `this` is vn
            if (event.type === 'mouseleave') {
                this.onMouse = false;
            } else {
                this.onFocus = false;
            }

            if (!this.onMouse && !this.onFocus) {
                const entry = this.$els.entry;
                entry.classList.add('closed');
            }
        }
    },

    template: `
        <li class="entry closed" v-el:entry
            v-on:mouseenter="open"
            v-on:mouseleave="close"
            v-on:focusin="open"
            v-on:focusout="close">
        <button class="entry-button closed">
            <img class="icon" src="icons/{{ entry.status.status }}.svg" alt="{{ entry.status.originalStatus }}"/>
            <img class="behindFlag" src="icons/behindflag.svg" alt="behind a flag" v-if="entry.status.behindFlag"/>
            <img class="prefixed" src="icons/prefixed.svg" alt="prefixed" v-if="entry.status.prefixed"/>
        </button>
        <div class="entry-details closed">
        <div class="title">{{ entry.title }}</div>
        <div>
        <span>{{ entry.status.originalStatus }}</span>
        <span v-if="entry.status.channel">starting {{ entry.status.channel }}</span>
        <span v-if="entry.status.behindFlag">(behind a flag)</span>
        <span v-if="entry.status.prefixed">(prefixed)</span>
        </div>
        <div class="link"><a href="{{ entry.statusURL }}" target="_blank">more details</a></div>
        </div>
        </li>
    `,
});

const Engine = Vue.extend({
    data: () => {
        return {
            engine: null,
            entries: [],
        };
    },

    props: ['engine', 'entries'],

    components: {
        'ps-entry': Entry,
    },

    template: `
        <h3 class="engine-name"><img class="icon" src="icons/{{ engine }}.png" alt="{{ engine}}"></h3>
        <ul class="entry-list" v-for="entry in $data.entries">
        <ps-entry :entry="entry"></ps-entry>
        </ul>
    `,
})

const Fragment = Vue.extend({
    data: () => {
        return {
            url: null,
            fragment: null,
            engines: [],
            knownEngines: ['chromium', 'edge'],
        };
    },

    props: ['url', 'fragment', 'engines'],

    components: {
        'ps-engine': Engine,
    },

    methods: {
        open: function() {
            // `this` is vn
            if (this.url && this.fragment) {
                chrome.tabs.update(null, {
                    url: this.url + this.fragment
                });
            } 
        },
    },

    template: `
        <h2 class="fragment-name"><button v-on:click="open">{{ $data.fragment || '#' }}</button></h2>
        <div v-for="engine in knownEngines">
        <div class="engine" v-if="$data.engines[engine]">
        <ps-engine :engine="engine" :entries="$data.engines[engine]"></ps-engine>
        </div>
        </div>
    `,
});


const Indicator = new Vue({
    el: '#indicator',
    data: {
        url: null,
        fragments: [],
    },

    created: function() {
        // `this` is vn
        DataStore.getData().then((specEntry) => {
            this.url = specEntry.url;
            this.fragments = specEntry.fragments;
        }).catch((err) => {
            console.error(err);
        });
    },

    components: {
        'ps-fragment': Fragment
    }
});
