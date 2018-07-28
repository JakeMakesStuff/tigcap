let capture = require("interactive-screenshot").capture;
const {
  dialog,
  autoUpdater,
  app,
  Menu,
  Tray,
  globalShortcut,
  clipboard,
  BrowserWindow,
  Notification,
  ipcMain
} = require("electron");
let os = require("os");
let snekfetch = require("snekfetch");
let PromiseFtp = require('promise-ftp');
let charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

let server = "https://hazel-fyhwhtssmo.now.sh/";
let feed = `${server}/update/${process.platform}/${app.getVersion()}`;
// autoUpdater.setFeedURL(feed)

setInterval(function() {
  autoUpdater.checkForUpdates();
}, 60000);

autoUpdater.on("error", function(message) {
  console.error("There was a problem updating the application");
  console.error(message);
});

autoUpdater.on("update-downloaded", function(event, releaseNotes, releaseName) {
  const dialogOpts = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: process.platform == "win32" ? releaseNotes : releaseName,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates."
  };

  dialog.showMessageBox(dialogOpts, function(response) {
    if (response == 0) autoUpdater.quitAndInstall();
  });
});

let defaultConfig = {
  img_host: "elixire",
  srht_url: "https://srht.example.org",
  pomf_host: ["https://pomf.example.org/", "https://pomf-vanity.example.org/"],
  owoToken: "",
  owoUrl: "https://owo.whats-th.is/",
  shortcut: "CommandOrControl+Shift+C",
  nothingdomains_key: "",
  nothingdomains_vanity: "",
  kuvien_key: "",
  ftp_hostname: "ftp.example.org",
  ftp_username: "",
  ftp_password: "",
  ftp_url_path: "https://i.example.org/",
  ftp_path: "/"
};

let config;

try {
  config = require(`${app.getPath("userData")}/config.json`);
} catch (e) {
  config = defaultConfig;
}

if (app.dock) app.dock.hide();

ipcMain.on("reload", function(event, cfg) {
  console.log("Reloading...");
  config = JSON.parse(cfg);
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(config.shortcut, takeScreenshot);
  } catch (e) {
    console.log(e);
    globalShortcut.register("CommandOrControl+Shift+C", takeScreenshot);
  }
});

let win = null;
async function showSettingsWindow() {
  // if(win) win.close()
  win = new BrowserWindow({ width: 500, height: 500 });
  win.show();
  win.focus();
  win.loadURL("file://" + __dirname + "/web/settings.html");
}

async function showAccountWindow() {
  // if(win) win.close()
  win = new BrowserWindow({ width: 800, height: 600 });
  win.show();
  win.focus();
  win.loadURL("file://" + __dirname + "/web/account.html");
}

let tray = null;
app.on("ready", function() {
  tray = new Tray(__dirname + "/resources/iconTemplate.png");
  const contextMenu = Menu.buildFromTemplate([
    { label: "Take screenshot", click: takeScreenshot },
    { label: "My account", click: showAccountWindow },
    { label: "Settings", click: showSettingsWindow },
    { type: "separator" },
    { label: "Quit", role: "quit" }
  ]);
  const keyboardShortcut = os.platform === "darwin" ? "⇧⌘C" : "Ctrl-Shift-C";
  tray.setToolTip(`Press ${keyboardShortcut} to take a screenshot`);
  tray.setContextMenu(contextMenu);
  try {
    globalShortcut.register(config.shortcut, takeScreenshot);
  } catch (e) {
    console.log(e);
    globalShortcut.register("CommandOrControl+Shift+C", takeScreenshot);
  }
});

app.on("will-quit", function() {
  globalShortcut.unregisterAll();
});

const hostMap = {
  pomf: pomfUpload,
  kuvien: kuvienUpload,
  srht: srhtUpload,
  owo: owoUpload,
  nothingdomains: nothingDomainsUpload,
  elixire: elixireUpload,
  ftp: FTPUpload
};

async function takeScreenshot() {
  try {
    let buffer = await capture();
    console.log("Captured!");
    if (!buffer) return false; // The user canceled the screenshot
    let url = null;
    url = await hostMap[config.img_host](buffer);
    clipboard.writeText(url);
    console.log(`Uploaded as ${url}`);
    new Notification({
      title: "TIGCap",
      body: "Link to screenshot copied to clipboard!",
      silent: true
    }).show();
  } catch (e) {
    // Ignore errors about not running two at once
    if (
      e.includes &&
      e.includes(
        "screencapture: cannot run two interactive screen captures at a time"
      )
    )
      return;
    throw e;
  }
}

async function srhtUpload(buffer) {
  let res = await snekfetch
    .get(`${config.srht_url}/api/upload`)
    .attach("file", buffer, "oof.png")
    .send({ key: config.srht_key });
  return res.body.url;
}

async function nothingDomainsUpload(buffer) {
  let vanity = config.nothingdomains_vanity;
  let res;
  try {
    res = await snekfetch
      .post("https://nothing.domains/api/upload/pomf")
      .attach("files[]", buffer, "oof.png")
      .set({
        Authorization: config.nothingdomains_key
      });
  } catch (e) {
    console.log(e);
  }
  let body = res.body;
  if (res.body instanceof Buffer) {
    body = JSON.parse(res.body.toString("utf8"));
  }
  if (!body.success) throw "Unknown error";
  return `${vanity}${body.files[0].url}`;
}

async function elixireUpload(buffer) {
  let res;
  try {
    res = await snekfetch
      .post("https://elixi.re/api/upload")
      .attach("f[]", buffer, "oof.png")
      .set({
        Authorization: config.elixire_key
      });
  } catch (e) {
    console.log(e);
  }
  let body = res.body;
  if (res.body instanceof Buffer) {
    body = JSON.parse(res.body.toString("utf8"));
  }
  return `${body.url}`;
}

async function pomfUpload(buffer) {
  let picked = config.pomf_host;
  // let picked
  if (!picked) {
    let res1 = await snekfetch.get(
      "https://rawgit.com/lc-guy/limf/master/host_list.json"
    );
    let list = res1.body;
    picked = list[Math.floor(Math.random() * list.length)];
  }
  let res;
  try {
    res = await snekfetch
      .post(`${picked[0]}upload.php`)
      .attach("files[]", buffer, "oof.png");
  } catch (e) {
    console.log(e);
  }
  let body = res.body;
  if (res.body instanceof Buffer) {
    body = JSON.parse(res.body.toString("utf8"));
  }
  if (!body.success) throw "Unknown error";
  if (!body.files[0].url.match(new RegExp(picked[1], "gi")))
    return picked[1] + body.files[0].url;
  else return body.files[0].url;
}

async function owoUpload(buffer) {
  let res = await snekfetch
    .post("https://api.awau.moe/upload/pomf")
    .attach("files[]", buffer, "oof.png")
    .set({ authorization: config.owoToken });
  let url = `${config.owoUrl || "https://owo.whats-th.is/"}${
    res.body.files[0].url
  }`;
  return url;
}

async function kuvienUpload(buffer) {
  let res = await snekfetch
    .post("https://api.kuvien.io/image/upload")
    .set("X-App-Key", config.kuvien_key)
    .attach("file", buffer, "oof.png");
  return res.body.file.url;
}

async function FTPUpload(buffer) {
  var ftp = new PromiseFtp();
  ftp.connect({
    host: config.ftp_hostname,
    user: config.ftp_username,
    password: config.ftp_password
  }).then(function (_) {
    return ftp.list(config.ftp_path);
  }).then(function (list) {
    while(true) {
      var filename = "";
      for (var i = 0; i < 10; i++) {
        filename += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      if (!(filename + ".png" in list)) {
        break;
      }
    }
    return ftp.put(buffer, filename + ".png");
  }).then(function() {
    return ftp.end();
  })
  var return_addr = config.ftp_url_path;
  if (!(return_addr.startsWith("http://") || return_addr.startsWith("https://"))) {
    return_addr = "https://" + return_addr;
  }
  if (!return_addr.endsWith("/")) {
    return_addr += "/";
  }
  return return_addr + filename + ".png";
}

app.on("window-all-closed", function() {
  // Ignore it
});
