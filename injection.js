// ChromePadder content script

function CPScroll(deltaX, deltaY) {
    window.scrollTo(window.pageXOffset + deltaX, window.pageYOffset + deltaY);
}

function CPZoom(delta) {
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    // limit zoom to 10% so that we don't scale out too far away
    document.body.style.zoom = Math.max(
        (parseInt(document.body.style.zoom) + delta),
        10) + '%';
}

// sign up for IPC
chrome.extension.onConnect.addListener(function(port) {
    if (port.name != "ChromePadder")
        return;
    
    port.onMessage.addListener(function(message) {
        // execute scroll command
        if (message.deltaX !== undefined && message.deltaY !== undefined)
            CPScroll(message.deltaX, message.deltaY);
        
        // execute zoom command
        if (message.deltaZoom !== undefined) {
            if (message.deltaZoom == 0)
                document.body.style.zoom = '100%';
            else
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
