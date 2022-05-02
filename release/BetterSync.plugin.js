/**
 * @name BetterSync
 * @version 0.0.1
 * @description Sync Plugins across your devices with GitHub
 * @github https://github.com/Frostplexx/BetterSync.git
 * @github_raw https://raw.githubusercontent.com/Frostplexx/BetterSync/master/release/BetterSync.plugin.js
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/

module.exports = (() => {
    const config = {"info":{"name":"BetterSync","authors":[{"name":"Frostplexx","discord_id":"336806197158215682","github_username":"frostplexx","twitter_username":"Frostplexx"}],"version":"0.0.1","description":"Sync Plugins across your devices with GitHub","github":"https://github.com/Frostplexx/BetterSync.git","github_raw":"https://raw.githubusercontent.com/Frostplexx/BetterSync/master/release/BetterSync.plugin.js"},"changelog":[{"title":"Inital Beta","items":["Everything is new!"]}],"main":"index.ts"};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Library) => {
	const { Logger, Patcher, Settings, Toasts } = Library;

	return class BetterSync extends Plugin {
		constructor() {
			super();
			this.defaultSettings = {};
			this.defaultSettings.color = "#ff0000";
			this.defaultSettings.option = 50;
			this.defaultSettings.textbox = "";
			this.defaultSettings.switch1 = false;
			this.loggedIn = false;
		}

		async onStart() {
			Logger.log("Started");
			Patcher.before(Logger, "log", (t, a) => {
				a[0] = "Patched Message: " + a[0];
			});
			//check login credentials
			var username = this.settings.username;
			var password = this.settings.password;
			if (password == "" || username == "") {
				setTimeout(function () {
					Toasts.error("Please enter your Github credentials");
				}, 1000);
			} else {
				//if success, set loggedIn to true
				const xhr = await this.authenticate(username, password);
				const status = xhr.status;
				const message = xhr.responseText;
				if (status === 200) {
					this.loggedIn = true;
				} else {
					// else show error
					Logger.log(message);
					setTimeout(function () {
						Toasts.error("GitHub authentication failed. Please check your credentials");
					}, 1000);
					this.loggedIn = false;
				}
			}
			//if loggedIn is true, sync settings
			console.log("Logged in: " + this.loggedIn);
			if (this.loggedIn) {
				setTimeout(function () {
					Toasts.success("Successfully logged in");
				}, 1000);
				//check if github repo exists
				this.checkRepo(username, password);
			}
		}

		onStop() {
			Logger.log("Stopped");
			Patcher.unpatchAll();
		}

		getSettingsPanel() {
			return Settings.SettingPanel.build(
				this.saveSettings.bind(this),
				new Settings.SettingGroup("Authentication", { shown: true }).append(
					new Settings.Textbox(
						"Github Username",
						"Enter your Github Username",
						this.settings.username,
						(e) => {
							this.settings.username = e;
						}
					),
					new Settings.Textbox(
						"Github Token",
						"Enter your Github Personal Access Token",
						this.settings.password,
						(e) => {
							this.settings.password = e;
						}
					)
				),
				new Settings.SettingGroup("Sync", { shown: true }).append(
					new Settings.Switch(
						"Sync",
						"Click this button to manually sync your settings",
						this.settings.switch1,
						(e) => {
							this.settings.switch1 = e;
						}
					)
				)
			);
		}

		authenticate(username, password) {
			return new Promise((resolve, reject) => {
				Logger.log("Authenticating with Github");
				var url = "https://api.github.com/user";
				resolve(sendApiRequest(username, password, url, "GET", "basic", ""));
			});
		}

		checkRepo(username, password) {
			//if repo exists, sync settings
			//else create repo
			var url = `https://api.github.com/user/repos`;
			sendApiRequest(username, password, url, "GET", "token", "").then((response) => {
				var found = false;
				if (response.status === 200) {
					const responseText = JSON.parse(response.responseText);
					for(var i = 0; i < responseText.length; i++) {
						if(responseText[i].name === "better-sync-plugin") {
							console.log("Repo exists");
							found = true;
							break;
						}
					}
					if(!found) {
						console.log("Repo does not exist");
						setTimeout(function () {
							Toasts.warning("Repo does not exist. Creating repo...");
						}, 1000);
						this.createRepo(username, password);
					} else {
						this.syncSettings(username, password);
					}
				}
			});
		}


		createRepo(username, password) {
			//create repo
			var url = `https://api.github.com/user/repos`;
			var data = {
				name: "better-sync-plugin",
				auto_init: true,
				private: true
			};
			sendApiRequest(username, password, url, "POST", "token", data).then((response) => {
				console.log(response);
				if(response.readyState == 4){
					if (response.status === 201) {
						console.log("Repo created");
						this.syncSettings(username, password);
					} else {
						console.log("Repo creation failed");
					}
				}
			});
		}



		syncSettings(username, password) {
			//sync settings
			console.log(__dirname)
		}

	};


	function sendApiRequest(username, password, url, method, authtype, body) {
		return new Promise((resolve, reject) => {
			var xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
			if(authtype === "basic") {
				xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));	
			} else if(authtype === "token") {
				xhr.setRequestHeader("Authorization", "token " + password);
			}

			if(body !== "") {
				xhr.send(JSON.stringify(body));
			} else {
				xhr.send();
			}
			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {
					resolve(xhr);
				}
			};
		});
	}

};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/