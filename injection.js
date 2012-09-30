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

var CPCreateCrosshair = function() {
    // add the margins so that the crosshair can reach everything
    document.body.style.padding = (screen.height / 2) + 'px '
        + (screen.width / 2) + 'px';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    // scroll so that visually nothing changes
    window.scrollTo(screen.height / 2, screen.width / 2);
    
    window.CPCrosshair = document.createElement('img');
    window.CPCrosshair.src = chrome.extension.getURL(
        'crosshairs/circle/circle-06.png');
    window.CPCrosshair.style.position = 'fixed';
    window.CPCrosshair.style.top = '50%';
    window.CPCrosshair.style.left = '50%'
    window.CPCrosshair.style.width = '64px';
    window.CPCrosshair.style.height = '64px';
    window.CPCrosshair.style.zIndex = 99999999;
    document.body.appendChild(window.CPCrosshair);
}

// sign up for IPC
chrome.extension.onConnect.addListener(function(port) {
    if (port.name != "ChromePadder")
        return;
    
    window.CPPort = port;
    port.onMessage.addListener(function(message) {
        // parse the init message
        if (message.tabId !== undefined) {
            // keep our tab ID for future reference
            window.CPPort.tabId = message.tabId;
            
            // impose the crosshair over the document
            if (window.CPCrosshair === undefined) {
                if (document.readyState === "loading")
                    // if not interactive yet, attach to the onLoad event
                    window.addEventListener('load', CPCreateCrosshair, false);
                else
                    // otherwise do it right away
                    CPCreateCrosshair();
            }
        }
        
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

