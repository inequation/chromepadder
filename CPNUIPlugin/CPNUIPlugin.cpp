/**********************************************************\

  Auto-generated CPNUIPlugin.cpp

  This file contains the auto-generated main plugin object
  implementation for the ChromePadder NUI Plugin project

\**********************************************************/

#include "CPNUIPluginAPI.h"

#include "CPNUIPlugin.h"

#include "XmlScript.h"

///////////////////////////////////////////////////////////////////////////////
/// @fn CPNUIPlugin::StaticInitialize()
///
/// @brief  Called from PluginFactory::globalPluginInitialize()
///
/// @see FB::FactoryBase::globalPluginInitialize
///////////////////////////////////////////////////////////////////////////////
void CPNUIPlugin::StaticInitialize()
{
    // Place one-time initialization stuff here; As of FireBreath 1.4 this should only
    // be called once per process
}

///////////////////////////////////////////////////////////////////////////////
/// @fn CPNUIPlugin::StaticInitialize()
///
/// @brief  Called from PluginFactory::globalPluginDeinitialize()
///
/// @see FB::FactoryBase::globalPluginDeinitialize
///////////////////////////////////////////////////////////////////////////////
void CPNUIPlugin::StaticDeinitialize()
{
    // Place one-time deinitialization stuff here. As of FireBreath 1.4 this should
    // always be called just before the plugin library is unloaded
}

///////////////////////////////////////////////////////////////////////////////
/// @brief  CPNUIPlugin constructor.  Note that your API is not available
///         at this point, nor the window.  For best results wait to use
///         the JSAPI object until the onPluginReady method is called
///////////////////////////////////////////////////////////////////////////////
CPNUIPlugin::CPNUIPlugin()
	: m_pluginReady(false),
	m_NUIAvailable(false)
{
}

///////////////////////////////////////////////////////////////////////////////
/// @brief  CPNUIPlugin destructor.
///////////////////////////////////////////////////////////////////////////////
CPNUIPlugin::~CPNUIPlugin()
{
    // This is optional, but if you reset m_api (the shared_ptr to your JSAPI
    // root object) and tell the host to free the retained JSAPI objects then
    // unless you are holding another shared_ptr reference to your JSAPI object
    // they will be released here.
    m_JSAPI.reset();
    m_pluginReady = true;
    releaseRootJSAPI();
    m_host->freeRetainedObjects();
}

void CPNUIPlugin::onPluginReady()
{
    // When this is called, the BrowserHost is attached, the JSAPI object is
    // created, and we are ready to interact with the page and such.  The
    // PluginWindow may or may not have already fire the AttachedEvent at
    // this point.

    m_pluginReady = true;
    m_NUIAvailable = false;

    XnStatus rc;

	// Create a context with default settings
	rc = m_context.Init();
	if (rc != XN_STATUS_OK)
	{
		//printf("Open failed: %s\n", xnGetStatusString(rc));
		return;
	}

	rc = m_context.RunXmlScript(SampleConfig, m_scriptNode/*, &errors*/);
	if (rc == XN_STATUS_NO_NODE_PRESENT)
	{
		/*XnChar strError[1024];
		errors.ToString(strError, 1024);
		printf("%s\n", strError);*/
		return;
	}
	else if (rc != XN_STATUS_OK)
	{
		//printf("Open failed: %s\n", xnGetStatusString(rc));
		return;
	}

	rc = m_context.FindExistingNode(XN_NODE_TYPE_DEPTH, m_depth);
	if (rc != XN_STATUS_OK)
	{
		//printf("No depth node exists! Check your XML.");
		return;
	}

	m_depth.GetMetaData(m_depthMD);

	m_NUIAvailable = true;
}

void CPNUIPlugin::shutdown()
{
    // This will be called when it is time for the plugin to shut down;
    // any threads or anything else that may hold a shared_ptr to this
    // object should be released here so that this object can be safely
    // destroyed. This is the last point that shared_from_this and weak_ptr
    // references to this object will be valid
}

///////////////////////////////////////////////////////////////////////////////
/// @brief  Creates an instance of the JSAPI object that provides your main
///         Javascript interface.
///
/// Note that m_host is your BrowserHost and shared_ptr returns a
/// FB::PluginCorePtr, which can be used to provide a
/// boost::weak_ptr<CPNUIPlugin> for your JSAPI class.
///
/// Be very careful where you hold a shared_ptr to your plugin class from,
/// as it could prevent your plugin class from getting destroyed properly.
///////////////////////////////////////////////////////////////////////////////
FB::JSAPIPtr CPNUIPlugin::createJSAPI()
{
    // m_host is the BrowserHost
    boost::shared_ptr<CPNUIPluginAPI> SharedPtr =
		boost::make_shared<CPNUIPluginAPI>(
			FB::ptr_cast<CPNUIPlugin>(shared_from_this()), m_host);
    m_JSAPI = boost::weak_ptr<CPNUIPluginAPI>(SharedPtr);

    return SharedPtr;
}

bool CPNUIPlugin::onMouseDown(FB::MouseDownEvent *evt, FB::PluginWindow *)
{
    //printf("Mouse down at: %d, %d\n", evt->m_x, evt->m_y);
    return false;
}

bool CPNUIPlugin::onMouseUp(FB::MouseUpEvent *evt, FB::PluginWindow *)
{
    //printf("Mouse up at: %d, %d\n", evt->m_x, evt->m_y);
    return false;
}

bool CPNUIPlugin::onMouseMove(FB::MouseMoveEvent *evt, FB::PluginWindow *)
{
    //printf("Mouse move at: %d, %d\n", evt->m_x, evt->m_y);
    return false;
}
bool CPNUIPlugin::onWindowAttached(FB::AttachedEvent *evt, FB::PluginWindow *)
{
    // The window is attached; act appropriately
    return false;
}

bool CPNUIPlugin::onWindowDetached(FB::DetachedEvent *evt, FB::PluginWindow *)
{
    // The window is about to be detached; act appropriately
    return false;
}

