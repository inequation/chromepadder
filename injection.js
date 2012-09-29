// ChromePadder content script

function CPScroll(deltaX, deltaY) {
    window.scrollBy(deltaX, deltaY);
}

function CPZoom(delta) {
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    // limit zoom to 10% so that we don't scale out too far away
    document.body.style.zoom = Math.max(
        (parseInt(document.body.style.zoom) + delta),
        10) + '%';
    document.body.style.width = document.body.style.zoom;
}

// sign up for IPC
chrome.extension.onConnect.addListener(function(port) {
    if (port.name != "ChromePadder")
        return;
    
    window.CPPort = port;
    port.onMessage.addListener(function(message) {
        // parse the init message
        if (message.tabId !== undefined)
            window.CPPort.tabId = message.tabId;
        
        // execute scroll command
        if (message.deltaX !== undefined && message.deltaY !== undefined)
            CPScroll(message.deltaX, message.deltaY);
        
        // execute zoom command
        if (message.deltaZoom !== undefined) {
            if (message.deltaZoom == 0) {
                document.body.style.zoom = '100%';
                document.body.style.width = document.body.style.zoom;
            } else
                CPZoom(message.deltaZoom);
        }

        // execute history navigation command
        if (message.historyGo !== undefined)
        {
            if (message.historyGo == 0) {
                // if the page is still loading, stop it
                // if it's loaded, refresh
                if (document.readyState !== "complete")
                    window.stop();
                else
                    document.location.reload(true);
            } else
                history.go(message.historyGo);
        }
    });
});

// notify the background page that we're about to unload so that the port may be
// disconnected
window.addEventListener('unload', (function() {
    window.CPPort.postMessage({tabId: window.CPPort.tabId});
}), false);
