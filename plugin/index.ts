module.exports = (Plugin, Library) => {
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
