{
  "targets": [
    {
      "target_name": "wasapi_capture",
      "sources": [ "wasapi_capture.cpp" ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "libraries": [
        "-lole32.lib",
        "-luuid.lib",
        "-lmmdevapi.lib",
        "-lavrt.lib"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/EHsc" ]
        }
      }
    }
  ]
}
