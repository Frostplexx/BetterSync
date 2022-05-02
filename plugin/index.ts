module.exports = (Plugin, Library) => {
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
