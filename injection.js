// ChromePadder content script

function CPScroll(deltaX, deltaY) {
    window.scrollTo(window.pageXOffset + deltaX, window.pageYOffset + deltaY);
}

function CPZoom(delta) {
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    // limit zoom to 10% so that we don't scale out too much away
    document.body.style.zoom = Math.max(
        (parseInt(document.body.style.zoom) + delta),
        10) + '%';
}

// retrieve current tab ID so that we can intercept the right IPCs
chrome.tabs.getCurrent(function(tab) {
    window.tabId = tab.id;
});

// sign up for IPC
var CPPort = chrome.extension.connect();
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    // see if this message is meant for us
    if (message.targetTabId != window.tabId)
        return;
    
    // dispatch scroll command
    if (message.deltaX !== undefined && message.deltaY !== undefined
        && message.deltaX != 0 && message.deltaY != 0)
        CPScroll(message.deltaX, message.deltaY);
    
    // dispatch zoom command
    if (message.deltaZoom !== undefined && message.deltaZoom != 0)
        CPZoom(message.deltaZoom);
});
