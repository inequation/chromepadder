// ChromePadder content script

// create the ChromePadder interface object
var CPI = {};

// function for simulating input events
CPI.simulatedEvent = function(el, options) {
    var event = el.ownerDocument.createEvent('MouseEvents'),
        options = options || {};

    // set default options to the right of the || operator
    var opts = {
        type: options.type                      || 'click',
        canBubble:options.canBubble             || true,
        cancelable:options.cancelable           || true,
        view:options.view                       || el.ownerDocument.defaultView, 
        detail:options.detail                   || 1,
        screenX:options.screenX                 || 0, // screen coords
        screenY:options.screenY                 || 0,
        clientX:options.clientX                 || 0, // client coords
        clientY:options.clientY                 || 0,
        ctrlKey:options.ctrlKey                 || false,
        altKey:options.altKey                   || false,
        shiftKey:options.shiftKey               || false,
        metaKey:options.metaKey                 || false,
        button:options.button                   || 0, // 0 = left, 1 = middle, 2 = right
        relatedTarget:options.relatedTarget     || null,
    }

    // pass in the options
    event.initMouseEvent(
        opts.type,
        opts.canBubble,
        opts.cancelable,
        opts.view, 
        opts.detail,
        opts.screenX,
        opts.screenY,
        opts.clientX,
        opts.clientY,
        opts.ctrlKey,
        opts.altKey,
        opts.shiftKey,
        opts.metaKey,
        opts.button,
        opts.relatedTarget
    );

    //Fire the event
    el.dispatchEvent(event);
}

CPI.getCrosshairCoords = function() {
    var el = CPI.crosshair;
    var x = 32;
    var y = 32;
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
        x += el.offsetLeft - el.scrollLeft;
        y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    // if the crosshair is in centre-float mode, add in the scroll offset
    if (CPI.crosshair.style.position == 'fixed') {
        x += window.pageXOfsset;
        y += window.pageYOfsset;
    }
    return {top: y, left: x};
}

CPI.scroll = function(deltaX, deltaY) {
    window.scrollBy(deltaX, deltaY);
    
    // handle mouseOver/mouseOut events
    var coord = getCrosshairCoords();
    console.log('COORD ' + coord.left + ', ' + coord.top);
    var newTarget = document.elementFromPoint(coord.left, coord.top);
    if (newTarget !== undefined && newTarget != CPI.target) {
        if (target !== undefined) {
            simulatedEvent(target, {type: 'mouseOut',
                screenX: coord.left, screenY: coord.top});
        }
        target = newTarget;
        simulatedEvent(target, {type: 'mouseOver',
            screenX: coord.left, screenY: coord.top});
    }
}

CPI.zoom = function(delta) {
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    var newZoom = parseInt(document.body.style.zoom) + delta;
    // limit zoom to 10% so that we don't scale out too far away
    document.body.style.zoom = Math.max(newZoom, 10) + '%';
    document.body.style.width = document.body.style.zoom;
    
}

CPI.createCrosshair = function() {
    // add the margins so that the crosshair can reach everything
    document.body.style.padding = (screen.height / 2) + 'px '
        + (screen.width / 2) + 'px';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    // scroll so that visually nothing changes
    window.scrollTo(screen.height / 2, screen.width / 2);
    
    // this serves a dummy, logical crosshair centre point, while the actual
    // reticle image is imposed over it
    CPI.crosshair = document.createElement('div');
    CPI.crosshair.style.position = 'fixed';
    CPI.crosshair.style.top = '50%';
    CPI.crosshair.style.left = '50%';
    CPI.crosshair.style.width = '1px';
    CPI.crosshair.style.height = '1px';
    CPI.crosshair.style.zIndex = 99999998;

    // the actual reticle image
    CPI.crosshair.reticle = document.createElement('img');
    CPI.crosshair.reticle.src = chrome.extension.getURL(
        'crosshairs/circle/circle-06.png');
    // locate the image so that its centre covers the div
    CPI.crosshair.reticle.style.top = '-32px';
    CPI.crosshair.reticle.style.left = '-32px';
    CPI.crosshair.reticle.style.width = '64px';
    CPI.crosshair.reticle.style.height = '64px';
    CPI.crosshair.reticle.style.zIndex = 99999999;
    
    CPI.crosshair.appendChild(CPI.crosshair.reticle);
    document.body.appendChild(CPI.crosshair);
}

// sign up for IPC
chrome.extension.onConnect.addListener(function(port) {
    if (port.name != "ChromePadder")
        return;
    
    CPI.port = port;
    port.onMessage.addListener(function(message) {
        // parse the init message
        if (message.tabId !== undefined) {
            // keep our tab ID for future reference
            CPI.tabId = message.tabId;
            
            // impose the crosshair over the document
            if (CPI.crosshair === undefined) {
                if (document.readyState === "loading")
                    // if not interactive yet, attach to the onLoad event
                    window.addEventListener('load', CPI.createCrosshair, false);
                else
                    // otherwise do it right away
                    CPI.createCrosshair();
            }
        }
        
        // execute scroll command
        if (message.deltaX !== undefined && message.deltaY !== undefined)
            CPI.scroll(message.deltaX, message.deltaY);
        
        // execute zoom command
        if (message.deltaZoom !== undefined) {
            if (message.deltaZoom == 0) {
                document.body.style.zoom = '100%';
                document.body.style.width = document.body.style.zoom;
            } else
                CPI.zoom(message.deltaZoom);
        }

        // execute history navigation command
        if (message.historyGo !== undefined) {
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
        
        // execute input actions
        if (message.action !== undefined) {
            if (CPI.target !== undefined) {
                var coord = CPI.getCrosshairCoords();
                CPI.simulatedEvenT(CPI.target, {type: message.action,
                    screenX: coord.left, screenY: coord.top});
            }
        }
    });
});

// notify the background page that we're about to unload so that the port may be
// disconnected
window.addEventListener('unload', (function() {
    CPI.port.postMessage({tabId: CPI.tabId});
}), false);
