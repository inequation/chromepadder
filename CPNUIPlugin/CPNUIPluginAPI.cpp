/**********************************************************\

  Auto-generated CPNUIPluginAPI.cpp

\**********************************************************/

#include "JSObject.h"
#include "variant_list.h"
#include "DOM/Document.h"
#include "global/config.h"

#include "CPNUIPluginAPI.h"

bool CPNUIPluginAPI::isNUIAvailable()
{
	try
	{
		return getPlugin()->isNUIAvailable();
	}
	catch (FB::script_error ex)
	{
		return false;
	}
	return true;
}

unsigned int CPNUIPluginAPI::getNumHands()
{
	try
	{
		return getPlugin()->getNumHands();
	}
	catch (FB::script_error ex) {}
	return 0;
}

///////////////////////////////////////////////////////////////////////////////
/// @fn CPNUIPluginPtr CPNUIPluginAPI::getPlugin()
///
/// @brief  Gets a reference to the plugin that was passed in when the object
///         was created.  If the plugin has already been released then this
///         will throw a FB::script_error that will be translated into a
///         javascript exception in the page.
///////////////////////////////////////////////////////////////////////////////
CPNUIPluginPtr CPNUIPluginAPI::getPlugin()
{
    CPNUIPluginPtr plugin(m_plugin.lock());
    if (!plugin) {
        throw FB::script_error("The plugin is invalid");
    }
    return plugin;
}
