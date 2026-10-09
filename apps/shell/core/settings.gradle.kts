// The capture core: pure Kotlin, no Android SDK, so a cloud session can test it with the preinstalled
// Gradle alone (`gradle -p apps/shell/core test`). The Android app includes it as a composite build.
// B09's template engine goes here too.
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}
rootProject.name = "capture-core"
