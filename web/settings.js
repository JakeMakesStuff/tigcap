var { ipcRenderer, remote } = require("electron");

var config;

try {
  config = require(getAppDir() + "/config.json");
} catch (e) {
  config = {
    img_host: "elixire",
    srht_url: "https://srht.example.org",
    srht_key: "Example",
    pomf_host: [
      "https://pomf.example.org/",
      "https://pomf-vanity.example.org/"
    ],
    owoToken: "",
    owoUrl: "https://owo.whats-th.is/",
    shortcut: "CommandOrControl+Shift+C",
    kuvien_key: ""
  };
}

var fs = require("fs");
window.addEventListener("load", function() {
  var imgHostSelector = document.getElementById("img-host");
  imgHostSelector.addEventListener("change", function() {
    config.img_host = this.value;
    reloadValues();
  });
  var body = document.getElementById("body");
  var srht_url = document.getElementById("srht_url");
  var srht_key = document.getElementById("srht_key");
  var pomf_host_server = document.getElementById("pomf_host_server");
  var pomf_host_vanity = document.getElementById("pomf_host_vanity");
  var owo_token = document.getElementById("owo_token");
  var owo_url = document.getElementById("owo_url");
  var shortcut_text = document.getElementById("shortcut_text");
  var nothingdomains_vanity = document.getElementById("nothingdomains_vanity");
  var nothingdomains_key = document.getElementById("nothingdomains_key");
  var elixire_key = document.getElementById("elixire_key");
  var kuvien_key = document.getElementById("kuvien_key");

  nothingdomains_key.addEventListener("change", function() {
    config.nothingdomains_key = this.value;
    save();
  });
  nothingdomains_vanity.addEventListener("change", function() {
    config.nothingdomains_vanity = this.value;
    save();
  });
  srht_url.addEventListener("change", function() {
    config.srht_url = this.value;
    save();
  });
  srht_key.addEventListener("change", function() {
    config.srht_key = this.value;
    save();
  });
  pomf_host_server.addEventListener("change", function() {
    config.pomf_host[0] = this.value;
    save();
  });
  pomf_host_vanity.addEventListener("change", function() {
    config.pomf_host[1] = this.value;
    save();
  });
  owo_token.addEventListener("change", function() {
    config.owoToken = this.value;
    save();
  });
  owo_url.addEventListener("change", function() {
    config.owoUrl = this.value;
    save();
  });
  kuvien_key.addEventListener("change", function() {
    config.kuvien_key = this.value;
    save();
  });
  elixire_key.addEventListener("change", function() {
    config.elixire_key = this.value;
    save();
  });
  shortcut_text.addEventListener("change", function() {
    config.shortcut = this.value;
    save();
  });

  function reloadValues() {
    srht_url.value = config.srht_url;
    srht_key.value = config.srht_key;
    pomf_host_server.value = config.pomf_host[0];
    pomf_host_vanity.value = config.pomf_host[1];
    owo_token.value = config.owoToken;
    owo_url.value = config.owoUrl;
    body.classList = config.img_host;
    imgHostSelector.value = config.img_host;
    shortcut_text.value = config.shortcut || "CommandOrControl+Shift+C";
    nothingdomains_key.value = config.nothingdomains_key;
    nothingdomains_vanity.value = config.nothingdomains_vanity;
    elixire_key.value = config.elixire_key;
    kuvien_key.value = config.kuvien_key;
    save();
  }
  window.reloadValues = reloadValues;
  reloadValues();
});
function save() {
  fs.writeFile(
    getAppDir() + "/config.json",
    JSON.stringify(config),
    { flag: "w" },
    function(err, oof) {
      console.log(err, oof);
      if (err) throw err;
      console.log("Saved!");
      ipcRenderer.send("reload", JSON.stringify(config));
    }
  );
}

function getAppDir() {
  return remote.app.getPath("userData");
}
