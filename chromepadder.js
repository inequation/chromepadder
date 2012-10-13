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
            /*console.log('Cycling ' + ( forward
                    ? ('forward to ' + nextTabId)
                    : ('backward to ' + prevTabId)));*/
            if (forward === true && nextTabId)
                chrome.tabs.update(nextTabId, {selected: true})
            else if (prevTabId)
                chrome.tabs.update(prevTabId, {selected: true}) 
        });
}

// helper callback that connects to the port of the given tab
ChromePadder.connect = function(tabId) {
    // if we change the port, make sure we don't get disconnect messages from
    // inactive tabs
    if (ChromePadder.port !== undefined)
        ChromePadder.port.onMessage.removeListener(ChromePadder.onMessageFromTab);
    try {
        ChromePadder.port = chrome.tabs.connect(tabId, {name: "ChromePadder"});
        ChromePadder.port.tabId = tabId;
        ChromePadder.port.onMessage.addListener(ChromePadder.onMessageFromTab);
        ChromePadder.port.postMessage({tabId: tabId});
    } catch (e) {
        ChromePadder.port = undefined;
    }
}

// helper callback that clears the port reference so that we may reconnect with
// the tab after a refresh or unload
ChromePadder.onMessageFromTab = function(message) {
    if (message.tabId == ChromePadder.port.tabId) {
        // defer a reconnect by 1 frame
        setTimeout(function() {
            ChromePadder.port = undefined;
            chrome.windows.getLastFocused({populate: true},
                function (theWindow) {
                    chrome.tabs.query({active: true, windowId: theWindow.id},
                        function(tabArray) {
                            ChromePadder.connect(tabArray[0].id);
                        });
                });
        }, 1000 / ChromePadder.activeFPS);
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
            chrome.windows.getLastFocused({populate: true},
                function (theWindow) {
                    chrome.tabs.query({active: true, windowId: theWindow.id},
                        function(tabArray) {
                            ChromePadder.connect(tabArray[0].id);
                        });
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
        
        // the following actions are window-wide and don't require a connection
        // to the active tab
        
        // tab switching on triggers
        if (pad.rightShoulder1 > 0.5 && prevPad.rightShoulder1 < 0.5)
            ChromePadder.cycleTab(true);
        else if (pad.leftShoulder1 > 0.5 && prevPad.leftShoulder1 < 0.5)
            ChromePadder.cycleTab(false);
        
        // tab opening and closing on X and Y
        if (pad.faceButton2 < 0.5 && prevPad.faceButton2 > 0.5)
            chrome.tabs.create({active: true});
        else if (pad.faceButton3 < 0.5 && prevPad.faceButton3 > 0.5) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.remove(tab.id);
            });
        }
        
        // the following actions take effect on the active tab
        
        if (ChromePadder.port !== undefined) {
            var message = {};       // commands to dispatch
            var send = false;       // used to avoid sending empty messages
            
            // scrolling on the left stick
            message.deltaX = Math.round(
                (Math.abs(pad.leftStickX) > pad.deadZoneLeftStick)
                ? pad.leftStickX * pad.leftStickX * pad.leftStickX
                    * pad.leftStickX * pad.leftStickX * ChromePadder.scrollSpeed
                : 0);
            message.deltaY = Math.round(
                (Math.abs(pad.leftStickY) > pad.deadZoneLeftStick)
                ? pad.leftStickY * pad.leftStickY * pad.leftStickY
                    * pad.leftStickY * pad.leftStickY * ChromePadder.scrollSpeed
                : 0);
            if (message.deltaX == 0 && message.deltaY == 0) {
                message.deltaX = undefined;
                message.deltaY = undefined;
            } else
                send = true;
            
            // zooming with the right stick
            if (pad.rightStickButton > 0.5 && prevPad.rightStickButton < 0.5) {
                // reset with a click...
                message.deltaZoom = 0;
                send = true;
            } else {
                // ...or free control with the Y axis
                message.deltaZoom = -Math.round(
                    (Math.abs(pad.rightStickY) > pad.deadZoneRightStick)
                    ? pad.rightStickY * ChromePadder.zoomSpeed
                    : 0);
                if (message.deltaZoom == 0)
                    message.deltaZoom = undefined;
                else
                    send = true;
            }
            
            // navigation with the bumpers and refreshing/stopping with the back
            // button
            if (pad.select < 0.5 && prevPad.select > 0.5) {
                message.historyGo = 0;
                send = true;
            } else if (pad.leftShoulder0 < 0.5 && prevPad.leftShoulder0 > 0.5) {
                message.historyGo = -1;
                send = true;
            } else if (pad.rightShoulder0 < 0.5 && prevPad.rightShoulder0 > 0.5) {
                message.historyGo = 1;
                send = true;
            }
            
            // arrow keys on the D-pad - separate axes
            if (pad.dpadUp > 0.5 && prevPad.dpadUp < 0.5) {
                message.arrowUp = true;
                send = true;
            } else if (pad.dpadUp < 0.5 && prevPad.dpadUp > 0.5) {
                message.arrowUp = false;
                send = true;
            }
            if (pad.dpadDown > 0.5 && prevPad.dpadDown < 0.5) {
                message.arrowDown = true;
                send = true;
            } else if (pad.dpadDown < 0.5 && prevPad.dpadDown > 0.5) {
                message.arrowDown = false;
                send = true;
            }
            if (pad.dpadLeft > 0.5 && prevPad.dpadLeft < 0.5) {
                message.arrowLeft = true;
                send = true;
            } else if (pad.dpadLeft < 0.5 && prevPad.dpadLeft > 0.5) {
                message.arrowLeft = false;
                send = true;
            }
            if (pad.dpadRight > 0.5 && prevPad.dpadRight < 0.5) {
                message.arrowRight = true;
                send = true;
            } else if (pad.dpadRight < 0.5 && prevPad.dpadRight > 0.5) {
                message.arrowRight = false;
                send = true;
            }
            
            // left mouse click with the A button
            if (pad.faceButton0 > 0.5 && prevPad.faceButton0 < 0.5) {
                message.action = 'mousedown';
                send = true;
            } else if (pad.faceButton0 < 0.5 && prevPad.faceButton0 > 0.5) {
                message.action = 'mouseup';
                message.secondaryAction = 'click';
                send = true;
            }
            
            // execute the commands in the tab
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
