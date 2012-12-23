#/**********************************************************\ 
#
# Auto-Generated Plugin Configuration file
# for ChromePadder NUI Plugin
#
#\**********************************************************/

set(PLUGIN_NAME "CPNUIPlugin")
set(PLUGIN_PREFIX "CPNP")
set(COMPANY_NAME "inequation")

# ActiveX constants:
set(FBTYPELIB_NAME CPNUIPluginLib)
set(FBTYPELIB_DESC "CPNUIPlugin 1.0 Type Library")
set(IFBControl_DESC "CPNUIPlugin Control Interface")
set(FBControl_DESC "CPNUIPlugin Control Class")
set(IFBComJavascriptObject_DESC "CPNUIPlugin IComJavascriptObject Interface")
set(FBComJavascriptObject_DESC "CPNUIPlugin ComJavascriptObject Class")
set(IFBComEventSource_DESC "CPNUIPlugin IFBComEventSource Interface")
set(AXVERSION_NUM "1")

# NOTE: THESE GUIDS *MUST* BE UNIQUE TO YOUR PLUGIN/ACTIVEX CONTROL!  YES, ALL OF THEM!
set(FBTYPELIB_GUID d94fb7bf-8ec9-5bce-8e3b-72116912d3d4)
set(IFBControl_GUID f2b33ccb-0bf1-5534-810f-d73574b53ca9)
set(FBControl_GUID ca929e86-8f2b-5e1a-a807-89e2bd9b7c3e)
set(IFBComJavascriptObject_GUID 38a398c6-18b2-5225-8478-d6ce4f54e378)
set(FBComJavascriptObject_GUID 67e63e42-1229-5f89-9ba7-a6a78d2e5a86)
set(IFBComEventSource_GUID 138a3852-ef09-56a0-af4f-8af3e4839763)
if ( FB_PLATFORM_ARCH_32 )
    set(FBControl_WixUpgradeCode_GUID c458cdab-175f-55ea-9537-cbad6a93e309)
else ( FB_PLATFORM_ARCH_32 )
    set(FBControl_WixUpgradeCode_GUID a3631735-d5ca-5c53-a0f2-346a4a81e38a)
endif ( FB_PLATFORM_ARCH_32 )

# these are the pieces that are relevant to using it from Javascript
set(ACTIVEX_PROGID "inequation.CPNUIPlugin")
set(MOZILLA_PLUGINID "inequation.org/CPNUIPlugin")

# strings
set(FBSTRING_CompanyName "Leszek Godlewski")
set(FBSTRING_PluginDescription "ChromePadder Native Plugin for Natural User Interface")
set(FBSTRING_PLUGIN_VERSION "1.0.0.0")
set(FBSTRING_LegalCopyright "Copyright 2012 Leszek Godlewski")
set(FBSTRING_PluginFileName "np${PLUGIN_NAME}.dll")
set(FBSTRING_ProductName "ChromePadder NUI Plugin")
set(FBSTRING_FileExtents "")
if ( FB_PLATFORM_ARCH_32 )
    set(FBSTRING_PluginName "ChromePadder NUI Plugin")  # No 32bit postfix to maintain backward compatability.
else ( FB_PLATFORM_ARCH_32 )
    set(FBSTRING_PluginName "ChromePadder NUI Plugin_${FB_PLATFORM_ARCH_NAME}")
endif ( FB_PLATFORM_ARCH_32 )
set(FBSTRING_MIMEType "application/x-chromepadder-nui")

# Uncomment this next line if you're not planning on your plugin doing
# any drawing:

#set (FB_GUI_DISABLED 1)

# Mac plugin settings. If your plugin does not draw, set these all to 0
set(FBMAC_USE_QUICKDRAW 0)
set(FBMAC_USE_CARBON 1)
set(FBMAC_USE_COCOA 1)
set(FBMAC_USE_COREGRAPHICS 1)
set(FBMAC_USE_COREANIMATION 0)
set(FBMAC_USE_INVALIDATINGCOREANIMATION 0)

# If you want to register per-machine on Windows, uncomment this line
#set (FB_ATLREG_MACHINEWIDE 1)
