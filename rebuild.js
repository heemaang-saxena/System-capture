const { execSync } = require("child_process");

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// Node.js version (v20.x ABI)
run("node-gyp rebuild --target=20.10.0 --dist-url=https://nodejs.org/download/release/v20.10.0/");

// Electron version (v30.5.1 ABI)
run("node-gyp rebuild --runtime=electron --target=30.5.1 --disturl=https://electronjs.org/headers");
