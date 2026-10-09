// QA's own checks on the capture core (qa-reviewer phase 4), run against the jar the shell ships.
// gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test
pluginManagement { repositories { gradlePluginPortal(); mavenCentral() } }
dependencyResolutionManagement { repositories { mavenCentral() } }
rootProject.name = "b02-core-probe"
