// ChromePadder content script

// create the ChromePadder interface object
var CPI = {};

// configuration
CPI.crosshairCentered = true;
CPI.reticlePath = chrome.extension.getURL('crosshairs/circle/circle-06.png');

function clamp(val, min, max){
    return Math.max(min, Math.min(max, val));
}

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

CPI.winToDoc = function(coord) {
    return {
        left: Math.round(coord.left / CPI.zoom) + window.pageXOffset,
        top: Math.round(coord.top / CPI.zoom) + window.pageYOffset
    };
}

CPI.docToWin = function(coord) {
    return {
        left: Math.round(coord.left * CPI.zoom) - window.pageXOffset,
        top: Math.round(coord.top * CPI.zoom) - window.pageYOffset
    };
}

// returns document-space croshhair coords
CPI.getCrosshairCoords = function() {
    return CPI.winToDoc({
        left: parseFloat(CPI.crosshair.style.left),
        top: parseFloat(CPI.crosshair.style.top)
    });
}

CPI.onScroll = function(deltaX, deltaY) {
    var coord = null;
    
    if (CPI.crosshairCentered) {
        window.scrollBy(deltaX, deltaY);
        coord = CPI.getCrosshairCoords();
    } else {
        // non-centered mode is a bit more complicated...
        // transform from fixed document space to window space
        coord = {
            left: Math.round(parseFloat(CPI.crosshair.style.left) * CPI.zoom),
            top: Math.round(parseFloat(CPI.crosshair.style.top) * CPI.zoom)
        };

        // move the crosshair in window space
        coord.left += deltaX;
        coord.top += deltaY;

        var innerLimits = {
            width: Math.min(window.innerWidth,
                document.body.clientWidth * CPI.zoom) - 1,
            height: Math.min(window.innerHeight,
                document.body.clientHeight * CPI.zoom) - 1
        };
        
        // handle overflows
        if (coord.left < 0) {
            deltaX = coord.left;
            coord.left = 0;
            console.log('X overflow ' + deltaX);
        } else if (coord.left > innerLimits.width) {
            deltaX = coord.left - innerLimits.width;
            coord.left = innerLimits.width;
            console.log('X overflow ' + deltaX);
        }
        if (coord.top < 0) {
            deltaY = coord.top;
            coord.top = 0;
            console.log('Y overflow ' + deltaY);
        } else if (coord.top > innerLimits.height) {
            deltaY = coord.top - innerLimits.height;
            coord.top = innerLimits.height;
            console.log('Y overflow ' + deltaY);
        }

        // new crosshair coordinates - from window space to fixed document
        CPI.crosshair.style.left = Math.round(coord.left / CPI.zoom) + 'px';
        CPI.crosshair.style.top = Math.round(coord.top / CPI.zoom) + 'px';

        // perform actual scrolling
        window.scrollBy(deltaX / CPI.zoom, deltaY / CPI.zoom);

        // transform from window space to document space
        coord = CPI.winToDoc(coord);
    }
    
    // handle mouseOver/mouseOut events
    // move the crosshair out of the way so that we don't pick it up instead
    // of the actual target
    if (CPI.crosshairCentered) {
        CPI.crosshair.style.top = '0%';
        CPI.crosshair.style.left = '0%';
    } else {
        CPI.crosshair.style.top = coord.top + 64 + 'px';
        CPI.crosshair.style.left = coord.left + 64 + 'px';
    }
    // sample the element at the coordinates
    var newTarget = document.elementFromPoint(coord.left, coord.top);
    // move crosshair back
    if (CPI.crosshairCentered) {
        CPI.crosshair.style.top = '50%';
        CPI.crosshair.style.left = '50%';
    } else {
        CPI.crosshair.style.top = coord.top + 'px';
        CPI.crosshair.style.left = coord.left + 'px';
    }
    //console.log('COORD ' + coord.left + ', ' + coord.top
    //    + '; NEW TARGET = ' + newTarget);
    if (newTarget !== undefined && newTarget != null
        && newTarget != CPI.target) {
        if (CPI.target !== undefined) {
            CPI.simulatedEvent(true, CPI.target, {type: 'mouseout',
                screenX: coord.left, screenY: coord.top});
        }
        CPI.target = newTarget;
        CPI.simulatedEvent(true, newTarget, {type: 'mouseover',
            screenX: coord.left, screenY: coord.top});
    }
}

CPI.onZoom = function(delta) {
    // limit zoom to 10% so that we don't scale out too far away
    CPI.zoom = Math.max(CPI.zoom + delta, 0.1);
    document.body.style.zoom = Math.round(CPI.zoom * 100) + '%';
    document.body.style.width = document.body.style.zoom;
    CPI.crosshair.reticle.style.zoom = Math.round(1.0 / CPI.zoom * 100) + '%';
    // scroll so that the crosshair remains in the centre
    var coord = CPI.getCrosshairCoords();
    CPI.onScroll(Math.round((window.innerWidth / 2) - coord.left * CPI.zoom),
        Math.round((window.innerHeight / 2) - coord.top * CPI.zoom));
}

CPI.createCrosshair = function() {
    // this serves a dummy, logical crosshair centre point, while the actual
    // reticle image is imposed over it
    CPI.crosshair = document.createElement('div');
    CPI.crosshair.style.width = '1px';
    CPI.crosshair.style.height = '1px';
    CPI.crosshair.style.zIndex = 99999999;
    CPI.crosshair.style.position = 'fixed';

    CPI.zoom = 1.0;
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
        CPI.crosshair.style.top = Math.round(window.innerHeight / 2) + 'px';
        CPI.crosshair.style.left = Math.round(window.innerWidth / 2) + 'px';
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
    CPI.crosshair.reticle.style.opactiy = 0.7;
    
    CPI.crosshair.appendChild(CPI.crosshair.reticle);
    document.body.appendChild(CPI.crosshair);
}

// sign up for IPC
chrome.extension.onConnect.addListener(function(port) {
    if (port.name != "ChromePadder")
        return;
    
    CPI.port = port;
    port.onMessage.addListener(function(message) {
        //console.log("Message: " + JSON.stringify(message));
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
            CPI.onScroll(message.deltaX, message.deltaY);
        
        // execute zoom command
        if (message.deltaZoom !== undefined) {
            if (message.deltaZoom == 0)
                CPI.onZoom(1.0 - CPI.zoom);
            else
                CPI.onZoom(message.deltaZoom);
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
