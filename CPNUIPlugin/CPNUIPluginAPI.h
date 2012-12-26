/**********************************************************\

  Auto-generated CPNUIPluginAPI.h

\**********************************************************/

#include <string>
#include <sstream>
#include <boost/weak_ptr.hpp>
#include "JSAPIAuto.h"
#include "BrowserHost.h"
#include "CPNUIPlugin.h"

#ifndef H_CPNUIPluginAPI
#define H_CPNUIPluginAPI

class CPNUIPluginAPI : public FB::JSAPIAuto
{
public:
    ////////////////////////////////////////////////////////////////////////////
    /// @fn CPNUIPluginAPI::CPNUIPluginAPI(const CPNUIPluginPtr& plugin, const FB::BrowserHostPtr host)
    ///
    /// @brief  Constructor for your JSAPI object.
    ///         You should register your methods, properties, and events
    ///         that should be accessible to Javascript from here.
    ///
    /// @see FB::JSAPIAuto::registerMethod
    /// @see FB::JSAPIAuto::registerProperty
    /// @see FB::JSAPIAuto::registerEvent
    ////////////////////////////////////////////////////////////////////////////
    CPNUIPluginAPI(const CPNUIPluginPtr& plugin, const FB::BrowserHostPtr& host) :
        m_plugin(plugin), m_host(host)
    {
        registerMethod("isNUIAvailable", make_method(this, &CPNUIPluginAPI::isNUIAvailable));
    }

    ///////////////////////////////////////////////////////////////////////////////
    /// @fn CPNUIPluginAPI::~CPNUIPluginAPI()
    ///
    /// @brief  Destructor.  Remember that this object will not be released until
    ///         the browser is done with it; this will almost definitely be after
    ///         the plugin is released.
    ///////////////////////////////////////////////////////////////////////////////
    virtual ~CPNUIPluginAPI() {};

    CPNUIPluginPtr getPlugin();

    bool isNUIAvailable();

    // Event helpers
    FB_JSAPI_EVENT(gestureRecognized, 0, (const unsigned int hand, const std::string gesture));

private:
    CPNUIPluginWeakPtr m_plugin;
    FB::BrowserHostPtr m_host;

    std::string m_testString;
};

#endif // H_CPNUIPluginAPI

