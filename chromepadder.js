// ChromePadder main script file

var ChromePadder = {};
window.ChromePadder = ChromePadder;

// configuration
ChromePadder.standbyFPS = 5;
ChromePadder.activeFPS = 30;
ChromePadder.scrollSpeed = 200;
ChromePadder.zoomSpeed = 5;

ChromePadder.cycleTab = function(forward) {
    var tabs = ChromePadder.focusedWindowTabs;
    var prevTabId = undefined;
    var nextTabId = undefined;
    for (var i = 0; i < tabs.length; ++i) {
        if (tabs[i].active) {
            //ChromePadder.activeTab = tabs[i];
            prevTabId = tabs[((i - 1) >= 0) ? (i - 1) : (tabs.length - 1)].id;
            nextTabId = tabs[(i + 1) % tabs.length].id;
            break;
        }
    }
    console.log('Cycling ' + (forward ? 'forward' : 'backward'));
    if (forward === true && nextTabId)
        chrome.tabs.update(nextTabId, {selected: true})
    else if (prevTabId)
        chrome.tabs.update(prevTabId, {selected: true})
}

ChromePadder.main = function() {
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
    
    chrome.windows.getLastFocused({populate: true},
        function (theWindow) {ChromePadder.focusedWindowTabs = theWindow.tabs});
    
    var pad = Gamepad.getState(0);
    var prevPad = Gamepad.getPreviousState(0);
    
    if (ChromePadder.state == 'standby') {
        //console.log('Standby frame');
        if (pad) {
            console.log('Activating');
            ChromePadder.state = 'active';
            
            // detect currently active tab
            chrome.tabs.getSelected(null, function(tab) {
                ChromePadder.activeTab = tab;
            });
            
            // subscribe to tab activation events to always be up-to-date
            chrome.tabs.onActivated.addListener(function (activeInfo) {
                chrome.tabs.get(activeInfo.tabId, function(tab) {
                    ChromePadder.activeTab = tab;
                });
            });
        } else
            // reschedule another frame
            setTimeout(ChromePadder.main, 1000 / ChromePadder.standbyFPS);
    }
    
    if (ChromePadder.state == 'active') {
        //console.log('Active frame');
        
        // tab switching on triggers
        if (ChromePadder.focusedWindowTabs
            && ChromePadder.focusedWindowTabs.length > 1) {
            if (pad['rightShoulder1'] > 0.5 && prevPad['rightShoulder1'] < 0.5)
                ChromePadder.cycleTab(true);
            else if (pad['leftShoulder1'] > 0.5 && prevPad['leftShoulder1'] < 0.5)
                ChromePadder.cycleTab(false);
        }
        
        if (ChromePadder.activeTab) {
            var tab = ChromePadder.activeTab;
            // commands are accumulated in this string
            var script = '';
            
            // scrolling on the left stick
            scrollX = Math.round(
                (Math.abs(pad['leftStickX']) > pad['deadZoneLeftStick'])
                ? pad['leftStickX'] * pad['leftStickX'] * pad['leftStickX']
                    * ChromePadder.scrollSpeed
                : 0);
            scrollY = Math.round(
                (Math.abs(pad['leftStickY']) > pad['deadZoneLeftStick'])
                ? pad['leftStickY'] * pad['leftStickY'] * pad['leftStickY']
                    * ChromePadder.scrollSpeed
                : 0);
            if (scrollX != 0 || scrollY != 0) {
                console.log('Scroll delta: ' + scrollX + ',' + scrollY);
                script += 'window.scrollTo('
                    + 'window.pageXOffset+' + scrollX + ','
                    + 'window.pageYOffset+' + scrollY + ');';
            }
            
            // zooming with the right stick
            if (pad['rightStickButton'] > 0.5) {
                // reset with a click...
                script += 'document.body.style.zoom=\'100%\';';
            } else {
                // ...or free control with the Y axis
                zoom = -Math.round(
                    (Math.abs(pad['rightStickY']) > pad['deadZoneRightStick'])
                    ? pad['rightStickY'] * ChromePadder.zoomSpeed
                    : 0);
                if (zoom != 0) {
                    console.log('Zoom delta: ' + zoom);
                    script += 'if(document.body.style.zoom==\'\')'
                            + 'document.body.style.zoom=\'100%\';'
                        + 'document.body.style.zoom=(Math.max(('
                        + 'parseInt(document.body.style.zoom)+'
                        + zoom + '),10)+\'%\');';
                }
            }
            
            // execute the accumulated commands
            if (script != '') {
                try {
                    chrome.tabs.executeScript(tab.id, {code:script});
                } catch (e) {}
            }
        }
        
        // reschedule next frame
        setTimeout(ChromePadder.main, 1000 / ChromePadder.activeFPS);
    }
}

// ============================================================================
// gamepad.js inclusion
// ============================================================================

// adding the script tag to the head
var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'gamepad.js';

// bind the event to the callback function 
// there are several events for cross browser compatibility
script.onreadystatechange = ChromePadder.main;
script.onload = ChromePadder.main;

// fire the loading
head.appendChild(script);

