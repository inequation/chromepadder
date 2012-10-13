// ChromePadder content script

// create the ChromePadder interface object
var CPI = {};

// configuration
CPI.crosshairCentered = true;
CPI.reticlePath = chrome.extension.getURL('crosshairs/circle/circle-06.png');

// function for simulating input events
CPI.simulatedEvent = function(isMouseEvent, el, options) {
    var event = el.ownerDocument.createEvent(isMouseEvent
            ? 'MouseEvents' : 'KeyboardEvent'),
        options = options || {};

    if (isMouseEvent) {
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
            button:options.button                   || 0, // 0=LMB, 1=MMB, 2=RMB
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
    } else {
        var opts = {
            type: options.type                      || 'keypress',
            bubbles:options.bubbles                 || true,
            cancelable:options.cancelable           || true,
            ctrlKeyArg:options.ctrlKeyArg           || false,
            altKeyArg:options.altKeyArg             || false,
            shiftKeyArg:options.shiftKeyArg         || false,
            metaKeyArg:options.metaKeyArg           || false,
            keyCodeArg:options.keyCodeArg           || 0,
            charCodeArg:options.charCodeArg         || 0
        }
        
        // pass in the options
        event.initKeyboardEvent(
            opts.type,
            opts.bubbles,
            opts.cancelable,
            opts.ctrlKeyArg,
            opts.altKeyArg,
            opts.shiftKeyArg,
            opts.metaKeyArg,
            opts.keyCodeArg,
            opts.charCodeArg
        );
    }
    
    if (isMouseEvent)
        console.log('EVENT ' + opts.type + ' TO ' + el
            + ' AT ' + opts.screenX + ',' + opts.screenY);
    else
        console.log('EVENT ' + opts.type + ' TO ' + el
            + ' OF ' + (options.keyCodeArg || options.charCodeArg));

    //Fire the event
    el.dispatchEvent(event);
}

CPI.getCrosshairCoords = function() {
    var x = 0;
    var y = 0;
    if (CPI.crosshairCentered) {
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
    } else {
        var el = CPI.crosshair;        
        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        // subtract the scroll offset    
        x -= window.pageXOffset;
        y -= window.pageYOffset;
    }
    return {top: y, left: x};
}

CPI.scroll = function(deltaX, deltaY) {
    window.scrollBy(deltaX, deltaY);
    
    // handle mouseOver/mouseOut events
    var coord = CPI.getCrosshairCoords();
    // move the crosshair out of the way so that we don't pick it up instead of the actual target
    CPI.crosshair.style.top = '0%';
    CPI.crosshair.style.left = '0%';
    var newTarget = document.elementFromPoint(coord.left, coord.top);
    // move crosshair back
    CPI.crosshair.style.top = '50%';
    CPI.crosshair.style.left = '50%';
    //console.log('COORD ' + coord.left + ', ' + coord.top + '; NEW TARGET = ' + newTarget);
    if (newTarget !== undefined && newTarget != null && newTarget != CPI.target) {
        if (CPI.target !== undefined) {
            CPI.simulatedEvent(true, CPI.target, {type: 'mouseout',
                screenX: coord.left, screenY: coord.top});
        }
        CPI.target = newTarget;
        CPI.simulatedEvent(true, newTarget, {type: 'mouseover',
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
    // this serves a dummy, logical crosshair centre point, while the actual
    // reticle image is imposed over it
    CPI.crosshair = document.createElement('div');
    CPI.crosshair.style.width = '1px';
    CPI.crosshair.style.height = '1px';
    CPI.crosshair.style.zIndex = 99999999;
    CPI.crosshair.style.position = 'fixed';
    
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    if (CPI.crosshairCentered) {
        // add the margins so that the crosshair can reach everything
        document.body.style.padding = (window.innerHeight / 2) + 'px '
            + (window.innerWidth / 2) + 'px';
        // scroll so that visually nothing changes
        if (document.location.hash == '')
            window.scrollTo(window.innerHeight / 2, window.innerWidth / 2);
        
        CPI.crosshair.style.top = '50%';
        CPI.crosshair.style.left = '50%';
    } else {
        CPI.crosshair.style.position = 'absolute';
        CPI.crosshair.style.top = window.innerHeight / 2 + 'px';
        CPI.crosshair.style.left = window.innerWidth / 2 + 'px';
    }

    // the actual reticle image
    CPI.crosshair.reticle = document.createElement('img');
    CPI.crosshair.reticle.src = CPI.reticlePath;
    // locate the image so that its centre covers the div
    CPI.crosshair.reticle.style.position = 'relative';
    CPI.crosshair.reticle.style.top = '-32px';
    CPI.crosshair.reticle.style.left = '-32px';
    CPI.crosshair.reticle.style.width = '64px';
    CPI.crosshair.reticle.style.height = '64px';
    CPI.crosshair.reticle.style.zIndex = CPI.crosshair.style.zIndex + 1;
    
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
            if (CPI.target !== undefined && CPI.target !== null) {
                var coord = CPI.getCrosshairCoords();
                CPI.simulatedEvent(true, CPI.target, {type: message.action,
                    screenX: coord.left, screenY: coord.top});
                if (message.secondaryAction !== undefined)
                    CPI.simulatedEvent(true, CPI.target,
                        {type: message.secondaryAction,
                        screenX: coord.left, screenY: coord.top});
            }
        }
        if (message.arrowLeft !== undefined)
            CPI.simulatedEvent(false, CPI.target || document.body,
                {type: message.arrowLeft ? 'keydown' : 'keyup', keyCodeArg: 20});
        if (message.arrowRight !== undefined)
            CPI.simulatedEvent(false, CPI.target || document.body,
                {type: message.arrowRight ? 'keydown' : 'keyup', keyCodeArg: 21});
        if (message.arrowUp !== undefined)
            CPI.simulatedEvent(false, CPI.target || document.body,
                {type: message.arrowUp ? 'keydown' : 'keyup', keyCodeArg: 22});
        if (message.arrowDown !== undefined)
            CPI.simulatedEvent(false, CPI.target || document.body,
                {type: message.arrowDown ? 'keydown' : 'keyup', keyCodeArg: 23});
    });
});

// notify the background page that we're about to unload so that the port may be
// disconnected
window.addEventListener('unload', (function() {
    CPI.port.postMessage({tabId: CPI.tabId});
}), false);
