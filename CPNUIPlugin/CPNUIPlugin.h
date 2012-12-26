/**********************************************************\

  Auto-generated CPNUIPlugin.h

  This file contains the auto-generated main plugin object
  implementation for the ChromePadder NUI Plugin project

\**********************************************************/
#ifndef H_CPNUIPluginPLUGIN
#define H_CPNUIPluginPLUGIN

#include "PluginWindow.h"
#include "PluginEvents/MouseEvents.h"
#include "PluginEvents/AttachedEvent.h"

#include "PluginCore.h"

// OpenNI includes
#include <XnOS.h>

#include "NiHandTracker.h"

FB_FORWARD_PTR(CPNUIPlugin)
class CPNUIPlugin : public FB::PluginCore
{
public:
    static void StaticInitialize();
    static void StaticDeinitialize();

public:
    CPNUIPlugin();
    virtual ~CPNUIPlugin();

public:
    void onPluginReady();
    void shutdown();
    virtual FB::JSAPIPtr createJSAPI();
    // If you want your plugin to always be windowless, set this to true
    // If you want your plugin to be optionally windowless based on the
    // value of the "windowless" param tag, remove this method or return
    // FB::PluginCore::isWindowless()
    virtual bool isWindowless() { return true; }

    inline class CPNUIPluginAPI *getJSAPI()
    {
		if (!m_pluginReady)
			return NULL;
		boost::shared_ptr<CPNUIPluginAPI> SharedPtr = m_JSAPI.lock();
		return m_pluginReady ? SharedPtr.get() : NULL;
	}
	bool isNUIAvailable()
	{
		return m_NUIAvailable;
	}

    BEGIN_PLUGIN_EVENT_MAP()
        EVENTTYPE_CASE(FB::MouseDownEvent, onMouseDown, FB::PluginWindow)
        EVENTTYPE_CASE(FB::MouseUpEvent, onMouseUp, FB::PluginWindow)
        EVENTTYPE_CASE(FB::MouseMoveEvent, onMouseMove, FB::PluginWindow)
        EVENTTYPE_CASE(FB::MouseMoveEvent, onMouseMove, FB::PluginWindow)
        EVENTTYPE_CASE(FB::AttachedEvent, onWindowAttached, FB::PluginWindow)
        EVENTTYPE_CASE(FB::DetachedEvent, onWindowDetached, FB::PluginWindow)
    END_PLUGIN_EVENT_MAP()

    /** BEGIN EVENTDEF -- DON'T CHANGE THIS LINE **/
    virtual bool onMouseDown(FB::MouseDownEvent *evt, FB::PluginWindow *);
    virtual bool onMouseUp(FB::MouseUpEvent *evt, FB::PluginWindow *);
    virtual bool onMouseMove(FB::MouseMoveEvent *evt, FB::PluginWindow *);
    virtual bool onWindowAttached(FB::AttachedEvent *evt, FB::PluginWindow *);
    virtual bool onWindowDetached(FB::DetachedEvent *evt, FB::PluginWindow *);
    /** END EVENTDEF -- DON'T CHANGE THIS LINE **/

private:
	boost::weak_ptr<class CPNUIPluginAPI>	m_JSAPI;
	bool					m_pluginReady;
	bool					m_NUIAvailable;

	xn::Context				m_context;
	xn::ScriptNode			m_scriptNode;

	HandTracker				*m_handTracker;
	xn::DepthGenerator		m_depth;
	xn::DepthMetaData		m_depthMD;

	static void OpenNIThread(boost::weak_ptr<class CPNUIPluginAPI> JSAPI,
		xn::Context& Context);
};


#endif

