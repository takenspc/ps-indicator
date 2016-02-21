import React from 'react';
import ReactDOM from 'react-dom';

const PSEntry = React.createClass({
    render: function () {
        return (
            <div className="Entry">
                <div class="header">
                    <h2>{this.props.title}</h2>
                    <div>#fragment</div>
                </div>
                <div>{this.props.url}</div>
                <div>{this.props.indicators}</div>
            </div>
        );
    }
});

function getURL() {
    return new Promise(function (resolve, reject) {
        console.log('start');
        chrome.tabs.query({
            active: true,
            currentWindow: true,
        }, function(tabs) {
            const tab = tabs[0];
            const url = tab.url;
            console.log('got', url);
            resolve(url);
        });
    });
}

function queryData(url) {
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


const PSEntryList = React.createClass({
    getInitialState: function() {
        return {data: []};
    },
    componentDidMount: function() {
        getURL().then(queryData).then(function(data) {
            this.setState({data:data});
        }.bind(this));
    },
    render: function() {
        const entries = this.state.data.map(function (entry) {
            return (
                <PSEntry key={entry.id} title={entry.title} url={entry.url} indicators={entry.indicators} />
            );
        });
        
        
        return (
            <div className="EntryList">
                {entries}
            </div>
        );
    }
});


const PSPopup = React.createClass({
    render: function() {
        return (
            <div>
                <h1>Platform Status</h1>
                <PSEntryList />
            </div>
        )
    }
});


ReactDOM.render(
    <PSPopup />,
    document.getElementById('status')
);
