// ChromePadder main script file

var ChromePadder = {};
window.ChromePadder = ChromePadder;

// configuration
ChromePadder.standbyFPS = 5;
ChromePadder.activeFPS = 30;

ChromePadder.cycleTab = function(forward) {
    var tabs = ChromePadder.focusedWindowTabs;
    var prevTabId = undefined;
    var nextTabId = undefined;
    for (var i = 0; i < tabs.length; ++i) {
        if (tabs[i].active) {
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
        alert('Gamepad not supported! Make sure support is enabled in chrome://flags and restart the extension.');
        return;
    }

    // start out in standby
    if (ChromePadder.state === undefined)
        ChromePadder.state = 'standby';
    
    chrome.windows.getLastFocused(
        { populate: true },
        function (theWindow) {
        ChromePadder.focusedWindowTabs = theWindow.tabs;
    })
    
    var pad = Gamepad.getState(0);
    var prevPad = Gamepad.getPreviousState(0);
    
    if (ChromePadder.state == 'standby') {
        //console.log('Standby frame');
        if (pad) {
            console.log('Activating');
            ChromePadder.state = 'active';
        } else
            // reschedule anoth frame
            setTimeout(ChromePadder.main, 1000 / ChromePadder.standbyFPS);
    }
    
    if (ChromePadder.state == 'active') {
        //console.log('Active frame')
        
        // tab switching on triggers
        if (ChromePadder.focusedWindowTabs
            && ChromePadder.focusedWindowTabs.length > 1) {
            if (pad['rightShoulder1'] > 0.5 && prevPad['rightShoulder1'] < 0.5)
                ChromePadder.cycleTab(true);
            else if (pad['leftShoulder1'] > 0.5 && prevPad['leftShoulder1'] < 0.5)
                ChromePadder.cycleTab(false);
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

