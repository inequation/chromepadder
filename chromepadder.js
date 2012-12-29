// ChromePadder main script file

var ChromePadder = {};
var NUIPlugin = null;

// configuration
ChromePadder.standbyFPS = 5;
ChromePadder.activeFPS = 30;
ChromePadder.scrollSpeed = 200;
ChromePadder.zoomSpeed = 0.05;
ChromePadder.NUIActivationPlaneOffset = 150.0;  // milimetres
ChromePadder.NUIScrollSpeed = 0.8;
ChromePadder.NUIZoomSpeed = 0.001;
ChromePadder.NUINoiseThreshold = 0.8;
ChromePadder.NUISimultGestureTimeout = 400;     // milliseconds

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

ChromePadder.dispatchAmbiguousGestures = function() {
    console.log("Dispatching ambiguous gestures now");
    for (var i = 0; i < ChromePadder.hands.length; ++i) {
        while (ChromePadder.hands[i].gestures
            && ChromePadder.hands[i].gestures.length > 0) {
            var gestureObj = ChromePadder.hands[i].gestures.pop();
            console.log("Hand " + i + " " + JSON.stringify(gestureObj));
            switch (gestureObj.gesture) {
                case "SwipeLeft":
                    ChromePadder.cycleTab(true);
                    break;
                case "SwipeRight":
                    ChromePadder.cycleTab(false);
                    break;
                case "SwipeUp":
                    try {
                        ChromePadder.port.postMessage({historyGo: 1});
                    } catch (e) {}
                    break;
                case "SwipeDown":
                    try {
                        ChromePadder.port.postMessage({historyGo: -1});
                    } catch (e) {}
                    break;
            }
        }
    }
}

ChromePadder.activate = function() {
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
}

ChromePadder.main = function() {
    // wait for gamepad.js and the NUI plugin to load
    if (Gamepad === undefined || NUIPlugin === null) {
        // attempt to retrieve the plugin
        if (NUIPlugin === null)
            NUIPlugin = document.getElementById('nuiplugin');
        
        setTimeout(ChromePadder.main, 1000 / ChromePadder.standbyFPS);
        return;
    }
    
    // check for controller support first
    if (!Gamepad.supported && !NUIPlugin.isNUIAvailable()) {
        var notification = webkitNotifications.createNotification(
            'icon.png',
            'Neither gamepad nor NUI available!',
            'Make sure gamepad support is enabled in chrome://flags and/or the '
                + 'NUI device is connected and set up properly and restart the '
                + 'extension.');
        notification.show();
        return;
    }

    // start out in standby
    if (ChromePadder.state === undefined)
        ChromePadder.state = 'standby';

    // branch by controller support; NUI dominates gamepad
    if (NUIPlugin && NUIPlugin.isNUIAvailable()) {
        // NUI control
        //console.log('NUI is available!');
        ChromePadder.activate();

        ChromePadder.hands = [];
        
        // register event callbacks

        // hand destruction
        NUIPlugin.addEventListener("handDestroyed", function (handId) {
            // if this was the last active hand, clear the activation plane
            // setting
            console.log("Lost hand " + handId + ", " + NUIPlugin.getNumHands()
                + " left");
            if (NUIPlugin.getNumHands() == 0)
                ChromePadder.activationPlane = undefined;
            ChromePadder.hands[handId] = {motion: null, gestures: null};
        });

        // regular hand motion for panning & zooming
        NUIPlugin.addEventListener("handMove", function (handId, newPos) {
            if (ChromePadder.hands[handId] === undefined)
                ChromePadder.hands[handId] = {motion: null, gestures: null};

            if (newPos[2] > ChromePadder.activationPlane) {
                if (ChromePadder.hands[handId].motion !== null) {
                    console.log("Hand #" + handId + " deactivating");
                    // hand not beyond activation plane, disable it
                    ChromePadder.hands[handId].motion = null;
                }
            } else {
                if (ChromePadder.hands[handId].motion === null) {
                    console.log("Hand #" + handId + " activating");
                    ChromePadder.hands[handId].motion = [newPos, newPos];
                } else {
                    ChromePadder.hands[handId].motion.unshift(newPos);
                    ChromePadder.hands[handId].motion.pop();
                }
                
                // zoom is only possible with both hands beyond activation plane
                var bZoomCapable = ChromePadder.hands.length > 1;
                if (bZoomCapable) {
                    for (var i = 0; i < 2; ++i) {
                        if (ChromePadder.hands[i].motion === null) {
                            bZoomCapable = false;
                            break;
                        }
                    }
                }

                var message = {};       // commands to dispatch

                if (!bZoomCapable) {
                    var delta = [
                        newPos[0] - ChromePadder.hands[handId].motion[1][0],
                        newPos[1] - ChromePadder.hands[handId].motion[1][1]
                    ];
                    if (Math.abs(delta[0]) > ChromePadder.NUINoiseThreshold)
                        message.deltaX = Math.pow(Math.abs(delta[0]), 1.5)
                            * (delta[0] < 0.0 ? 1.0 : -1.0)
                            * ChromePadder.NUIScrollSpeed;
                    if (Math.abs(delta[1]) > ChromePadder.NUINoiseThreshold)
                        message.deltaY = Math.pow(Math.abs(delta[1]), 1.5)
                            * (delta[1] < 0.0 ? -1.0 : 1.0)
                            * ChromePadder.NUIScrollSpeed;
                } else if (bZoomCapable && handId == 1) {
                    // I assume that hand #1 data arrives after hand #0
                    // let's see if we closed the hands in or moved them out
                    
                    // distance between hands in the previous frame
                    var hand0 = ChromePadder.hands[0].motion[1];
                    var hand1 = ChromePadder.hands[1].motion[1];
                    var diffVect = [
                        hand1[0] - hand0[0],
                        hand1[1] - hand0[1]
                    ];
                    prevDiff = Math.sqrt(diffVect[0] * diffVect[0]
                        + diffVect[1] * diffVect[1]);
                    
                    // distance between hands in the current frame
                    hand0 = ChromePadder.hands[0].motion[0];
                    hand1 = ChromePadder.hands[1].motion[0];
                    diffVect = [
                        hand1[0] - hand0[0],
                        hand1[1] - hand0[1]
                    ];
                    curDiff = Math.sqrt(diffVect[0] * diffVect[0]
                        + diffVect[1] * diffVect[1]);
                    
                    var diff = curDiff - prevDiff;
                    if (Math.abs(diff) > 2.0 * ChromePadder.NUINoiseThreshold)
                        message.deltaZoom = diff * ChromePadder.NUIZoomSpeed;
                }

                // dispatch message
                if (message != {}) {
                    try {
                        ChromePadder.port.postMessage(message);
                    } catch (e) {}
                }
            }
        });

        // gesture recognition
        NUIPlugin.addEventListener("gestureRecognized",
            function (handId, gesture, idPos, endPos) {
                console.log("Received gesture: hand #" + handId + " of "
                    + NUIPlugin.getNumHands() + ", " + gesture + " at "
                    + JSON.stringify(endPos));

                // if it's the initial focus gesture (number of active hands
                // == 0), derive the pan & zoom activation plane from it
                if (ChromePadder.activationPlane === undefined) {
                    ChromePadder.activationPlane = endPos[2]
                        - ChromePadder.NUIActivationPlaneOffset;
                    console.log("Setting activation plane to "
                        + ChromePadder.activationPlane);
                } else {
                    if (ChromePadder.hands[handId] === undefined)
                        ChromePadder.hands[handId] = {motion: null, gestures: null};

                    var currentTime = new Date().getTime();
                    var gestureObj = {
                        gesture: gesture,
                        timestamp: currentTime,
                        idPos: idPos,
                        endPos: endPos
                    };

                    if (ChromePadder.hands[handId].gestures === null)
                        ChromePadder.hands[handId].gestures = [gestureObj];
                    else {
                        ChromePadder.hands[handId].gestures.push(gestureObj);
                        setTimeout(ChromePadder.dispatchAmbiguousGestures,
                            ChromePadder.NUISimultGestureTimeout);
                    }
                
                    var message = {};       // commands to dispatch

                    var simultGesture = null;
                    var simultGestureHandId = 0;
                    for (var i = 0; i < 2; ++i) {
                        if (i == handId
                            || !ChromePadder.hands[i]
                            || !ChromePadder.hands[i].gestures
                            || ChromePadder.hands[i].gestures.length < 1)
                            continue;
                        if (currentTime
                            - ChromePadder.hands[i].gestures[0].timestamp
                            < ChromePadder.NUISimultGestureTimeout)
                        simultGesture = ChromePadder.hands[i].gestures.pop();
                        simultGestureHandId = i;
                    }

                    console.log(JSON.stringify(simultGesture));
                    // try interpreting two-handed gestures
                    if (simultGesture != null) {
                        if ((simultGesture.gesture == "SwipeLeft"
                                && gesture == "SwipeRight")
                            || (simultGesture.gesture == "SwipeRight"
                                && gesture == "SwipeLeft")) {
                            // tab creation and deletion by swipes
                            ChromePadder.hands[handId].gestures.pop();
                            // see if it's an inward or outward swipe
                            /*console.log("Simult swipe: "
                                + Math.abs(simultGesture.endPos[0] - endPos[0])
                                + " "
                                + Math.abs(simultGesture.idPos[0] - idPos[0]));*/
                            if (Math.abs(simultGesture.endPos[0] - endPos[0])
                                > Math.abs(simultGesture.idPos[0] - idPos[0]))
                                // outward - create a new tab
                                chrome.tabs.create({active: true});
                            else {
                                // inward - close tab
                                chrome.tabs.getSelected(null, function(tab) {
                                    chrome.tabs.remove(tab.id);
                                });
                            }
                        } else if (simultGesture.gesture == gesture == "Wave") {
                            // refreshing/stopping
                            message.historyGo = 0;
                        } else {
                            // reschedule interpretation of the gesture
                            ChromePadder.hands[simultGestureHandId].push(simultGesture);
                            simultGesture = null;
                        }
                    }
                    
                    if (simultGesture === null) {
                        // not a two-handed gesture, interpret as a single one
                        switch (gesture) {
                            // mouse click
                            case "Click":
                                message.action = 'click';
                                // not possibly part of a two-hand gesture
                                ChromePadder.hands[handId].gestures.pop();
                                break;
                        }
                    }

                    // dispatch message
                    try {
                        ChromePadder.port.postMessage(message);
                    } catch (e) {}
                }
            }, false);
    } else {
        // gamepad control
        var pad = Gamepad.getState(0);
        var prevPad = Gamepad.getPreviousState(0);

        if (ChromePadder.state == 'standby') {
            //console.log('Standby frame');
            if (pad)
                ChromePadder.activate();
            else
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
                    message.deltaZoom =
                        -((Math.abs(pad.rightStickY) > pad.deadZoneRightStick)
                            ? pad.rightStickY * ChromePadder.zoomSpeed
                            : 0);
                    if (Math.abs(message.deltaZoom) < 0.01)
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
}

// kick the loop off
ChromePadder.main();
