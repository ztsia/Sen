plugins { kotlin("jvm") version "2.2.20" }
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
sourceSets {
    main {
        kotlin.srcDir("../../../../apps/shell/core/src/main/kotlin")
        resources.srcDir("../../../../apps/shell/core/src/main/resources")
    }
}
dependencies { testImplementation(kotlin("test")) }
tasks.test {
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStandardStreams = true
    }
}
