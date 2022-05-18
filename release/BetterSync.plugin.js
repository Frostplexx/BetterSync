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
	//import fs
	const fs = require("fs");
	let localConnection;
	let remoteConnection;
	let sendChannel;
	let receiveChannel;
	let fileReader;

	let receivedSize = 0;

	let bitrateMax = 0;

	return class BetterSync extends Plugin {
		constructor() {
			super();
			this.defaultSettings = {};
			this.defaultSettings.color = "#ff0000";
			this.defaultSettings.option = 50;
			this.defaultSettings.textbox = "";
			this.defaultSettings.switch1 = false;
		}

		getSettingsPanel() {
			return Settings.SettingPanel.build(
				this.saveSettings.bind(this),
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

		async onStart() {
			Logger.log("Started");
			Patcher.before(Logger, "log", (t, a) => {
				a[0] = "Patched Message: " + a[0];
			});

			await this.createConnection();
		}

		onStop() {
			Logger.log("Stopped");
			Patcher.unpatchAll();
		}

		async createConnection() {
			localConnection = new RTCPeerConnection();
			console.log("Created local peer connection object localConnection");

			sendChannel = localConnection.createDataChannel("sendDataChannel");
			sendChannel.binaryType = "arraybuffer";
			console.log("Created send data channel");

			sendChannel.addEventListener("open", this.onSendChannelStateChange);
			sendChannel.addEventListener("close", this.onSendChannelStateChange);
			sendChannel.addEventListener("error", this.onError);

			localConnection.addEventListener("icecandidate", async (event) => {
				console.log("Local ICE candidate: ", event.candidate);
				await remoteConnection.addIceCandidate(event.candidate);
			});

			remoteConnection = new RTCPeerConnection();
			console.log("Created remote peer connection object remoteConnection");

			remoteConnection.addEventListener("icecandidate", async (event) => {
				console.log("Remote ICE candidate: ", event.candidate);
				await localConnection.addIceCandidate(event.candidate);
			});
			remoteConnection.addEventListener("datachannel", this.receiveChannelCallback);

			try {
				const offer = await localConnection.createOffer();
				await this.gotLocalDescription(offer);
			} catch (e) {
				console.log("Failed to create session description: ", e);
			}
		}

		onSendChannelStateChange() {
			if (sendChannel) {
				const { readyState } = sendChannel;
				console.log(`Send channel state is: ${readyState}`);
				if (readyState === "open") {


					const file = fs.readFileSync(__dirname + "/test.txt");

					console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(" ")}`);

					// Handle 0 size files.
					if (file.size === 0) {
						this.closeDataChannels();
						return;
					}
					const chunkSize = 16384;
					fileReader = new FileReader();
					let offset = 0;
					fileReader.addEventListener("error", (error) => console.error("Error reading file:", error));
					fileReader.addEventListener("abort", (event) => console.log("File reading aborted:", event));
					fileReader.addEventListener("load", (e) => {
						console.log("FileRead.onload ", e);
						sendChannel.send(e.target.result);
						offset += e.target.result.byteLength;
						if (offset < file.size) {
							readSlice(offset);
						}
					});
					const readSlice = (o) => {
						console.log("readSlice ", o);
						const slice = file.slice(offset, o + chunkSize);
						fileReader.readAsArrayBuffer(slice);
					};
					readSlice(0);


				}
			}
		}

		onError(error) {
			if (sendChannel) {
				console.error("Error in sendChannel:", error);
				return;
			}
			console.log("Error in sendChannel which is already closed:", error);
		}

		receiveChannelCallback(event) {
			console.log("Receive Channel Callback");
			receiveChannel = event.channel;
			receiveChannel.binaryType = "arraybuffer";
			receiveChannel.onmessage = this.onReceiveMessageCallback;
			receiveChannel.onopen = this.onReceiveChannelStateChange;
			receiveChannel.onclose = this.onReceiveChannelStateChange;

			receivedSize = 0;
			bitrateMax = 0;
		}

		async gotLocalDescription(desc) {
			await localConnection.setLocalDescription(desc);
			console.log(`Offer from localConnection\n ${desc.sdp}`);
			await remoteConnection.setRemoteDescription(desc);
			try {
				const answer = await remoteConnection.createAnswer();
				await this.gotRemoteDescription(answer);
			} catch (e) {
				console.log("Failed to create session description: ", e);
			}
		}

		async gotRemoteDescription(desc) {
			await remoteConnection.setLocalDescription(desc);
			console.log(`Answer from remoteConnection\n ${desc.sdp}`);
			await localConnection.setRemoteDescription(desc);
		}

		async sendData() {
			const file = fs.readFileSync(__dirname + "/test.txt");

			console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(" ")}`);

			// Handle 0 size files.
			if (file.size === 0) {
				this.closeDataChannels();
				return;
			}
			const chunkSize = 16384;
			fileReader = new FileReader();
			let offset = 0;
			fileReader.addEventListener("error", (error) => console.error("Error reading file:", error));
			fileReader.addEventListener("abort", (event) => console.log("File reading aborted:", event));
			fileReader.addEventListener("load", (e) => {
				console.log("FileRead.onload ", e);
				sendChannel.send(e.target.result);
				offset += e.target.result.byteLength;
				if (offset < file.size) {
					readSlice(offset);
				}
			});
			const readSlice = (o) => {
				console.log("readSlice ", o);
				const slice = file.slice(offset, o + chunkSize);
				fileReader.readAsArrayBuffer(slice);
			};
			readSlice(0);
		}
	};
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/