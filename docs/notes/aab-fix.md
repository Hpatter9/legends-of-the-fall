# AAB-FIX: the Play bundle's failed build on 0.625.0

`android.yml` on main 0.625.0 (run 45735754854) failed twice, in two different ways.

- **Attempt 1**: the APK built and signed; the Play bundle failed at `:app:signReleaseBundle`, "A failure occurred while executing
  FinalizeBundleTask$BundleToolRunnable", with no message.
- **Attempt 2**: failed earlier, building the APK, on Maven Central: "Received status code 429 from server: Too Many Requests" for dozens
  of the Android Gradle plugin's dependencies.

## What was found

- **Not the game's code.** No Android, signing or packaging file changed since the last good build (0.623.0). The Play web build has the same
  2,081 files at both commits (only `game.js`, its map, `index.html` and `sw.js` differ). 0.625.0 builds the APK and the bundle locally in
  `android.yml`'s exact order, debug-signed and release-signed with a throwaway key. The good build used the same JDK (Temurin 21.0.13).
- **The bundle's error** is AGP 8.7.2's `FinalizeBundleTask.kt`, which reads the signing config's store file, store password, key password
  and key alias with Kotlin's `!!`: one of them null gives a bare `NullPointerException` (line 172 is the store password). Locally it comes
  only with a signing value unset. On CI the step's log showed all three secrets set, so what was null there is not yet known: the next run's
  stack trace will name it.

## The changes

- **`--stacktrace`** on both `gradlew` lines in `android.yml`, so a failure names its cause.
- **A named check** in "Use the release key": with `ANDROID_KEYSTORE_BASE64` set, any of `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
  and `ANDROID_KEY_PASSWORD` that is empty (or only spaces) is named, by name only, and the run stops there; so does a keystore that decodes
  to nothing.
- **Maven Central's mirror**: Google's public mirror of Maven Central (`maven-central.storage-download.googleapis.com/maven2/`, the same
  artifacts) is tried before `mavenCentral()` for the build script and every module, the plugins' own included (`android/build.gradle`).
- **Retries**: Gradle tries a failed download up to six times, from a two-second wait (`android/gradle.properties`).

Checked locally, with no init script and an empty Gradle cache (so every dependency was fetched through the new repositories; without the
mirror the same machine got 429s): `assembleRelease` and, after `web:play`, `cap sync` and `pack.mjs`, `bundleRelease`, both BUILD
SUCCESSFUL. The release-key check was run on its own: all set passes, a blank alias and a missing key password are named. No workflow was
run here.
