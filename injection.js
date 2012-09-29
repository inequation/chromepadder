// ChromePadder content script

function CPScroll(deltaX, deltaY) {
    console.log('SCROLL');
    window.scrollTo(window.pageXOffset + deltaX, window.pageYOffset + deltaY);
}

function CPZoom(delta) {
    console.log('ZOOM');
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    // limit zoom to 10% so that we don't scale out too far away
    document.body.style.zoom = Math.max(
        (parseInt(document.body.style.zoom) + delta),
        10) + '%';
}

function CPResetZoom() {
    document.body.style.zoom = '100%';
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
        if (message.zoomReset)
            CPResetZoom();
        else if (message.deltaZoom !== undefined && message.deltaZoom != 0)
            CPZoom(message.deltaZoom);
    });
});
