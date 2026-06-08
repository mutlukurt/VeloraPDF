const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "expo-constants", "scripts", "get-app-config-android.gradle");

if (!fs.existsSync(target)) {
  process.exit(0);
}

const before = `  def expoGradleExtension = gradle.extensions.findByName("expoGradle")
  def customProjectRoot = expoGradleExtension?.projectRoot
  def projectRoot = file("\${customProjectRoot ?: rootProject.projectDir}")`;

const after = `  def expoGradleExtension = gradle.extensions.findByName("expoGradle")
  def customProjectRoot = null
  try {
    customProjectRoot = expoGradleExtension?.projectRoot
  } catch (Throwable ignored) {
    customProjectRoot = null
  }
  def projectRoot = file("\${customProjectRoot ?: rootProject.projectDir}")`;

const source = fs.readFileSync(target, "utf8");
if (source.includes(after)) {
  process.exit(0);
}

if (source.includes(before)) {
  fs.writeFileSync(target, source.replace(before, after));
}
