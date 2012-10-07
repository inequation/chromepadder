#include <npapi.h>

extern "C" {
  const char *NP_GetMIMEDescription(void) {
    return "application/x-chromepadder-kinect::ChromePadder Kinect";
  }

  NPError NP_GetValue(NPP instance, NPPVariable variable, void *value) {
    switch (variable) {
      case NPPVpluginNameString:
        *static_cast<const char **>(value) = "ChromePadder Kinect";
        break;
      case NPPVpluginDescriptionString:
        *static_cast<const char **>(value) = "Plugin to provide Kinect input to the ChromePadder extension";
        break;
      default:
        return NPERR_INVALID_PARAM;
        break;
    }
    return NPERR_NO_ERROR;
  }
}
