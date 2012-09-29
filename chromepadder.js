// ChromePadder main script file

var ChromePadder = {};
window.ChromePadder = ChromePadder;

// configuration
ChromePadder.standbyFPS = 5;
ChromePadder.activeFPS = 30;
ChromePadder.scrollSpeed = 200;
ChromePadder.zoomSpeed = 5;

ChromePadder.cycleTab = function(forward) {
    chrome.windows.getLastFocused({populate: true},
        function (theWindow) {
            var tabs = theWindow.tabs;
            var prevTabId = undefined;
            var nextTabId = undefined;
            for (var i = 0; i < tabs.length; ++i) {
                if (tabs[i].active) {
                    prevTabId = tabs[(i > 1) ? (i - 1) : (tabs.length - 1)].id;
                    nextTabId = tabs[(i + 1) % tabs.length].id;
                    break;
                }
            }
            console.log('Cycling ' + (forward ? 'forward' : 'backward'));
            if (forward === true && nextTabId)
                chrome.tabs.update(nextTabId, {selected: true})
            else if (prevTabId)
                chrome.tabs.update(prevTabId, {selected: true}) 
        });
}

// helper callback that connects to the port of the given tab
ChromePadder.connect = function(tabId) {
    try {
        ChromePadder.port = chrome.tabs.connect(tabId, {name: "ChromePadder"});
    } catch (e) {
        ChromePadder.port = undefined;
    }
}

ChromePadder.main = function() {
    // wait for gamepad.js to load
    if (Gamepad === undefined)
        setTimeout(ChromePadder.main, 1000 / ChromePadder.standbyFPS);
    
    // check for gamepad support first
    if (!Gamepad.supported) {
        var notification = webkitNotifications.createNotification(
            'icon.png',
            'Gamepad not supported!',
            'Make sure support is enabled in chrome://flags and restart the extension.');
        notification.show();
        return;
    }

    // start out in standby
    if (ChromePadder.state === undefined)
        ChromePadder.state = 'standby';
    
    var pad = Gamepad.getState(0);
    var prevPad = Gamepad.getPreviousState(0);
    
    if (ChromePadder.state == 'standby') {
        //console.log('Standby frame');
        if (pad) {
            console.log('Activating');
            ChromePadder.state = 'active';
                        
            // detect currently active tab and connect to its port
            chrome.tabs.getSelected(null, function(tab) {
                ChromePadder.connect(tab.id);
            });
            
            // subscribe to tab activation events to always be up-to-date
            chrome.tabs.onActivated.addListener(function (activeInfo) {
                ChromePadder.connect(activeInfo.tabId);
            });
        } else
            // reschedule another frame
            setTimeout(ChromePadder.main, 1000 / ChromePadder.standbyFPS);
    }
    
    if (ChromePadder.state == 'active') {
        //console.log('Active frame');
        
        // tab switching on triggers
        if (pad['rightShoulder1'] > 0.5 && prevPad['rightShoulder1'] < 0.5)
            ChromePadder.cycleTab(true);
        else if (pad['leftShoulder1'] > 0.5 && prevPad['leftShoulder1'] < 0.5)
            ChromePadder.cycleTab(false);
        
        // no point in checking the pad input if the active tab port is not open
        if (ChromePadder.port) {
            // commands to dispatch are accumulated in this message object
            var message = {};
            var send = false;
            
            // scrolling on the left stick
            message.deltaX = Math.round(
                (Math.abs(pad['leftStickX']) > pad['deadZoneLeftStick'])
                ? pad['leftStickX'] * pad['leftStickX'] * pad['leftStickX']
                    * ChromePadder.scrollSpeed
                : 0);
            message.deltaY = Math.round(
                (Math.abs(pad['leftStickY']) > pad['deadZoneLeftStick'])
                ? pad['leftStickY'] * pad['leftStickY'] * pad['leftStickY']
                    * ChromePadder.scrollSpeed
                : 0);
            if (message.deltaX == 0 && message.deltaY == 0) {
                message.deltaX = undefined;
                message.deltaY = undefined;
            } else
                send = true;
            
            // zooming with the right stick
            if (pad['rightStickButton'] > 0.5)
            {
                // reset with a click...
                message.zoomReset = true;
                send = true;
            } else {
                // ...or free control with the Y axis
                message.deltaZoom = -Math.round(
                    (Math.abs(pad['rightStickY']) > pad['deadZoneRightStick'])
                    ? pad['rightStickY'] * ChromePadder.zoomSpeed
                    : 0);
                if (message.deltaZoom == 0)
                    message.deltaZoom = undefined;
                else
                    send = true;
            }
            
            // execute the accumulated commands
            if (send) {
                try {
                    ChromePadder.port.postMessage(message);
                } catch (e) {}
            }
        }
        
        // reschedule next frame
        setTimeout(ChromePadder.main, 1000 / ChromePadder.activeFPS);
    }
}

// kick the loop off
ChromePadder.main();
