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
        registerMethod("echo",      make_method(this, &CPNUIPluginAPI::echo));
        registerMethod("testEvent", make_method(this, &CPNUIPluginAPI::testEvent));
        
        // Read-write property
        registerProperty("testString",
                         make_property(this,
                                       &CPNUIPluginAPI::get_testString,
                                       &CPNUIPluginAPI::set_testString));
        
        // Read-only property
        registerProperty("version",
                         make_property(this,
                                       &CPNUIPluginAPI::get_version));
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

    // Read/Write property ${PROPERTY.ident}
    std::string get_testString();
    void set_testString(const std::string& val);

    // Read-only property ${PROPERTY.ident}
    std::string get_version();

    // Method echo
    FB::variant echo(const FB::variant& msg);
    
    // Event helpers
    FB_JSAPI_EVENT(test, 0, ());
    FB_JSAPI_EVENT(echo, 2, (const FB::variant&, const int));

    // Method test-event
    void testEvent();

private:
    CPNUIPluginWeakPtr m_plugin;
    FB::BrowserHostPtr m_host;

    std::string m_testString;
};

#endif // H_CPNUIPluginAPI

