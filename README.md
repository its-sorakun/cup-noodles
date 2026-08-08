# Cup Noodles Mobile Client

The Android client for [Cup Noodles](https://github.com/its-sorakun/cup-noodles). 

Cup Noodles is a server application, and this repository branch contains its mobile client. It acts as a lightweight wrapper that connects to your Cup Noodles server by taking an IP address.

## Building the App

To build a debug APK, run the following command from the root of this project:

```bash
# Windows
.\gradlew assembleDebug

# macOS/Linux
./gradlew assembleDebug
```

The resulting APK will be generated at `app/build/outputs/apk/debug/app-debug.apk`.
