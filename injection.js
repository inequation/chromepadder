// ChromePadder content script

function CPScroll(deltaX, deltaY) {
    window.scrollTo(window.pageXOffset + deltaX, window.pageYOffset + deltaY);
}

function CPZoom(delta) {
    if (document.body.style.zoom == '')
        document.body.style.zoom = '100%';
    // limit zoom to 10% so that we don't get carried away
    document.body.style.zoom = Math.max(
        (parseInt(document.body.style.zoom) + delta),
        10) + '%';
}
